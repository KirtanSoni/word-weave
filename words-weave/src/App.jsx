import React, { useState, useEffect } from 'react';

const App = () => {
  const [selectedWords, setSelectedWords] = useState([]);
  const [paragraph, setParagraph] = useState(
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
  );
  const [wordElements, setWordElements] = useState([]);

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

  // Format date as MM/DD/YYYY
  const formatDate = () => {
    const date = new Date();
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg overflow-hidden shadow-lg">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">WordWeave</h1>
          <p className="text-sm">{formatDate()}</p>
        </div>
        <button className="text-sm underline">How to Play</button>
      </div>
      
      {/* Game Title */}
      <div className="bg-gray-900 text-white p-6 text-center">
        <h2 className="text-xl">"Quote"</h2>
      </div>
      
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
      
      {/* Word Bubbles */}
      <div className="px-4 pb-4 flex flex-wrap gap-2">
        {selectedWords.map((word, index) => (
          <button 
            key={`bubble-${word.id}`}
            onClick={() => handleBubbleClick(index)}
            className="bg-gray-200 px-3 py-1 rounded-full text-sm"
          >
            {word.text}
          </button>
        ))}
        
        {/* Empty bubbles to fill space */}
        {Array.from({ length: Math.max(0, 20 - selectedWords.length) }).map((_, index) => (
          <div key={`empty-${index}`} className="bg-gray-200 px-6 py-1 rounded-full"></div>
        ))}
      </div>
      
      {/* Divider */}
      <div className="border-t border-gray-300 mx-4 my-2"></div>
      
      {/* Original Paragraph */}
      <div className="p-4">
        <p className="text-gray-900 leading-relaxed">
          {wordElements.map((wordObj, index) => (
            <React.Fragment key={wordObj.id}>
              {index > 0 && ' '}
              <span 
                className={`${wordObj.selected ? 'text-gray-300' : 'text-gray-900'} cursor-pointer`}
                onClick={() => !wordObj.selected && handleWordClick(index)}
              >
                {wordObj.text}
              </span>
            </React.Fragment>
          ))}
        </p>
      </div>
    </div>
  );
};

export default App;