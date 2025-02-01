import React, { useState, useEffect } from 'react'

const initialGameState = {
  qoute: '',
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
    <div className='bg-slate-950 min-h-screen p-6'>
      <h3 className='text-white mb-3'> Quote of the Day</h3>
      <p className='text-slate-400 mb-6'>
        Found: {gameState.completed}/{gameState.length} in {gameState.attempts} attempts
      </p>

      <div className="mb-6 p-4 bg-slate-800 rounded-lg">
      <p className="font-bold text-lg">
        {gameState.quote?.split(/\s+/).map((word, index) => (
            <React.Fragment key={index}>
              {index > 0 && " "}
              <span className={gameState.progress[index] ? 'text-green-500' : 'text-white'}>
                {word}
              </span>
            </React.Fragment>
          ))}
          </p>
        <p className='text-slate-500 text-sm text-right'>- {gameState.byline}</p>
      </div>

      <div className='space-y-4 mb-6'>
        <div className='p-4 bg-slate-900 rounded-lg'>
          <div className='text-slate-300' onMouseUp={handleTextSelection}>
              {gameState.llmResponses}
          </div>
        </div>

    {selectedWords.length > 0 && (
      <div className='mt-4'>
        <p className='text-slate-400 mb-2'>Selected Words:</p>
        <div className='flex flex-wrap gap-2'>
          {selectedWords.map((word, index) => (
            <span key={index} className='px-2 py-1 bg-slate-800 text-slate-200 rounded'>
              {word}
            </span>
          ))}
        </div>
      </div>
    )}

    <div className='flex justify-end gap-3'>
      <button
         onClick={() => {
          setSelectedWords([]);
          clearHighlight();
        }}
        className='text-slate-400'
      >
        Clear Selection
      </button>
      <button
        onClick={handleSelectionSubmit}
        disabled = {isLoading || selectedWords.length === 0}
        className='bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed'
      >
        {isLoading ? "Submitting..." : "Submit Selection"}
      </button>
    </div>
  </div>
</div>
  );
}