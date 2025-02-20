import React, { useState, useEffect, useCallback } from 'react'

const maxAttempts = 4;
const maxChallenges = 2;

const TextSelectionArea = ({ content, onSelection }) => {
  const [touchStartTime, setTouchStartTime] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const handleTouchStart = useCallback((e) => {
    setTouchStartTime(Date.now());
    setIsSelecting(false);
  }, []);

  const handleTouchEnd = useCallback((e) => {
    const touchDuration = Date.now() - touchStartTime;
    
    // Only process as a selection if touch was held
    if (touchDuration > 200) {
      setIsSelecting(true);
      const selection = window.getSelection();
      if (!selection) return;
      
      const selectedText = selection.toString().trim();
      if (!selectedText) return;
      
      onSelection(selectedText);
    }
  }, [touchStartTime, onSelection]);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection) return;
    
    const selectedText = selection.toString().trim();
    if (!selectedText) return;
    
    onSelection(selectedText);
  }, [onSelection]);

  // Clear selection on unmount
  useEffect(() => {
    return () => {
      window.getSelection()?.removeAllRanges();
    };
  }, []);

  return (
    <div 
      className="font-serif text-gray-800 leading-relaxed select-text"
      style={{
        WebkitTouchCallout: 'default',
        WebkitUserSelect: 'text',
        userSelect: 'text'
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseUp={handleMouseUp}
    >
      {content}
    </div>
  );
};

const initialGameState = {
  quote: 'Hello how are you',
  byline: '',
  llmResponses: '',
  length: 0,
  attempts: 0,
  progress: [],
  completed: 0,
  challenge: 0,
  isDoneForDay: false,
  activePlayers: 0
};

export default function App() {
  const [gameState, setGameState] = useState(initialGameState);
  const [selectedWords, setSelectedWords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGameWon, setIsGameWon] = useState(false)
  const [showInfo, setShowInfo] = useState(false);

  const fetchGameData = async () => {
    try {
      const response = await fetch('/game', {
        method: 'GET',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch game data');
      const result = await response.json();
      setGameState({
        quote: result.quote.trim(),
        byline: result.author,
        llmResponses: result.content,
        length: result.length,
        attempts: result.attempts,
        progress: result.progress,
        completed: result.progress?.filter(Boolean).length,
        challenge: result.challenge,
        activePlayers: result.activePlayers
      });
      if (result.progress?.filter(Boolean).length === result.length) {
        setIsGameWon(true);
      }
    } catch(error) {
      console.error('Error fetching game data: ', error);
    }
  };

  const handleHighlight = (selectedText) => {
    clearHighlight();
    
    try {
      const selection = window.getSelection();
      if (!selection) return;
      
      const range = selection.getRangeAt(0);
      const newRange = document.createRange();
      newRange.setStart(range.startContainer, range.startOffset);
      newRange.setEnd(range.endContainer, range.endOffset);
      
      const span = document.createElement('span');
      span.style.backgroundColor = 'rgba(59, 130, 246, 0.5)';
      
      if (range.startContainer !== range.endContainer) {
        return;
      }
      
      try {
        newRange.surroundContents(span);
      } catch (e) {
        console.log('Could not highlight selection');
      }
    } catch (e) {
      console.log('Selection error:', e);
    }
  };

  const clearHighlight = () => {
    const highlightedSpans = document.querySelectorAll('span[style*="background-color"]');
    highlightedSpans.forEach((span) => {
      const parent = span.parentNode;
      if (!parent) return;
      while (span.firstChild) {
        parent.insertBefore(span.firstChild, span);
      }
      parent.removeChild(span);
    });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        handleSelectionSubmit();
      } else if (e.key === 'Escape') {
        setSelectedWords([]);
        clearHighlight();
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

  const handleNext = async () => {
    try {
      setIsLoading(true);

      if (gameState.challenge >= maxChallenges) {
        setGameState(prev => ({
          ...prev,
          isDoneForDay: true
        }));
        return;
      }

      const response = await fetch('/game/next', {
        method: 'GET',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to proceed to next game');
      
      setIsGameWon(false);
      setSelectedWords([]);
      clearHighlight();
      await fetchGameData();
    } catch (error) {
      console.error('Error in proceeding to next game: ', error);
    } finally {
      setIsLoading(false);
    }
  };

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
              challenge: result.challenge,
              activePlayers: result.activePlayers
            }));
            if (result.progress.filter(Boolean).length === result.length) {
              setIsGameWon(true);
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
    <div className={`bg-neutral-50 min-h-screen font-serif text-black ${showInfo ? 'bg-opacity-50' : 'bg-opacity-50'} px-6 py-10`}>
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
      ) : (
        <div className="max-w-3xl mx-auto bg-orange-100 border-2 p-3 shadow-orange-950 shadow-md border-black min-h-[80vh]">
          <div className='flex items-center gap-3 mb-4 justify-between'>
          <h3 className="text-xl bg-black text-white inline-block px-2 py-1 font-semibold text-center mb-4 underline underline-offset-4">
            Quote of the Day
          </h3>
          <button 
            className="w-6 h-6 rounded-full border-2 border-black flex items-center justify-center text-sm font-medium hover:bg-gray-100 transition-colors duration-200 mb-4"
            onClick={() => setShowInfo(true)}>i</button>
          </div>
          {showInfo && (
            <>
              {/* Full screen backdrop */}
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-40"

              >
                {/* Centered dialog */}
                <div 
                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 p-6 bg-white shadow-lg border-2 border-gray-200 z-50"
                  onClick={() => setShowInfo(false)}
                >
                  <h4 className='font-semibold mb-3 border-b border-gray-700'>Welcome to WordWeave!</h4>
                  <p className='text-sm text-gray-600 leading-relaxed'>
                    WordWeave is a game where you're given a quote and a random sentence. 
                    The objective of the game is the find all the words in the quote using only the words in the sentence as prompts for an AI. You are allowed to select a continuous subtext from the Content to send to ai as prompt
                  </p>
                </div>
              </div>
            </>
          )}
          <div className='flex items-center gap-3 mb-2 justify-between'>
          <p className="text-sm text-gray-600 text-left uppercase tracking-widest mb-4">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }).toUpperCase()}
          </p>
          <p className='mb-4 font-serif text-sm text-gray-600'>Active Players: {gameState.activePlayers}</p>
          </div>
          
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
          ) : gameState.attempts >= maxAttempts ? (
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
              <div className="bg-white min-h-32 p-8 border border-gray-800 shadow-md columns-2 gap-8">
                <TextSelectionArea 
                  content={gameState.llmResponses}
                  onSelection={(selectedText) => {
                    setSelectedWords(selectedText.split(' '));
                    handleHighlight(selectedText);
                  }}
                />
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
          )}
        </div>
      )}
      <div className="fixed bottom-0 left-0 right-0 bg-black text-white py-2 text-center text-sm">
        <p>Made by <a href='https://github.com/KirtanSoni'className='underline'>Kirtan Soni</a> and <a href='https://github.com/Kushagra1480' className='underline'>Kushagra Kartik</a></p>
      </div>
    </div>
  );
}