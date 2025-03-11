package llm

import (
	"context"
	"fmt"
	"testing"
)

// Mock client for OpenAI
func TestLLMSummaries(t *testing.T) {
	ctx := context.Background()
	results := LLMSummaries(3, ctx)

	fmt.Println(len(results))
	for _, summary := range results {
		fmt.Println(summary)
	}
}
