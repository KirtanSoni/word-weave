package models

import (
	"strings"
	"unicode"
)

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
