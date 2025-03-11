from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import nltk
from nltk.stem import PorterStemmer


try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')
# Initialize FastAPI
app = FastAPI(title="Word Stemming Microservice")

# Initialize stemmer
stemmer = PorterStemmer()

class StemRequest(BaseModel):
    content: List[str]
    challenge_words: List[str]

class StemResponse(BaseModel):
    matched_indices: List[List[int]]

@app.post("/find-common-words", response_model=StemResponse)
async def find_common_words(request: StemRequest):
    try:
        content = request.content
        challenge_words = request.challenge_words
        
        # Stem all words
        stemmed_challenges = [stemmer.stem(word.lower()) for word in challenge_words]
        stemmed_contents = [stemmer.stem(word.lower()) for word in content]

        print(stemmed_challenges) 
        print(stemmed_contents) 
        # Find matches
        matched_indices = []
        for content_idx, content_word in enumerate(stemmed_contents):
            for challenge_idx, stemmed_challenge in enumerate(stemmed_challenges):
                if content_word == stemmed_challenge:
                    matched_indices.append([content_idx, challenge_idx])
        
        return StemResponse(matched_indices=matched_indices)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    # Add this near the beginning of your script


    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)