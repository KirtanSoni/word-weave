import React, { useState, useEffect } from 'react'

const maxAttempts = 4
const maxChallenges = 2

const initialGameState = {
  qoute: 'Hello how are you',
  byline: '',
  llmResponses: '',
  length: 0,
  attempts: 0,
  progress: [],
  completed: 0,
  challenge: 0,
  isDoneForDay: false
}

export default function App() {
  const [gameState, setGameState] = useState(initialGameState)
  const [selectedWords, setSelectedWords] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isGameWon, setIsGameWon] = useState(false)

  const fetchGameData = async () => {
    try {
      const response = await fetch('/game', {
        method: 'GET',
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to fetch game data')
      const result = await response.json()
    setGameState ({
      quote: result.quote.trim(),
      byline: result.author,
      llmResponses: result.content,
      length: result.length,
      attempts: result.attempts,
      progress: result.progress,
      completed: result.progress?.filter(Boolean).length,
      challenge: result.challenge
    })
    if (result.progress?.filter(Boolean).length === result.length) {
      setIsGameWon(true)
    }
    } catch(error) {
      console.error('Error fetching game data: ', error)
    }
  }
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        handleSelectionSubmit();
      } else if (e.key === 'Escape') {
        setSelectedWords([]);
        clearHighlight()
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedWords]); 
  
  useEffect(() => {
    fetchGameData();
  }, []);


  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection) return;
    
    const selectedText = selection.toString().trim();
    if (!selectedText) {
      setSelectedWords([]);
      return;
    }
  
    try {
      const range = selection.getRangeAt(0);
      const newRange = document.createRange();
      newRange.setStart(range.startContainer, range.startOffset);
      newRange.setEnd(range.endContainer, range.endOffset);
      
      const span = document.createElement('span');
      span.style.backgroundColor = 'rgba(59, 130, 246, 0.5)';
      
      if (range.startContainer !== range.endContainer) {
        setSelectedWords(selectedText.split(' '));
        return
      }
      
      try {
        newRange.surroundContents(span);
        setSelectedWords(selectedText.split(' '));
      } catch (e) {
        console.log('Could not highlight selection');
        setSelectedWords(selectedText.split(' '));
      }
    } catch (e) {
      console.log('Selection error:', e);
      setSelectedWords(selectedText.split(' '));
    }
  };

  const clearHighlight = () => {
    const highlightedSpans = document.querySelectorAll('span[style*="background-color"]');
    highlightedSpans.forEach((span) => {
      const parent = span.parentNode
      if (!parent) return
      while (span.firstChild) {
        parent.insertBefore(span.firstChild, span);
      }
      parent.removeChild(span);
    });
  }

  const handleNext = async () => {
    try {
      setIsLoading(true)

      if (gameState.challenge >= maxAttempts) {
        setGameState(prev => ({
          ...prev,
          isDoneForDay: true
        }))
        return 
      } 
      const response = await fetch('/game/next', {
        method: 'GET',
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to proceed to next game') 
      setIsGameWon(false)
      setSelectedWords([])
      clearHighlight()

      await fetchGameData()
    } catch (error) {
      console.error('Error in proceeding to next game: ', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectionSubmit = async () => {
    if (isLoading || !selectedWords.length) return;
    
    try {
      setIsLoading(true);
      const response = await fetch('/game', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: selectedWords.join(' ') })
      });
  
      if (!response.ok) {
        if (response.status === 401) {
          await fetchGameData();
          return;
        }
        throw new Error('Failed to submit selection');
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = '';
  
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });
        
        if (done) {
          try {
            const response = await fetch('/game', {
              method: 'GET',
              credentials: 'include'
            });
            
            const result = await response.json();
            setGameState(prev => ({
              ...prev,
              quote: result.quote.trim(),
              byline: result.author,
              length: result.length,
              attempts: result.attempts,
              progress: result.progress,
              completed: result.progress.filter(Boolean).length,
              challenge: result.challenge
            }))
            if (result.progress.filter(Boolean).length === result.length) {
              setIsGameWon(true)
            }
          } catch (error) {
            console.error(error);
          }
        } else {
          buffer += chunk;
          setGameState(prev => ({
            ...prev,
            llmResponses: buffer
          }));
        }
      }
  
      setSelectedWords([]);
      clearHighlight();
  
    } catch (error) {
      console.error('Error submitting selection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-orange-100 min-h-screen font-serif text-black px-6 py-10">
      {gameState.isDoneForDay ? (
        <div className="max-w-3xl mx-auto text-center">
        <div className="p-8 border-2 border-gray-800">
          <h2 className="text-3xl font-bold mb-4">End of Today's Edition</h2>
          <p className="text-gray-700 mb-6">
            You've completed all of today's challenges! You found {gameState.completed} words across {maxChallenges} quotes.
          </p>
          <div className="border-t border-gray-400 pt-4 mt-8">
            <p className="text-sm text-gray-600 italic">
              Come back tomorrow for a fresh set of quotes!
            </p>
          </div>
        </div>
      </div>
      ):(
        <div className="max-w-3xl mx-auto">
      <h3 className="text-xl bg-black text-white inline-block px-2 py-1 font-semibold text-center mb-4 underline underline-offset-4">Quote of the Day</h3>
      <p className="text-sm text-gray-600 text-left uppercase tracking-widest mb-4">
        {new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }).toUpperCase()}
      </p>
      <div className="flex justify-between mb-4 font-serif text-sm text-gray-600 border-b border-gray-400">
          <p>Attempts: {gameState.attempts}</p>
          <span>Challenge: {gameState.challenge}</span>
        </div>
              <div className="p-6 rounded-md border-2 border-black mb-6">
                <p className="font-semibold text-center text-3xl leading-relaxed">
                  {gameState.quote?.split(/\s+/).map((word, index) => (
                    <span
                      key={index}
                      className={`
                        ${gameState.progress[index] ? "bg-amber-400 text-black" : "text-black"}
                        ${index ? "first-letter:float-left first-letter:text-4xl first-letter:font-bold first-letter:mr-1 first-letter:mt-1" : ""}
                      `}
                    >
                      {index > 0 && " "}{word}
                    </span>
                  ))}
                </p>
                <p className="text-gray-700 text-right mt-2 font-serif italic text-sm">
          — {gameState.byline}
        </p>
      </div>
      {isGameWon ? (
         <div className="bg-green-50 border-2 border-green-900/20 p-8 text-center">
         <h2 className="text-2xl font-bold text-green-900/70 mb-4">
           Extra! Extra! Quote Completed!
         </h2>
         <p className="text-green-800/60 mb-6">
           You've discovered all the words in {gameState.attempts} attempts!
         </p>
         <button
           onClick={handleNext}
           disabled={isLoading}
           className="bg-green-900/10 border-2 border-green-900/20 text-green-900/70 
                    px-6 py-3 hover:bg-green-900/20 disabled:opacity-50 
                    disabled:cursor-not-allowed transition duration-200 
                    font-serif uppercase tracking-wide"
         >
           {isLoading ? "Loading..." : "Next Quote"}
         </button>
       </div>
      ):(
        gameState.attempts >= maxAttempts ? (
          <div className="bg-red-50 border-2 border-red-900/20 p-8 text-center">
            <h2 className="text-2xl font-bold text-red-900/70 mb-4">
              Stop The Presses!
            </h2>
            <p className="text-red-800/60 mb-6">
              You've found {gameState.completed} words, but ran out of attempts.
            </p>
            <button
              onClick={handleNext}
              disabled={isLoading}
              className="bg-red-900/10 border-2 border-red-900/20 text-red-900/70 
                       px-6 py-3 hover:bg-red-900/20 disabled:opacity-50 
                       disabled:cursor-not-allowed transition duration-200 
                       font-serif uppercase tracking-wide"
            >
              {isLoading ? "Loading..." : "Try Next Quote"}
            </button>
          </div>
      ) : (
        <div className="space-y-4">
        <div className="bg-white p-8 border border-gray-800 shadow-md">
          <div 
            className="font-serif text-gray-800 leading-relaxed cursor-text select-text columns-1 md:columns-2 gap-8"
            onMouseUp={handleTextSelection}
          >
            {gameState.llmResponses}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={handleSelectionSubmit}
            disabled={isLoading || selectedWords.length === 0}
            className="bg-stone-200 text-gray-900 px-6 py-3 border-2 border-gray-800 
                      hover:bg-stone-300 disabled:opacity-50 disabled:cursor-not-allowed 
                      transition duration-200 font-serif uppercase tracking-wide"
          >
            {isLoading ? "Submitting..." : "Submit Selection"}
          </button>

          <button
            onClick={() => {
              setSelectedWords([]);
              clearHighlight();
            }}
            className="text-gray-600 hover:text-gray-800 transition duration-200 
                      font-serif uppercase tracking-wide underline underline-offset-4"
          >
            Clear Selection
          </button>
        </div>
      </div>
      ))}
    </div>
      )}
  </div>
  );
}