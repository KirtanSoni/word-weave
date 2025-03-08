package game

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	db "github.com/kirtansoni/words-weave/internal/database"
	l "github.com/kirtansoni/words-weave/internal/llm"
	m "github.com/kirtansoni/words-weave/internal/models"
	s "github.com/kirtansoni/words-weave/internal/sessions"
)

var (
	LLM_TIMOUT    = 3 * time.Second
	MAXCHALLENGES = 5
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

func (g *Game) Init(){
	g.SessionManager.Lock()
	defer g.SessionManager.Unlock()

	challenges, err := m.GetChallenges(MAXCHALLENGES)
	if err != nil {
		panic("Challenges not initialized")
	}
	g.Challenges = challenges
	go CronJob()
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
		panic("failed to assign a session SetSessionID not working properly")
	}

	queryParams := r.URL.Query()
	next := queryParams.Get("next")
	//get next state if eligible
	if next != "" && exists && g.isComplete(state) {

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

	if s.IsComplete() {
		w.WriteHeader(http.StatusExpectationFailed)
		return
	}

	if !s.Validate(req.Input) {
		http.Error(w, "Invalid Input", http.StatusExpectationFailed)
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
				s.UpdateSession(req.Input, content, g.GetChallengeWords(s.Challenge))
				if s.IsComplete() {
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

func CronJob() {
	panic("Unimplimented")
	// Todo : impliment, session cleanup, and save
}
