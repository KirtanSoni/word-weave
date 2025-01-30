package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
	"unicode"

	"github.com/google/uuid"
	"github.com/openai/openai-go"
)

var (
	addr      = flag.String("addr", ":8080", "Port of the server")
	Quote   = "Simplicity is the ultimate sophistication."
	Author  = "Leonardo da Vinci"
	Content = "this starting point shall lead you to W"

	Todays = &Challenge{
		Quote:   Quote,
		Author:  Author,
		Content: Content,
		len:     len(strings.Split(Quote, " ")),
		Words:   sanitizeText(Quote),
	}
)

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

type Challenge struct {
	Quote   string
	Author  string
	Content string
	Words   []string
	len     int
}

func getTodaysChallenge() Challenge {
	return *Todays
}

type ResponseStructure struct {
	Quote    string `json:"quote,omitempty"`
	Author   string `json:"author,omitempty"`
	Length   int    `json:"length,omitempty"`
	Content  string `json:"content"`
	Attempts int    `json:"attempts,omitempty"`
	Progress []bool `json:"progress,omitempty"`
	Done     bool   `json:"done"`
}

type ReqStructure struct {
	Input string `json:"input"`
}

var (
	sessions map[string]*Session = map[string]*Session{}
	s_mu     sync.RWMutex
)

type Session struct {
	Challenge    *Challenge
	Progress     map[string]*bool
	Content      []string
	LastAccessed time.Time
    isActive bool
}

func (s *Session) isValid(c *Challenge) bool {
	if s.Challenge != c {
		return false
	} else {
		return true
	}
}

func (s *Session) getProgress() ([]bool, error) {

	Words := s.Challenge.Words
	n := s.Challenge.len
	if n != len(s.Progress) {
		return nil, errors.New("Qoute is not Valid for the Session")
	}

	res := make([]bool, n)
	for i := 0; i < n; i++ {
		res[i] = *s.Progress[Words[i]]
	}

	return res, nil
}

func GetSetSession(w http.ResponseWriter, r *http.Request) *Session {

	var sessionID string

	cookie, err := r.Cookie("session")

	//if no cookie, set cookie
	if err != nil || cookie.Value == "" {
		sessionID = uuid.NewString()
		cookie := &http.Cookie{
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

	// Get Session
	s_mu.RLock()
	s, exists := sessions[sessionID]
	s_mu.RUnlock()

	//Set Session
	if !exists || !s.isValid(Todays) {

		history := make([]string, 1)
		history[0] = Todays.Content
		s = &Session{
            isActive: false,
			Content:      history,
			LastAccessed: time.Now(),
			Challenge:    Todays,
		}
		progress := make(map[string]*bool)

		for _, val := range s.Challenge.Words {
			progress[val] = new(bool)
		}
		s.Progress = progress

		s_mu.Lock()
		sessions[sessionID] = s
		s_mu.Unlock()
	}

	if s == nil {
		panic("Assert Error: session cannot be nil")
	}
	return s
}

func (s *Session) GetPayload() ([]byte, error) {
	progress, err := s.getProgress()
	if err != nil {
		panic("Session is not for Todays Qoute.")
	}

	// Return Payload
	return json.Marshal(ResponseStructure{
		Content:  s.Content[len(s.Content)-1],
		Length:   s.Challenge.len,
		Quote:    s.Challenge.Quote,
		Author:   s.Challenge.Author,
		Attempts: len(s.Content) - 1,
		Progress: progress,
		Done:     true,
	})

}

func (s *Session) updateSession(content string) {
	s.Content = append(s.Content, content)
	content_words := sanitizeText(content)
	for _, ContentWord := range content_words {
        for quoteWord, completed := range s.Progress {
            if completed != nil && *completed == false {
                if strings.Contains(ContentWord, quoteWord) {
                    True := true
                    s.Progress[quoteWord] = &True
                }
            }
        }
    }
}

func GenerateNewContent(w http.ResponseWriter, r *http.Request) {
	
    if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	
    if r.Method == "GET" {
		// Should always return a valid Session
		s := GetSetSession(w, r)

		// Returns All Information About The GameState
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
		cookie, err := r.Cookie("session")
		if err != nil {
			http.Error(w, "No Session Found", http.StatusUnauthorized)
			return
		}

		s_mu.RLock()
		s, exists := sessions[cookie.Value]
		s_mu.RUnlock()

        if s.isActive{
            http.Error(w, "Too many Requests", http.StatusRequestTimeout)
            return
        }
        s.isActive = true
        defer func(){ s.isActive = false }()

		if !exists || !s.isValid(Todays) {
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
        
		chunks := make(chan string, 10)
		var content string
        if !s.Validate(content){
            http.Error(w, "Invalid Input", http.StatusExpectationFailed)
            return 
        }

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
				}else{
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

func (s *Session)Validate(content string) bool{
    return strings.Contains(s.Content[len(s.Content)-1],content)
}

func StreamingLLM(input string, ctx context.Context, output chan string) string {
	client := openai.NewClient()
	stream := client.Chat.Completions.NewStreaming(ctx, openai.ChatCompletionNewParams{
		Messages: openai.F([]openai.ChatCompletionMessageParamUnion{
			openai.SystemMessage("dont ask any questions, you are a autocomplete feature that will complete/ predict the sentence of 100 words from the given word/words, dont ask for context, just reply with whatever comes to your mind"),
			openai.UserMessage(input),
		}),
		Seed:  openai.Int(0),
		Model: openai.F(openai.ChatModelGPT4o),
	})

	acc := openai.ChatCompletionAccumulator{}

	for stream.Next() {
		chunk := stream.Current()
		acc.AddChunk(chunk)

		if content, ok := acc.JustFinishedContent(); ok {
			println("Content stream finished:", content)
		}

		if refusal, ok := acc.JustFinishedRefusal(); ok {
			println("Refusal stream finished:", refusal)
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

func main() {
	flag.Parse()
	http.HandleFunc("/game", GenerateNewContent)
	http.HandleFunc("/", GetReactSPA().ServeHTTP)
	fmt.Println("Starting Server on port " + *addr)
	http.ListenAndServe(*addr, nil)
}


