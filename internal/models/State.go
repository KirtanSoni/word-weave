package models

import (
	"bytes"
	"encoding/json"
	"net/http"
	"time"
)

var (
	INACTIVE_THRESHOLD = time.Minute * 10
)

type Entry struct {
	Input   string `json:"input"`
	Content string `json:"content"`
}

type State struct {
	ID           string    `json:"id"`
	Challenge    int       `json:"challenge"`
	Progress     []bool    `json:"progress"`
	Content      []Entry   `json:"content"`
	Attempts     int       `json:"attempts"`
	LastAccessed time.Time `json:"lastaccessed"`
}

func (s *State) addContent(content Entry) {
	if s.Attempts >= len(s.Content) {
		panic("Max Attempts reached. Should Not be able to call AddContent")
	}
	s.Content = append(s.Content, content)
	s.Attempts++
	return
}

func (s *State) IsActive() bool {
	return time.Since(s.LastAccessed) < INACTIVE_THRESHOLD
}

// Not Used Yet
func (s *State) Validate(Input string) bool {
	freq := make(map[string]int)
	content := SanitizeAndSplit(s.Content[len(s.Content)-1].Content)
	for i := range content {
		freq[content[i]]++
	}
	for _, word := range SanitizeAndSplit(Input) {
		freq[word]--
		if freq[word] < 0 {
			return false
		}
	}
	return true
}

func (s *State) UpdateSession(input string, content string, challengewords []string) error {
	entry := Entry{Input: input, Content: content}
	s.addContent(entry)
	err := s.findCommonWords(entry.Content, challengewords)
	if err != nil {
		return err
	}
	return nil
}

func (s *State) findCommonWords(content string, challengewords []string) error {
	words := SanitizeAndSplit(content)
	reqBody := struct {
		Content        []string `json:"content"`
		ChallengeWords []string `json:"challenge_words"`
	}{words, challengewords}
	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return err
	}
	resp, err := http.Post(
		"http://localhost:8000/find-common-words",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// Parse the response
	var stemResp struct {
		MatchedIndices [][]int `json:"matched_indices"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&stemResp); err != nil {
		return err
	}

	for _, match := range stemResp.MatchedIndices {
		challengeIdx := match[1]
		s.Progress[challengeIdx] = true
	}

	return nil
}

type Challenge struct {
	Quote   string
	Author  string
	Content string
	Words   []string
}

func GetChallenges() []Challenge {
	quotes := []struct {
		quote, author, content string
	}{
		{"When you reach the end of your rope, tie a knot in it and hang on.", "Franklin D. Roosevelt", "Persistence and resilience are key to overcoming obstacles. Success often comes to those who refuse to give up, learning from failures and adapting to new challenges. Each setback is an opportunity to grow stronger and wiser."},
		{"Always remember that you are absolutely unique. Just like everyone else.", "Margaret Mead", "Individuality defines us, yet we share common traits that bind humanity together. Embracing our uniqueness while understanding others fosters both personal growth and stronger communities."},
		{"Don't judge each day by the harvest you reap but by the seeds that you plant.", "Robert Louis Stevenson", "Progress is often measured by the effort we invest rather than immediate outcomes. Small, consistent actions lead to significant achievements over time, reinforcing the value of patience and dedication."},
		{"The future belongs to those who believe in the beauty of their dreams.", "Eleanor Roosevelt", "Visionaries shape the world by daring to dream big. Their belief fuels innovation and perseverance, transforming ideas into reality. Confidence in one’s aspirations is the first step toward success."},
		{"It is during our darkest moments that we must focus to see the light.", "Aristotle", "Challenges test our resolve, but hope and determination guide us forward. Strength emerges from adversity, and maintaining a positive outlook is crucial to navigating life’s uncertainties."},
	}

	var challenges []Challenge
	for _, q := range quotes {
		challenges = append(challenges, Challenge{
			Quote:   q.quote,
			Author:  q.author,
			Content: q.content,
			Words:   SanitizeAndSplit(q.quote),
		})
	}

	return challenges
}

