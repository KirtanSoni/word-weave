package llm

import (
	"context"
	"log"
	"github.com/openai/openai-go"
)

func LLMSummaries(s int, ctx context.Context) []string {
	client := openai.NewClient()
	contents := make([]string, s)

	for i := range s {
		completion, err := client.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
			Messages: openai.F([]openai.ChatCompletionMessageParamUnion{
				openai.UserMessage("Generate a 100-word paragraph containing a fascinating, lesser-known fact from any field of knowledge. Write as if extracted from a random encyclopedia page - factual, informative, and engaging. Choose from diverse topics: science, history, geography, biology, physics, culture, technology, space, medicine, archaeology, linguistics, or any other field. Avoid repetitive topics. Each response should feel like discovering an unexpected gem of knowledge. Write in an encyclopedic tone with specific details, numbers, and concrete examples. The fact should be surprising or educational to most readers. Aim for exactly 100 words."),
			}),
			Seed:  openai.Int(1),
			Model: openai.F(openai.ChatModelGPT4o),
		})
		if err != nil {
			log.Printf("Error in LLMSummaries for index %d: %v", i, err)
			contents[i] = "Unable to generate content at this time."
			continue
		}
		
		// CRITICAL FIX: Check if Choices exists before accessing
		if len(completion.Choices) == 0 {
			log.Printf("No choices returned from OpenAI API for LLMSummaries index %d", i)
			contents[i] = "Content unavailable."
			continue
		}
		
		contents[i] = completion.Choices[0].Message.Content
	}
	
	return contents
}

func StreamingLLM(input string, ctx context.Context, output chan string) string {
	// CRITICAL: Always close the channel, even on panic
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Recovered from panic in StreamingLLM: %v", r)
		}
		close(output)
	}()

	client := openai.NewClient()
	stream := client.Chat.Completions.NewStreaming(ctx, openai.ChatCompletionNewParams{
		Messages: openai.F([]openai.ChatCompletionMessageParamUnion{
			openai.SystemMessage("dont ask any questions, you are a autocomplete feature that will generate sentence of 100 words from the given word/words, dont ask for context, just reply with whatever comes to your mind"),
			openai.UserMessage(input),
		}),
		Seed:      openai.Int(0),
		Model:     openai.F(openai.ChatModelGPT3_5Turbo),
		MaxTokens: openai.Int(150),
	})

	acc := openai.ChatCompletionAccumulator{}

	for stream.Next() {
		chunk := stream.Current()
		acc.AddChunk(chunk)

		if _, ok := acc.JustFinishedContent(); ok {
			// Content stream finished
		}

		if _, ok := acc.JustFinishedRefusal(); ok {
			// Refusal stream finished
		}

		if len(chunk.Choices) > 0 {
			output <- chunk.Choices[0].Delta.Content
		}
	}

	if err := stream.Err(); err != nil {
		log.Printf("Streaming error: %v", err)
		return ""
	}

	// CRITICAL FIX: Check if acc.Choices has any elements before accessing
	if len(acc.Choices) == 0 {
		log.Printf("No choices returned from OpenAI API for input: %s", input)
		return ""
	}

	return acc.Choices[0].Message.Content
}