package game

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	db "github.com/kirtansoni/words-weave/internal/database"
	l "github.com/kirtansoni/words-weave/internal/llm"
	m "github.com/kirtansoni/words-weave/internal/models"
	s "github.com/kirtansoni/words-weave/internal/sessions"
)

var (
	LLM_TIMOUT    = 3 * time.Second
	MAXCHALLENGES = 3
	MAX_ATTEMPTS  = 25
)

type Game struct {
	SessionManager s.SessionManager
	Challenges     []m.Challenge
}

func GetGame() *Game {
	game := &Game{
		SessionManager: *s.GetSessionManger(),
	}
	return game
}

func (g *Game) SetChallenges(challenges []m.Challenge){
	g.SessionManager.Lock()
	defer g.SessionManager.Unlock()
	g.Challenges = challenges	
}
func (g *Game) Init(ctx context.Context){
	challenges := APIChallenges(MAXCHALLENGES,ctx)
	g.SetChallenges(challenges)
	go g.CronJob(ctx)
}


func (g *Game) IsValidState(state *m.State) bool {
	today := time.Now().Truncate(24 * time.Hour)
	lastAccessed := state.LastAccessed.Truncate(24 * time.Hour)
	if !lastAccessed.Equal(today) {
		return false
	}
	return true
}

func (g *Game) NewState(sessionid string, challenge int) *m.State {
	return &m.State{
		ID:           sessionid,
		Challenge:    challenge,
		Progress:     make([]bool, len(g.GetChallengeWords(challenge))),
		Content:      make([]m.Entry, MAX_ATTEMPTS),
		Attempts:     0,
		LastAccessed: time.Now(),
	}
}

func (g *Game) isComplete(state *m.State) bool {
	if state.Attempts>=MAX_ATTEMPTS{
		return true
	}
	for i := range state.Progress {
		if !state.Progress[i] {
			return false
		}
	}
	return true
}

func (g *Game) setNextState(state *m.State) error {
	if state.Challenge >= MAXCHALLENGES {
		return errors.New("No more challenges allowed for the day")
	}
	state.Challenge++
	state.Attempts = 0
	state.Content = make([]m.Entry, MAX_ATTEMPTS)
	state.Progress = make([]bool, len(g.GetChallengeWords(state.Challenge)))
	return nil

}

func (g *Game) Getgamestate(w http.ResponseWriter, r *http.Request) {

	//get session id from cookie
	sessionID, err := g.SessionManager.GetSessionID(r)
	if err != nil || sessionID == "" {
		//if not present create a new session ID and set it to the cookie
		sessionID = g.SessionManager.SetSessionID(w)
		g.SessionManager.SetState(sessionID, g.NewState(sessionID, 0))
	}

	state, exists := g.SessionManager.GetState(sessionID)
	//get state for the session ID
	if !exists {
		//should not happen
		g.SessionManager.SetState(sessionID, g.NewState(sessionID, 0))
	}

	queryParams := r.URL.Query()
	next := queryParams.Get("next")
	//get next state if eligible
	if next != "" && exists && g.isComplete(state)  {

		//could be error prone
		err = g.setNextState(state)
		if err != nil {
			//fix : http code
			http.Error(w, "Next Challenge Not Available", http.StatusAccepted)
		}

	}

	if !g.IsValidState(state) || state == nil {
		//initialize state if it doesnt exist or is stale
		state = g.NewState(sessionID, 0)
		g.SessionManager.SetState(sessionID, state)
	}

	//get the payload for the session state
	res := state.GetPayload()
	res.Quote = g.Challenges[state.Challenge].Quote
	res.Author = g.Challenges[state.Challenge].Author
	if state.Attempts == 0 {
		res.Content = g.Challenges[state.Challenge].Content
	}

	payload, err := json.Marshal(res)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
	}
	w.Write(payload)
	return
}

func (g *Game) Postgamestate(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Transfer-Encoding", "chunked")

	//get session id from cookie
	sessionID, err := g.SessionManager.GetSessionID(r)
	if err != nil || sessionID == "" {
		http.Error(w, "No Session Detected", http.StatusRequestTimeout)
	}

	s, exists := g.SessionManager.GetState(sessionID)
	//get state for the session ID
	if !exists {
		//should not happen
		http.Error(w, "Session Invalid", http.StatusRequestTimeout)
	}

	if time.Since(s.LastAccessed) < LLM_TIMOUT {
		http.Error(w, "Too many Requests", http.StatusRequestTimeout)
		return
	}

	if !exists || !g.IsValidState(s) {
		http.Error(w, "Invalid Session", http.StatusUnauthorized)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var req struct {
		Input string `json:"input"`
	}

	err = json.Unmarshal(body, &req)
	if err != nil {
		http.Error(w, "Invalid JSON format", http.StatusBadRequest)
		return
	}
	if req.Input == "" {
		w.WriteHeader(http.StatusExpectationFailed)
		return
	}

	if g.isComplete(s) {
		w.WriteHeader(http.StatusExpectationFailed)
		return
	}


	chunks := make(chan string, 10)
	var content string
	go func() {
		content = l.StreamingLLM(req.Input, r.Context(), chunks)
	}()

	for {
		select {
		case chunk, ok := <-chunks:
			if !ok {
				// update session after streaming is over
				err:= s.UpdateSession(req.Input, content, g.GetChallengeWords(s.Challenge))
				if err != nil {
					http.Error(w, "Session Could not update, check microservice code", http.StatusBadRequest)
					return
				}
				if g.isComplete(s) {
					db.SaveState(s)
				}
				return
			} else {
				flusher, ok := w.(http.Flusher)
				if !ok {
					// log error

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

func (g *Game) GetChallengeWords(index int) []string {
	if index > MAXCHALLENGES {
		panic("GetChallenge > MAXCHALLENGES")
	}
	return g.Challenges[index].Words
}

func (g *Game) CronJob(ctx context.Context) {
		

		now := time.Now()
		nextMidnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
		durationUntilMidnight := time.Until(nextMidnight)
		time.Sleep(durationUntilMidnight)
		g.MidNightUpdate(ctx)
		// After running once, set up the ticker to run every 24 hours.
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()
	
		// Keep running the task every 24 hours.
		for range ticker.C {
			g.MidNightUpdate(ctx)
		}
	
}

func (g *Game) MidNightUpdate(ctx context.Context) {
	log.Println("Running scheduled task at midnight")

	// g.SessionManager.SaveAllSessionsToDB()
	// g.SessionManager.ClearAllSessions()

	newChallenges := APIChallenges(MAXCHALLENGES, ctx) // Fetch new challenges
	g.SetChallenges(newChallenges)
}

func APIChallenges(s int, ctx context.Context) []m.Challenge {
	resp, err := http.Get("https://zenquotes.io/api/quotes")
	if err != nil {
		log.Println("unable to fetch qoutes from zenquotes")
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

	var res []m.Challenge = make([]m.Challenge, s)

	summaries := l.LLMSummaries(s,ctx)

	for i := 0; i < len(res); i++ {
		content := summaries[i]
		fmt.Println(content)
		words := m.SanitizeAndSplit(rawQuotes[i].Quote)
		res[i] = m.Challenge{
			Quote:   rawQuotes[i].Quote,
			Author:  rawQuotes[i].Author,
			Content: content,
			Words:   words,
		}
	}
	return res
}