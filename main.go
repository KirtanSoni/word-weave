package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"
	"unicode"

	"github.com/google/uuid"

	_ "github.com/mattn/go-sqlite3"
	"github.com/openai/openai-go"
)

type SessionManager struct {
	sessions   map[string]*Session
	MaxDaily   int
	Challenges []*Challenge
	sync.RWMutex
}

var games = &SessionManager{
	sessions:   make(map[string]*Session),
	MaxDaily:   MAXDAILYGAMES,
	Challenges: make([]*Challenge, MAXDAILYGAMES),
}

func (g *SessionManager) HealthCheck() {
	if g.Challenges == nil {
		panic("Challenges not Initialized")
	}
}

func (g *SessionManager) PopulateChallenges(Challenges []*Challenge) {
	if len(Challenges) != g.MaxDaily {
		panic("PopulateChallenges: > MaxDaily ")
	}
	g.RWMutex.Lock()
	g.Challenges = Challenges
	g.RWMutex.Unlock()
	g.saveQuotes()
}

func (g *SessionManager) ManageSession(w http.ResponseWriter, r *http.Request) *Session {
	var sessionID string
	cookie, err := r.Cookie("session")

	//if no cookie, set cookie
	if err != nil || cookie == nil || cookie.Value == "" {
		sessionID = uuid.NewString()
		cookie = &http.Cookie{
			Name:     "session",
			Value:    sessionID,
			SameSite: http.SameSiteLaxMode,
			HttpOnly: true,
			Secure:   false,
			Path:     "/",
			MaxAge:   86400,
		}
		http.SetCookie(w, cookie)
	}

	sessionID = cookie.Value

	if sessionID == "" {
		panic("Assert Error: Session ID cannot be nil")
	}

	games.RLock()
	s, exists := games.sessions[sessionID]
	games.RUnlock()

	//Set Session
	if !exists || s == nil {
		// appoint challenge 1
		games.CreateSession(sessionID, 0)
	}
	games.RLock()
	s = games.sessions[sessionID]
	games.RUnlock()

	if s == nil {
		panic("Assert Error: session cannot be nil")
	}
	return s
}

func (g *SessionManager) SaveSession(SessionID string) error {
	g.RLock()
	s, exists := g.sessions[SessionID]
	g.RUnlock()

	if !exists || s == nil {
		return errors.New("session not found")
	}

	query := `INSERT INTO sessions (id, snapshot_id, challenge, progress, content, attempts, last_accessed) 
	          VALUES (?, ?, ?, ?, ?, ?, ?)`

	_, err := db.Exec(query,
		SessionID,
		uuid.NewString(), // Unique snapshot ID
		s.challenge,
		toJSON(s.Progress),
		toJSON(s.Content[:s.Attempts]),
		s.Attempts,
		time.Now(),
	)

	return err
}

