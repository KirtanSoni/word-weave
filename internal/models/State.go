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
		return 
	}
	panic("Max Attempts reached. Should Not be able to call AddContent")
}

func (s *State) IsActive() bool {
	return time.Since(s.LastAccessed) < INACTIVE_THRESHOLD
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
	quote:=  "The greatest glory in living lies not in never falling, but in rising every time we fall."
	challenges := []Challenge{
		{
			Quote:   quote,
			Author:  "Nelson Mandela",
			Content: "Practice makes perfect when learning to code.",
			Words:   SanitizeAndSplit(quote),
		},
		{
			Quote:   "The way to get started is to quit talking and begin doing.",
			Author:  "Walt Disney",
			Content: "Algorithms are step by step procedures for calculations.",
			Words:   []string{"the", "way", "to", "get", "started", "is", "quit", "talking", "and", "begin", "doing"},
		},
		{
			Quote:   "Your time is limited, so don't waste it living someone else's life.",
			Author:  "Steve Jobs",
			Content: "Data structures are ways to organize and store data.",
			Words:   []string{"your", "time", "is", "limited", "so", "don't", "waste", "it", "living", "someone", "else's", "life"},
		},
		{
			Quote:   "If life were predictable it would cease to be life, and be without flavor.",
			Author:  "Eleanor Roosevelt",
			Content: "Concurrency allows multiple computations to happen simultaneously.",
			Words:   []string{"if", "life", "were", "predictable", "it", "would", "cease", "to", "be", "and", "without", "flavor"},
		},
		{
			Quote:   "Life is what happens when you're busy making other plans.",
			Author:  "John Lennon",
			Content: "Go channels provide a way for goroutines to communicate.",
			Words:   []string{"life", "is", "what", "happens", "when", "you're", "busy", "making", "other", "plans"},
		},
		{
			Quote:   "Spread love everywhere you go. Let no one ever come to you without leaving happier.",
			Author:  "Mother Teresa",
			Content: "Interfaces define behavior rather than implementation.",
			Words:   []string{"spread", "love", "everywhere", "you", "go", "let", "no", "one", "ever", "come", "to", "without", "leaving", "happier"},
		},
		{
			Quote:   "When you reach the end of your rope, tie a knot in it and hang on.",
			Author:  "Franklin D. Roosevelt",
			Content: "Memory allocation in Go is handled automatically by the runtime.",
			Words:   []string{"when", "you", "reach", "the", "end", "of", "your", "rope", "tie", "a", "knot", "in", "it", "and", "hang", "on"},
		},
		{
			Quote:   "Always remember that you are absolutely unique. Just like everyone else.",
			Author:  "Margaret Mead",
			Content: "Error handling is an essential part of robust programming.",
			Words:   []string{"always", "remember", "that", "you", "are", "absolutely", "unique", "just", "like", "everyone", "else"},
		},
		{
			Quote:   "Don't judge each day by the harvest you reap but by the seeds that you plant.",
			Author:  "Robert Louis Stevenson",
			Content: "Testing ensures your code works as expected under various conditions.",
			Words:   []string{"don't", "judge", "each", "day", "by", "the", "harvest", "you", "reap", "but", "seeds", "that", "plant"},
		},
		{
			Quote:   "The future belongs to those who believe in the beauty of their dreams.",
			Author:  "Eleanor Roosevelt",
			Content: "Documentation helps others understand your code and its purpose.",
			Words:   []string{"the", "future", "belongs", "to", "those", "who", "believe", "in", "the", "beauty", "of", "their", "dreams"},
		},
	}

	// Return all challenges or limit to num
	if num <= 0 || num >= len(challenges) {
		return nil,nil
	}
	return challenges[:num], nil
}
