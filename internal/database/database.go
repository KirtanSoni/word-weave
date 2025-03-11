package dataio

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	s "github.com/kirtansoni/words-weave/internal/models"
	_ "github.com/mattn/go-sqlite3"
)

// Database file path
const (
	dbFile = "./challenges.db"
)

func SaveState(state *s.State) error {
	query := `INSERT INTO sessions (id, snapshot_id, challenge, progress, content, attempts, last_accessed) 
	          VALUES (?, ?, ?, ?, ?, ?, ?)`
	_, err := db.Exec(query,
		state.ID,
		uuid.NewString(), // Unique snapshot ID
		state.Challenge,
		toJSON(state.Progress),
		toJSON(state.Content[:state.Attempts]),
		state.Attempts,
		time.Now(),
	)
	return err
}

func toJSON(v interface{}) string {
	b, _ := json.Marshal(v)
	return string(b)
}
func SaveChallenges(challenge *s.Challenge) {
	panic("unimplimented")
}

var db *sql.DB

func initDB() (*sql.DB, error) {
	// Open the database (it will be created if it doesn't exist)
	var err error
	db, err = sql.Open("sqlite3", dbFile)
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
