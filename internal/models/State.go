package models

import (
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

func (s *State) AddContent(content Entry) {
	if s.Attempts < len(s.Content) {
		s.Content = append(s.Content, content)
		s.Attempts++
	}
	panic("Max Attempts reached. Should Not be able to call AddContent")
}

func (s *State) IsActive() bool {
	return time.Now().Sub(s.LastAccessed) < INACTIVE_THRESHOLD
}

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

func (s *State) IsComplete() bool {
	for _, found := range s.Progress {
		if !found {
			return false
		}
	}
	return true
}
func (s *State) UpdateSession(input string, content string, challengewords []string) {
	entry := Entry{Input: input, Content: content}
	s.AddContent(entry)
	s.FindCommonWords(entry.Content, challengewords)

}

func (s *State) FindCommonWords(content string, challengewords []string) {
	words := SanitizeAndSplit(content)
	for _, word := range words {
		for index, qouteword := range challengewords {
			if !s.Progress[index] && strings.Contains(word, qouteword) {
				s.Progress[index] = true
			}
		}
	}
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
	panic("unimplimented")
}
