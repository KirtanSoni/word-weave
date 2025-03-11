package llm

import (
	"context"

	"github.com/openai/openai-go"
	"log"
)

func LLMSummaries(s int, ctx context.Context) []string {
	client := openai.NewClient()
	contents := make([]string, s)
	for i := range s {
		completion, err := client.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
			Messages: openai.F([]openai.ChatCompletionMessageParamUnion{
				openai.UserMessage("Write a paragraph of a random fact about anything you can think of. paragraph should be of 100 words"),
			}),
			Seed:  openai.Int(1),
			Model: openai.F(openai.ChatModelGPT4o),
		})
		if err != nil {
			panic(err)
		}
		contents[i] = completion.Choices[0].Message.Content
	}
	return contents
}

func StreamingLLM(input string, ctx context.Context, output chan string) string {
	client := openai.NewClient()
	stream := client.Chat.Completions.NewStreaming(ctx, openai.ChatCompletionNewParams{
		Messages: openai.F([]openai.ChatCompletionMessageParamUnion{
			openai.SystemMessage("dont ask any questions, you are a autocomplete feature that will generate sentence of 100 words from the given word/words, dont ask for context, just reply with whatever comes to your mind"),
			openai.UserMessage(input),
		}),
		Seed:      openai.Int(0),
		Model:     openai.F(openai.ChatModelGPT3_5Turbo),
		MaxTokens: openai.Int(150),
		// Temperature: param.Field[float64]{},
	})

	acc := openai.ChatCompletionAccumulator{}

	for stream.Next() {
		chunk := stream.Current()
		acc.AddChunk(chunk)

		if _, ok := acc.JustFinishedContent(); ok {
			// println("Content stream finished:", content)
		}

		if _, ok := acc.JustFinishedRefusal(); ok {
			// println("Refusal stream finished:", refusal)
		}

		if len(chunk.Choices) > 0 {
			output <- chunk.Choices[0].Delta.Content
		}
	}

	if err := stream.Err(); err != nil {
		log.Println(err)
	}
	close(output)
	return acc.Choices[0].Message.Content
}
