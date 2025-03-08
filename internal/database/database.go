package dataio

import (
	s "github.com/kirtansoni/words-weave/internal/models"
	_ "github.com/mattn/go-sqlite3" 
)

// Database file path
const (
	dbFile = "./challenges.db"
)

func SaveState(state *s.State) {
	panic("unimplimented")
}

func SaveChallenges(challenge *s.Challenge){
	panic("unimplimented")
}
