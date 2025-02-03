import React, { useState, useEffect } from 'react'

const initialGameState = {
  qoute: 'Hello how are you',
  byline: '',
  llmResponses: '',
  length: 0,
  attempts: 0,
  progress: [],
  completed: 0
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
      completed: result.progress?.filter(Boolean).length
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
    if (!selectedText || selectedText.split(' ').length > 4) {
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
              completed: result.progress.filter(Boolean).length
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

  if (isGameWon) {
    return (
      <div className='bg-slate-950 min-h-screen p-6 flex flex-col items-center justify-center'>
      <h2 className='text-green-500 text-2xl mb-6'>Congrats! You've Completed the Quote!</h2>
      <button
        onClick={handleNext}
        disabled={isLoading}
        className='bg-green-500 text-whtie p-3 rounded-lg text-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed'
      > 
        {isLoading ? 'Loading...' : 'Next Quote'}
      </button>
    </div>
    )

  }

  return (
    <div className="bg-black min-h-screen text-white px-6 py-10">
    <div className="max-w-3xl mx-auto">
      <h3 className="text-2xl font-semibold text-center mb-4">Quote of the Day</h3>

      <div className="flex justify-between text-sm text-gray-400 mb-4">
        <p>Found: {gameState.completed}/{gameState.length}</p>
        <span>{gameState.attempts} attempts</span>
      </div>

      <div className=" p-6 rounded-xl shadow-md mb-6 ">
        <p className="font-semibold text-center text-xl leading-relaxed">
          {gameState.quote?.split(/\s+/).map((word, index) => (
            <span
              key={index}
              className={
                gameState.progress[index] ? "text-green-400" : "text-gray-100"
              }
            >
              {index > 0 && " "}{word}
            </span>
          ))}
        </p>
        <p className="text-gray-500 text-right mt-2 italic">~ {gameState.byline}</p>
      </div>

      <div className="space-y-4">
        <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800">
          <div
            className="text-gray-300 leading-relaxed cursor-text select-text"
            onMouseUp={handleTextSelection}
          >
            {gameState.llmResponses}
          </div>
        </div>

        {selectedWords.length > 0 && (
          <div>
            <p className="text-gray-400 text-sm mb-2">Selected Words:</p>
            <div className="flex flex-wrap gap-2">
              {selectedWords.map((word, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-zinc-800 text-gray-200 rounded-lg border border-zinc-700"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={() => {
              setSelectedWords([]);
              clearHighlight();
            }}
            className="text-gray-400 hover:text-white transition duration-200"
          >
            Clear Selection
          </button>

          <button
            onClick={handleSelectionSubmit}
            disabled={isLoading || selectedWords.length === 0}
            className="bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            {isLoading ? "Submitting..." : "Submit Selection"}
          </button>
        </div>
      </div>
    </div>
  </div>
  );
}