package sessions

import (
	"log"
	"net/http"
	"sync"

	"github.com/google/uuid"
	m "github.com/kirtansoni/words-weave/internal/models"
)

type SessionManager struct {
	sessions map[string]*m.State
	sync.RWMutex
}

func GetSessionManger() *SessionManager {
	return &SessionManager{
		sessions: make(map[string]*m.State),
	}
}

func (s *SessionManager) GetState(SessionID string) (*m.State, bool) {
	s.RLock()
	defer s.RUnlock()
	State, exists := s.sessions[SessionID]
	return State, exists
}

func (s *SessionManager) SetState(SessionID string, state *m.State) {
	s.Lock()
	defer s.Unlock()
	s.sessions[SessionID] = state
}

func (s *SessionManager) SetSessionID(w http.ResponseWriter) string {
	sessionID := uuid.NewString()
	if _, exists := s.sessions[sessionID]; exists {
		sessionID = uuid.NewString()
	}
	cookie := &http.Cookie{
		Name:     "session",
		Value:    sessionID,
		SameSite: http.SameSiteLaxMode,
		HttpOnly: true,
		Secure:   true,
		Path:     "/",
		MaxAge:   86400,
	}
	http.SetCookie(w, cookie)
	return sessionID
}

func (s *SessionManager) GetSessionID(r *http.Request) (string, error) {
	cookie, err := r.Cookie("session")
	sessionID := cookie.Value
	if err != nil || sessionID == "" {
		return "", err
	}
	return sessionID, nil
}

// uses other package mentods
func (s *SessionManager) getActivePlayers() int {
	s.RLock()
	defer s.RUnlock()
	counter := 0
	for _, state := range s.sessions {
		if state.IsActive() {
			counter++
		}
	}
	return counter
}

func (s *SessionManager) SaveAllSessionsToDB() {
	panic("unimplemented")
}

func (s *SessionManager) ClearAllSessions() {
	s.Lock()
	defer s.Unlock()
	s.sessions = make(map[string]*m.State)
	log.Println("Clearing Sessions...")
}
