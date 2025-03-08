import React, { useState, useEffect, useCallback } from 'react';
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

  const [gameData, setGameData] = useState({
    challenge: 0,
    quote: "",
    author: "",
    content: "",
    attempts: 0,
    progress: []
  });

  const fetchGameData = useCallback(async () => {
    try {
      const response = await fetch('/game');
      const data = await response.json();
      console.log("data", data)
      setGameData({
        challenge: data.challenge,
        quote: data.quote,
        author: data.author,
        content: data.content,
        attempts: data.attempts,
        progress: data.progress
      });
      
      // If you want to update paragraph with the fetched content
      setParagraph(data.content);
      
      // Process the paragraph into word elements after fetching
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
  useEffect(() => {
    console.log("game", gameData)
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
  const formatDate = () => {
    const date = new Date();
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
  };
  console.log(gameData.quote.split(/\s+/))
  

  return (
    <div className="mx-auto bg-white flex flex-col h-screen max-w-full md:max-w-2xl relative">
    <div className="bg-gray-900 text-white sticky top-0 z-10 flex-shrink-0">
      <div className="p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">WordWeaves</h1>
          <p className="text-sm">{formatDate()}</p>
        </div>
        <button className="text-sm underline">How to Play</button>
      </div>
      <div className="p-6 text-center">
      <h2 className="text-xl">
      {gameData.quote?.split(/\s+/).map((word, index) => (
                <span
                  key={index}
                  className={`
                    ${gameData.progress[index] ? "text-green-600" : "text-white"}
                    ${index ? "first-letter:float-left first-letter:text-4xl first-letter:font-bold first-letter:mr-1 first-letter:mt-1" : ""}
                  `}
                >
                  {index > 0 && " "}{word}
                </span>
        ))}

      </h2>
        {gameData.author && <p className="text-sm mt-2">— {gameData.author}</p>}
      </div>
    </div>

      
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
      
      
      <div className="p-4 overflow-y-auto flex-grow">
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
    
    <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-10">
      <button 
        className={`rounded-full p-3 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300
          ${selectedWords.length > 0 
            ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-70'}`}
            onClick={async () => {
              if (selectedWords.length > 0) {
                // Construct the input string from selected words
                const inputString = selectedWords.map(word => word.text).join(' ');
                
                try {
                  // Set loading state if needed
                  // setIsLoading(true);
                  
                  // Send POST request to the API
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
                  
                  // Handle streaming response
                  const reader = response.body.getReader();
                  const decoder = new TextDecoder();
                  let streamedText = '';
                  
                  // Process the stream chunks
                  while (true) {
                    const { done, value } = await reader.read();
                    
                    if (done) {
                      break;
                    }
                    
                    // Decode the chunk and append to accumulated text
                    const chunk = decoder.decode(value, { stream: true });
                    streamedText += chunk;
                    
                    // Update paragraph with current accumulated text
                    setParagraph(streamedText);
                    
                    // Also update word elements for the updated paragraph
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
                  // Show error to user if needed
                } finally {
                  fetchGameData()
                  // Reset loading state if needed
                  // setIsLoading(false);
                }
          }
        }}
        disabled={selectedWords.length === 0}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send">
          <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/>
          <path d="m21.854 2.147-10.94 10.939"/>
        </svg>
      </button>
    </div> 
    </div>
  );
};

export default WordWeave;