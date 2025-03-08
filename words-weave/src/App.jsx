import React, { useState, useEffect } from 'react';
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

  // Process paragraph into individual words with tracking
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

  // Handle word selection
  const handleWordClick = (index) => {
    // Check if we've already reached the maximum number of words
    if (selectedWords.length >= MAX_WORDS) {
      return; // Don't allow more selections
    }
    
    const newWordElements = [...wordElements];
    const wordToSelect = newWordElements[index];
    
    if (!wordToSelect.selected) {
      wordToSelect.selected = true;
      setSelectedWords([...selectedWords, wordToSelect]);
    }
    
    setWordElements(newWordElements);
  };

  // Handle bubble click (deselect word)
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

  // Handle drag start for bubbles
  const handleDragStart = (index) => {
    setDraggedBubbleIndex(index);
  };

  // Handle drag over for drop targets
  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedBubbleIndex !== null && draggedBubbleIndex !== index) {
      // Reorder the bubbles
      const newSelectedWords = [...selectedWords];
      const draggedWord = newSelectedWords[draggedBubbleIndex];
      newSelectedWords.splice(draggedBubbleIndex, 1);
      newSelectedWords.splice(index, 0, draggedWord);
      
      setSelectedWords(newSelectedWords);
      setDraggedBubbleIndex(index);
    }
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedBubbleIndex(null);
  };

  // Format date as MM/DD/YYYY
  const formatDate = () => {
    const date = new Date();
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
  };

  return (
    <div className="mx-auto bg-white flex flex-col h-screen max-w-full md:max-w-2xl relative">
    <div className="bg-gray-900 text-white sticky top-0 z-10 flex-shrink-0">
      <div className="p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">WordWeave</h1>
          <p className="text-sm">{formatDate()}</p>
        </div>
        <button className="text-sm underline">How to Play</button>
      </div>
      <div className="p-6 text-center">
        <h2 className="text-xl">"Quote"</h2>
      </div>
    </div>

      
      <div className="flex-shrink-0">
        {/* Selected Words Display */}
        <div className="bg-gray-100 p-4 mx-4 my-6 h-16 flex items-center rounded border border-gray-300">
          {selectedWords.length > 0 ? (
            <p className="w-full text-center">
              {selectedWords.map(word => word.text).join(' ')}
            </p>
          ) : (
            <p className="w-full text-center text-gray-400">Select words from below</p>
          )}
        </div>
        
        {/* Word Bubbles - Draggable */}
        <div className="px-4 pb-4 flex flex-wrap gap-2 flex-shrink-0">
        {selectedWords.map((word, index) => (
          <div 
            key={`bubble-${word.id}`}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            onTouchStart={(e) => {
              // Store position for touch drag
              const touch = e.touches[0];
              setTouchInfo({
                index: index,
                startX: touch.clientX,
                startY: touch.clientY
              });
            }}
            onTouchMove={(e) => {
              if (touchInfo && touchInfo.index === index) {
                e.preventDefault(); // Prevent scrolling during drag
                // Implement touch dragging logic here
                // This would need a more complex implementation with element positioning
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
      
      {/* Divider */}
      <div className="border-t border-gray-300 mx-4"></div>
      
      {/* Paragraph - Fixed to bottom */}
      
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
    
    {/* Send button - correctly positioned at root level */}
    <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-10">
      <button 
        className={`rounded-full p-3 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300
          ${selectedWords.length > 0 
            ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-70'}`}
        onClick={() => {
          if (selectedWords.length > 0) {
            // Handle send functionality
            console.log('Sending:', selectedWords.map(word => word.text).join(' '));
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