func (g *SessionManager) saveQuotes() error {

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare("INSERT INTO quotes ( quote , author , content , date ) VALUES (?, ?, ?, ?)")
	if err != nil {
		return err
	}
	defer stmt.Close()

	now := time.Now()
	for _, val := range g.Challenges {
		_, err = stmt.Exec(val.Quote, val.Author, val.Content, now)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (g *SessionManager) getActiveSessions() int {
	g.RLock()
	defer g.RUnlock()
	count := 0

	now := time.Now()
	for _, s := range g.sessions {
		if now.Sub(s.LastAccessed) < INACTIVE_THRESHOLD {
			count++
		}
	}
	return count
}

// Endpoints------

func (g *SessionManager) findSession(r *http.Request) (*Session, bool) {
	cookie, err := r.Cookie("session")
	SessionID := cookie.Value
	//if no cookie, set cookie
	if err != nil || SessionID == "" {
		return nil, false
	}

	games.RLock()
	Session, exists := games.sessions[SessionID]
	games.RUnlock()

	if !Session.isValid() {
		fmt.Println("session invalid")
		return nil, exists
	}
	return Session, exists

}

func (g *SessionManager) ServeNextChallenge(SessionID string) error {
	g.RLock()
	s := g.sessions[SessionID]
	n := s.challenge
	g.RUnlock()
	if n+1 >= g.MaxDaily {
		return errors.New("reached daily limit")
	}
	g.CreateSession(SessionID, n+1)

	return nil
}

func (g *SessionManager) GetChallenge(Index int) *Challenge {
	if Index >= g.MaxDaily {
		panic("Challenge Index OutofBound")
	}
	g.RLock()
	defer g.RUnlock()
	return g.Challenges[Index]
}

func (g *SessionManager) CreateSession(SessionID string, challenge int) {
	c := g.GetChallenge(challenge)
	re := regexp.MustCompile(`^[a-zA-Z]+$`)
	result := make([]bool, len(c.Words))

	for i, word := range c.Words {
		if word == "" || !re.MatchString(word) {
			result[i] = true
		}
	}

	g.Lock()
	defer g.Unlock()
	s := &Session{
		ID:           SessionID,
		challenge:    challenge,
		Progress:     result,
		Content:      make([]string, MAXATTEMPTS+1),
		Attempts:     0,
		LastAccessed: time.Now(),
	}

	s.Content[s.Attempts] = c.Content
	g.sessions[SessionID] = s

}

type Session struct {
	ID        string
	challenge int
	Progress  []bool
	Content   []string
	Attempts  int

	// LLM limiting, wait for 5 seconds
	LastAccessed time.Time
}

func (s *Session) isValid() bool {
	c := games.GetChallenge(s.challenge)
	return c.len == len(s.Progress)
}

func (s *Session) GetPayload() ([]byte, error) {

	Challenge := games.GetChallenge(s.challenge)
	// Return Payload
	return json.Marshal(ResponseStructure{
		Challenge:     s.challenge + 1,
		Content:       s.Content[s.Attempts],
		Length:        Challenge.len,
		Quote:         Challenge.Quote,
		Author:        Challenge.Author,
		Attempts:      s.Attempts,
		Progress:      s.Progress,
		ActivePlayers: games.getActiveSessions(),
	})

}

func (s *Session) updateSession(content string) {
	s.AddContent(content)
	words := sanitizeText(content)
	s.LastAccessed = time.Now()
	Challenge := games.GetChallenge(s.challenge)
	for _, word := range words {
		for index, qouteword := range Challenge.Words {
			if !s.Progress[index] && strings.Contains(word, qouteword) {
				s.Progress[index] = true
			}
		}
	}
}

func (s *Session) AddContent(content string) {
	if s.Attempts >= MAXATTEMPTS {
		panic("MAX Attempts Reached")
	}
	s.Attempts++
	s.Content[s.Attempts] = content
}

func (s *Session) Validate(content string) bool {
	if len(s.Content) == 0 {
		return false
	}
	return strings.Contains(s.Content[len(s.Content)-1], content)
}

func (s *Session) isComplete() bool {
	for _, found := range s.Progress {
		if !found && s.Attempts < MAXATTEMPTS {
			return false
		}
	}
	return true
}

var (
	addr               = flag.String("addr", ":8080", "Port of the server")
	MAXDAILYGAMES      = 5
	MAXATTEMPTS        = 50
	MAXSESSIONS        = 100
	INACTIVE_THRESHOLD = time.Minute * 10
	LLM_TIMOUT         = time.Second * 5
)

type Challenge struct {
	Quote   string
	Author  string
	Content string
	Words   []string
	len     int
}

type ReqStructure struct {
	Input string `json:"input"`
}

type ResponseStructure struct {
	Challenge     int    `json:"challenge"`
	Quote         string `json:"quote"`
	Author        string `json:"author"`
	Length        int    `json:"length"`
	Content       string `json:"content"`
	Attempts      int    `json:"attempts"`
	Progress      []bool `json:"progress"`
	ActivePlayers int    `json:"activePlayers"`
}

//------ Handlers --------

func GenerateNewContent(w http.ResponseWriter, r *http.Request) {

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	w.Header().Set("Content-Type", "application/json")

	if r.Method == "GET" {
		// Rate-Limiting on Get is needed.
		// if games.getActiveSessions() >= MAXSESSIONS{
		// 	http.Error(w,"Too Many Players Connected, Try again in a few minutes",http.StatusGatewayTimeout)
		// }
		s := games.ManageSession(w, r)
		payload, err := s.GetPayload()
		if err != nil {
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		}
		w.Write(payload)
		return
	}

	// Post EndPoint Streaming
	if r.Method == "POST" {
		w.Header().Set("Transfer-Encoding", "chunked")

		s, exists := games.findSession(r)
		if !exists || s == nil {
			http.Error(w, "No Session Found", http.StatusUnauthorized)
			return
		}

		if time.Since(s.LastAccessed) < LLM_TIMOUT {
			http.Error(w, "Too many Requests", http.StatusRequestTimeout)
			return
		}

		if !exists || !s.isValid() {
			http.Error(w, "Invalid Session", http.StatusUnauthorized)
			return
		}

		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Failed to read request body", http.StatusBadRequest)
			return
		}
		defer r.Body.Close()

		var input ReqStructure
		err = json.Unmarshal(body, &input)
		if err != nil {
			http.Error(w, "Invalid JSON format", http.StatusBadRequest)
			return
		}
		if input.Input == "" {
			w.WriteHeader(http.StatusExpectationFailed)
			return
		}

		if s.isComplete() {
			w.WriteHeader(http.StatusExpectationFailed)
			return
		}

		if !s.Validate(input.Input){
		    http.Error(w, "Invalid Input", http.StatusExpectationFailed)
		    return
		}

		chunks := make(chan string, 10)
		var content string
		go func() {
			content = StreamingLLM(input.Input, r.Context(), chunks)
		}()

		for {
			select {
			case chunk, ok := <-chunks:
				if !ok {
					// update session after streaming is over
					s.updateSession(content)
					return
				} else {
					flusher, ok := w.(http.Flusher)
					if !ok {
						fmt.Println("Streaming ERROR TRIGGERED")
						http.Error(w, "Streaming not supported", http.StatusInternalServerError)
						return
					}
					//stream chuncks
					fmt.Fprint(w, chunk)
					flusher.Flush()
				}
			}
		}
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func StreamingLLM(input string, ctx context.Context, output chan string) string {
	client := openai.NewClient()
	stream := client.Chat.Completions.NewStreaming(ctx, openai.ChatCompletionNewParams{
		Messages: openai.F([]openai.ChatCompletionMessageParamUnion{
			openai.SystemMessage("dont ask any questions, you are a autocomplete feature that will generate sentence of 100 words from the given word/words, dont ask for context, just reply with whatever comes to your mind"),
			openai.UserMessage(input),
		}),
		Seed:      openai.Int(0),
		Model:     openai.F(openai.ChatModelGPT3_5Turbo),
		MaxTokens: openai.Int(150),
		// Temperature: param.Field[float64]{},
	})

	acc := openai.ChatCompletionAccumulator{}

	for stream.Next() {
		chunk := stream.Current()
		acc.AddChunk(chunk)

		if _, ok := acc.JustFinishedContent(); ok {
			// println("Content stream finished:", content)
		}

		if _, ok := acc.JustFinishedRefusal(); ok {
			// println("Refusal stream finished:", refusal)
		}

		if len(chunk.Choices) > 0 {
			output <- chunk.Choices[0].Delta.Content
		}
	}

	if err := stream.Err(); err != nil {
		panic(err)
	}
	close(output)
	return acc.Choices[0].Message.Content
}

func NextChallenge(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	s, exists := games.findSession(r)
	if !exists || s == nil {
		http.Error(w, "No Session Found", http.StatusUnauthorized)
		return
	}

	// if !s.isComplete(){
	// 	http.Error(w, "Complete the previous Challenge",http.StatusExpectationFailed)
	// 	return
	// }
	err := games.SaveSession(s.ID)
	if err != nil {
		fmt.Println(err)
	}
	games.SaveSession(s.ID)
	err = games.ServeNextChallenge(s.ID)
	if err != nil {
		fmt.Println(err)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func handleLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req LogRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	from, err := time.Parse("2006-01-02", req.From)
	if err != nil {
		http.Error(w, "Invalid 'from' date format", http.StatusBadRequest)
		return
	}

	to, err := time.Parse("2006-01-02", req.To)
	if err != nil {
		http.Error(w, "Invalid 'to' date format", http.StatusBadRequest)
		return
	}

	response := GetHealth(from, to)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func main() {
	flag.Parse()

	db, err := initDB()
	if err != nil {
		fmt.Println("Error initializing database:", err)
		return
	}
	defer db.Close()

	initgame()

	http.HandleFunc("/game", GenerateNewContent)
	http.HandleFunc("/game/next", NextChallenge)
	http.HandleFunc("/", GetReactSPA().ServeHTTP)
	http.HandleFunc("/logs", handleLogs)
	fmt.Println("Starting Server on port " + *addr)
	http.ListenAndServe(*addr, nil)
}

func initgame() {
	games.PopulateChallenges(APIChallenges(games.MaxDaily))
	games.HealthCheck()
	go scheduleDailyTask()
}

// Helpers -------
// Helper to convert slices to JSON
func toJSON(v interface{}) string {
	b, _ := json.Marshal(v)
	return string(b)
}

// removes punctuations and returns array of words
func sanitizeText(text string) []string {
	text = strings.ToLower(text)
	var clean strings.Builder
	for _, r := range text {
		if unicode.IsLetter(r) || unicode.IsSpace(r) {
			clean.WriteRune(r)
		}
	}
	words := strings.Fields(clean.String())
	return words
}

func placeholderChallenges() []*Challenge {
	quotes := []struct {
		quote  string
		author string
	}{
		{"The only way to do great work is to love what you do.", "Steve Jobs"},
		{"Do what you can, with what you have, where you are.", "Theodore Roosevelt"},
		{"In the middle of difficulty lies opportunity.", "Albert Einstein"},
		{"The only way to do great work is to love what you do.", "Steve Jobs"},
		{"It always seems impossible until it's done.", "Nelson Mandela"},
	}

	challenges := make([]*Challenge, len(quotes))

	for i, q := range quotes {
		content := fmt.Sprintf("This is a randomly generated paragraph for challenge %d.", i+1)
		words := sanitizeText(q.quote)
		challenges[i] = &Challenge{
			Quote:   q.quote,
			Author:  q.author,
			Content: content,
			Words:   words,
			len:     len(words),
		}
	}

	return challenges
}

func scheduleDailyTask() {

	now := time.Now()
	nextMidnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
	durationUntilMidnight := time.Until(nextMidnight)

	time.Sleep(durationUntilMidnight)
	MidNightUpdate()

	// After running once, set up the ticker to run every 24 hours.
	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()

	// Keep running the task every 24 hours.
	for range ticker.C {
		MidNightUpdate()
	}
}

func MidNightUpdate() {
	fmt.Println("Running scheduled task at midnight")

	saveAllSessions()

	clearAllSessions()

	newChallenges := APIChallenges(MAXDAILYGAMES) // Fetch new challenges
	games.PopulateChallenges(newChallenges)
}

func saveAllSessions() {
	for sessionID := range games.sessions {
		err := games.SaveSession(sessionID)
		if err != nil {
			fmt.Printf("Failed to save session %s: %v\n", sessionID, err)
		} else {
			fmt.Printf("Session %s saved successfully\n", sessionID)
		}
	}
}

func clearAllSessions() {
	games.Lock()
	defer games.Unlock()
	games.sessions = make(map[string]*Session)
	fmt.Println("Game sessions cleared")
}

func APIChallenges(s int) []*Challenge {
	resp, err := http.Get("https://zenquotes.io/api/quotes")
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil
	}
	type tempQuote struct {
		Quote  string `json:"q"`
		Author string `json:"a"`
	}
	var rawQuotes []tempQuote

	// Parse JSON
	if err := json.Unmarshal(body, &rawQuotes); err != nil {
		return nil
	}

	var res []*Challenge = make([]*Challenge, games.MaxDaily)
	summaries, err := FetchNewsSummaries(5)
	if err != nil {
		panic("no Content")
	}

	for i := 0; i < len(res); i++ {
		content := summaries[i]
		words := sanitizeText(rawQuotes[i].Quote)
		res[i] = &Challenge{
			Quote:   rawQuotes[i].Quote,
			Author:  rawQuotes[i].Author,
			Words:   words,
			len:     len(words),
			Content: content,
		}
	}
	return res
}

type LogRequest struct {
	From string `json:"from"`
	To   string `json:"to"`
}

type LogResponse struct {
	TotalGames       int `json:"total_games"`
	UniqueGames      int `json:"unique_games"`
	ContentGenerated int `json:"content_generate"`
}

func GetHealth(From time.Time, To time.Time) LogResponse {
	query := `
		SELECT COUNT(*) AS total_games, 
		       COUNT(DISTINCT id) AS unique_games, 
		       SUM(attempts) AS content_generated,
		FROM sessions
		WHERE last_accessed BETWEEN ? AND ?;`
	var response LogResponse
	row := db.QueryRow(query, From, To)
	err := row.Scan(&response.TotalGames, &response.UniqueGames, &response.ContentGenerated)
	if err != nil {
		return LogResponse{}
	}
	return response
}

//news

type NewsResponse struct {
	Status       string `json:"status"`
	TotalResults int    `json:"totalResults"`
	Articles     []struct {
		Source struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"source"`
		Title       string `json:"title"`
		Description string `json:"description"`
		URL         string `json:"url"`
		PublishedAt string `json:"publishedAt"`
		Content     string `json:"content"`
	} `json:"articles"`
}

func FetchNewsSummaries(n int) ([]string, error) {
	if n <= 0 {
		return nil, fmt.Errorf("n must be greater than 0")
	}

	// Replace with your actual API key
	apiKey := os.Getenv("NEWSAPI_KEY")
	url := fmt.Sprintf("https://newsapi.org/v2/top-headlines?country=us&pageSize=%d&category=technology&apiKey=%s", n+1, apiKey)

	// Create HTTP client with timeout
	client := &http.Client{}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %v", err)
	}

	// Send request
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making request: %v", err)
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response: %v", err)
	}

	// Parse JSON
	var newsResp NewsResponse
	if err := json.Unmarshal(body, &newsResp); err != nil {
		return nil, fmt.Errorf("error parsing JSON: %v", err)
	}

	// Check status
	if newsResp.Status != "ok" {
		fmt.Println(newsResp)
		return nil, fmt.Errorf("API returned non-OK status: %s", newsResp.Status)
	}

	// Create summaries slice
	summaries := make([]string, 0, n)

	//due to some bug, cant read the first artical. so fetching 6 and reading 2-6
	// Get min of n and available articles to avoid index out of range
	numArticles := min(n+1, len(newsResp.Articles))
	for i := 1; i < numArticles; i++ {
		article := newsResp.Articles[i]
		summary := article.Content
		summaries = append(summaries, summary)
	}

	return summaries, nil
}

// Helper function for Go versions < 1.21
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// Example usage:
// func main() {
//     summaries, err := FetchNewsSummaries(5)
//     if err != nil {
//         log.Fatal(err)
//     }
//     for _, summary := range summaries {
//         fmt.Println(summary)
//     }
// }

//DB

var db *sql.DB

func initDB() (*sql.DB, error) {
	// Open the database (it will be created if it doesn't exist)
	var err error
	db, err = sql.Open("sqlite3", "game_sessions.db")
	if err != nil {
		return nil, err
	}

	// Create the table if it doesn't exist
	query := `CREATE TABLE IF NOT EXISTS sessions (
		id TEXT NOT NULL,            -- Session ID (not unique, so multiple snapshots can exist)
		snapshot_id TEXT PRIMARY KEY, -- Unique snapshot identifier
		challenge INTEGER NOT NULL,
		progress TEXT NOT NULL,      -- Store as JSON string
		content TEXT NOT NULL,       -- Store as JSON string
		attempts INTEGER NOT NULL,
		last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	_, err = db.Exec(query)
	if err != nil {
		return nil, err
	}

	quotesQuery := `CREATE TABLE IF NOT EXISTS quotes (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		quote TEXT NOT NULL,
		author TEXT NOT NULL,
		content TEXT NOT NULL,
		date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	_, err = db.Exec(quotesQuery)
	if err != nil {
		return nil, err
	}

	return db, nil
}
