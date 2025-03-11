package models

import (
	"bytes"
	"encoding/json"
	"net/http"
	"strings"
	"time"
	"unicode"
)

var (
	INACTIVE_THRESHOLD = time.Minute * 10
)

// helper
func SanitizeAndSplit(text string) []string {
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

type Entry struct {
	Input   string
	Content string
}

type State struct {
	ID           string
	Challenge    int
	Progress     []bool
	Content      []Entry
	Attempts     int
	LastAccessed time.Time
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

//Not Used Yet
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
	var stemResp struct{
		MatchedIndices    [][]int  `json:"matched_indices"`
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

type RequestStruct struct {
	Input string `json:"input"`
}

// get Request response
type ResponseStruct struct {
	Challenge int    `json:"challenge"`
	Quote     string `json:"quote"`
	Author    string `json:"author"`
	Content   string `json:"content"`
	Attempts  int    `json:"attempts"`
	Progress  []bool `json:"progress"`
}

func (s *State) GetPayload() ResponseStruct {
	res := ResponseStruct{
		Challenge: s.Challenge,
		Progress:  s.Progress,
		Attempts:  s.Attempts,
	}
	if len(s.Content) != 0 {
		res.Content = s.Content[len(s.Content)-1].Content
	}
	return res
}

type Challenge struct {
	Quote   string
	Author  string
	Content string
	Words   []string
}

func GetChallenges(num int) ([]Challenge, error) {
	quote1:=  "When you reach the end of your rope, tie a knot in it and hang on."
	quote2:=  "Always remember that you are absolutely unique. Just like everyone else."
	quote3:=  "Don't judge each day by the harvest you reap but by the seeds that you plant."
	quote4:=  "The future belongs to those who believe in the beauty of their dreams."
	challenges := []Challenge{
		{
			Quote:  quote1,
			Author:  "Franklin D. Roosevelt",
			Content: "Memory allocation in Go is handled automatically by the runtime.",
			Words:   SanitizeAndSplit(quote1),
		},
		{
			Quote:   quote2,
			Author:  "Margaret Mead",
			Content: "Error handling is an essential part of robust programming.",
			Words:  SanitizeAndSplit(quote2),
		},
		{
			Quote:   "Don't judge each day by the harvest you reap but by the seeds that you plant.",
			Author:  "Robert Louis Stevenson",
			Content: "Testing ensures your code works as expected under various conditions.",
			Words:    SanitizeAndSplit(quote3),
		},
		{
			Quote:   "The future belongs to those who believe in the beauty of their dreams.",
			Author:  "Eleanor Roosevelt",
			Content: "Documentation helps others understand your code and its purpose.",
			Words:   SanitizeAndSplit(quote4),
		},
	}

	// Return all challenges or limit to num
	if num <= 0 || num >= len(challenges) {
		return nil,nil
	}
	return challenges[:num], nil
}
