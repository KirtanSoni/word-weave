import React, { useState, useEffect, useCallback } from 'react';
import Header from './Header';
const MAX_WORDS = 13;


const WordWeave = () => {
  const [selectedWords, setSelectedWords] = useState([]);
  const [paragraph, setParagraph] = useState(
    `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`
  );
  const [wordElements, setWordElements] = useState([]);
  const [draggedBubbleIndex, setDraggedBubbleIndex] = useState(null);
  const [touchInfo, setTouchInfo] = useState(null);
  const [isGameWon, setIsGameWon] = useState(false);


  const [gameData, setGameData] = useState({
    challenge: 0,
    quote: "",
    author: "",
    content: "",
    attempts: 0,
    progress: []
  });

  useEffect(() => {
    if (gameData.progress.length > 0 && gameData.progress.every(item => item === true)) {
      setIsGameWon(true);
    } else {
      setIsGameWon(false);
    }
    console.log("gameWon? ", isGameWon)
  }, [gameData.progress]);

  const fetchGameData = useCallback(async (nextChallenge = false) => {
    try {
      // Use the nextChallenge parameter to determine the URL
      const url = nextChallenge ? '/game?next=true' : '/game';
      const response = await fetch(url);
      const data = await response.json();
      
      // Always reset game state when fetching new data
      setIsGameWon(false);
      setSelectedWords([]);
      
      setGameData({
        challenge: data.challenge,
        quote: data.quote,
        author: data.author,
        content: data.content,
        attempts: data.attempts,
        progress: data.progress
      });
      setParagraph(data.content);
      
      const words = data.content.split(/\s+/);
      const elements = words.map((word, index) => ({
        id: `word-${index}`,
        text: word,
        originalIndex: index,
        selected: false
      }));
      setWordElements(elements);
    } catch (error) {
      console.error('Error fetching game data:', error);
    }
  }, []); 
  const handleNextChallenge = () => {
    fetchGameData(true);
  };
  useEffect(() => {
    document.title = `WordWeave - Challenge #${gameData.challenge}`;
  }, [gameData]);
  useEffect(() => {
    fetchGameData();
  }, [fetchGameData]);
  useEffect(() => {
    const words = paragraph.split(/\s+/);
    const elements = words.map((word, index) => ({
      id: `word-${index}`,
      text: word,
      originalIndex: index,
      selected: false
    }));
    setWordElements(elements);
  }, [paragraph]);

  const handleWordClick = (index) => {
    if (selectedWords.length >= MAX_WORDS) {
      return
    }
    
    const newWordElements = [...wordElements];
    const wordToSelect = newWordElements[index];
    
    if (!wordToSelect.selected) {
      wordToSelect.selected = true;
      setSelectedWords([...selectedWords, wordToSelect]);
    }
    
    setWordElements(newWordElements);
  };
  const handleBubbleClick = (selectedIndex) => {
    const newSelectedWords = selectedWords.filter((_, index) => index !== selectedIndex);
    
    const newWordElements = [...wordElements];
    const wordToDeselect = wordElements.find(word => word.id === selectedWords[selectedIndex].id);
    if (wordToDeselect) {
      wordToDeselect.selected = false;
    }
    
    setSelectedWords(newSelectedWords);
    setWordElements(newWordElements);
  };
  const handleDragStart = (index) => {
    setDraggedBubbleIndex(index);
  };
  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedBubbleIndex !== null && draggedBubbleIndex !== index) {
      const newSelectedWords = [...selectedWords];
      const draggedWord = newSelectedWords[draggedBubbleIndex];
      newSelectedWords.splice(draggedBubbleIndex, 1);
      newSelectedWords.splice(index, 0, draggedWord);
      
      setSelectedWords(newSelectedWords);
      setDraggedBubbleIndex(index);
    }
  };
  const handleDragEnd = () => {
    setDraggedBubbleIndex(null);
  };
  const WinScreen = () => (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <h2 className="text-3xl font-bold text-green-700 mb-4">You've won!</h2>
      <p className="mb-6">Congratulations! You've completed this challenge.</p>
      <button 
        onClick={() => handleNextChallenge()} 
        className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-6 rounded-full shadow-lg transition-colors"
      >
        Next Challenge
      </button>
    </div>
  );
  const formatDate = () => {
    const date = new Date();
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
  };
  async function handleSubmit () {
    if (selectedWords.length > 0) {
      const inputString = selectedWords.map(word => word.text).join(' ');
      
      try { 
        const response = await fetch('/game', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: inputString
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let streamedText = '';
      
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }
          const chunk = decoder.decode(value, { stream: true });
          streamedText += chunk;
          
          setParagraph(streamedText);
          const words = streamedText.split(/\s+/);
          const elements = words.map((word, index) => ({
            id: `word-${index}`,
            text: word,
            originalIndex: index,
            selected: false
          }));
          setWordElements(elements);
        }
        
        setSelectedWords([]);
        
      } catch (error) {
        console.error('Error processing stream:', error);
      } finally {
        fetchGameData()
      }
}
  }
  return (
    <div className="mx-auto bg-white flex flex-col h-screen max-w-full md:max-w-2xl lg:max-w-4xl relative font-sans">
      <Header gameData = {gameData} formatDate = {formatDate}/>
      {isGameWon ? (
        <WinScreen />
      ) : (
        <>
      <div className="flex-grow flex flex-col md:justify-center md:mt-4">
        <div className="flex-shrink-0">
          <div className="bg-gray-100 p-4 mx-4 my-6 h-16 flex items-center rounded border border-gray-300">
            {selectedWords.length > 0 ? (
              <p className="w-full text-center">
                {selectedWords.map(word => word.text).join(' ')}
              </p>
            ) : (
              <p className="w-full text-center text-gray-400">Select words from below</p>
            )}
          </div>
          
          <div className="px-4 pb-4 flex flex-wrap gap-2 flex-shrink-0">
            {selectedWords.map((word, index) => (
              <div 
                key={`bubble-${word.id}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  setTouchInfo({
                    index: index,
                    startX: touch.clientX,
                    startY: touch.clientY
                  });
                }}
                onTouchMove={(e) => {
                  if (touchInfo && touchInfo.index === index) {
                    e.preventDefault(); 
                  }
                }}
                onTouchEnd={() => {
                  setTouchInfo(null);
                }}
                className="bg-gray-200 px-3 py-1 rounded-full text-sm cursor-move"
                onClick={() => handleBubbleClick(index)}
              >
                {word.text}
              </div>
            ))}
            {Array.from({ length: Math.max(0, MAX_WORDS - selectedWords.length) }).map((_, index) => (
              <div 
                key={`empty-${index}`} 
                className="bg-gray-200 px-6 py-1 rounded-full"
              ></div>
            ))}
          </div>
        </div>
        
        <div className="border-t border-gray-300 mx-4"></div>
        
        <div className="p-4 overflow-y-auto">
          <p className="text-gray-900 leading-relaxed">
            {wordElements.map((wordObj, index) => (
              <React.Fragment key={wordObj.id}>
                {index > 0 && ' '}
                <span 
                  className={`
                    ${wordObj.selected ? 'text-gray-300' : 'text-gray-900'} 
                    ${(!wordObj.selected && selectedWords.length >= MAX_WORDS) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                  `}
                  onClick={() => !wordObj.selected && selectedWords.length < MAX_WORDS && handleWordClick(index)}
                >
                  {wordObj.text}
                </span>
              </React.Fragment>
            ))}
          </p>
        </div>
      </div>
        </>
      )}
      
      {!isGameWon && (
      <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-10">
        <button 
          className={`rounded-full p-3 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300
            ${selectedWords.length > 0 
              ? 'bg-green-800 hover:bg-green-900 text-white cursor-pointer' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-70'}`}
          onClick={() => handleSubmit()}
          disabled={selectedWords.length === 0}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send">
            <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/>
            <path d="m21.854 2.147-10.94 10.939"/>
          </svg>
        </button>
      </div> 
      )}
    </div>
  );}

export default WordWeave;