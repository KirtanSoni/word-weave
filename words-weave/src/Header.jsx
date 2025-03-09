import React, { useState } from 'react';
import selectGif from './selecting-word.gif'
import sendGif from './submit.gif'
import litUrl from './lit.png'

const Header = ({ gameData, formatDate }) => {
  const [showModal, setShowModal] = useState(false);
  
  return (
    <>
      <div className="md:hidden bg-gray-900 text-white sticky top-0 z-10 flex-shrink-0 rounded rounded-b-lg">
        <div className="p-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">WordWeave</h1>
            <p className="text-sm">{formatDate()}</p>
          </div>
          <button 
            className="text-sm underline"
            onClick={() => setShowModal(true)}
          >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4"/>
                    <path d="M12 8h.01"/>
                    </svg>
          </button>
          <span>Attempts: {gameData.attempts}</span>
        </div>
        <div className="p-6 text-center font-bold">
          <h2 className="text-2xl">
          "
                {gameData.quote?.split(/\s+/).map((word, index) => (
                    <span
                    key={index}
                    className={`
                        ${gameData.progress[index] ? "text-green-700" : "text-white"}
                        ${index ? "first-letter:float-left first-letter:text-4xl first-letter:font-bold first-letter:mr-1 first-letter:mt-1" : ""}
                    `}
                    >
                    {index > 0 && " "}{word}
                    </span>
                ))}
                "
          </h2>
          {gameData.author && <p className="text-sm mt-2">— {gameData.author}</p>}
        </div>
      </div>
  
      <div className="hidden md:block bg-gray-900 text-white z-10 flex-shrink-0 rounded rounded-b-lg mt-4">
        <div className="p-4 flex items-center">
            <div className="flex-1">
            <h1 className="text-xl font-bold">WordWeave</h1>
            <p className="text-sm">{formatDate()}</p>
            </div>
            <div className="flex flex-col items-end p-2">
                <button 
                    className="text-sm underline flex items-center hover:cursor-pointer"
                    onClick={() => setShowModal(true)}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4"/>
                    <path d="M12 8h.01"/>
                    </svg>
                    How to Play
                </button>
                <span>Attempts: {gameData.attempts}</span>
            </div>
        </div>
            <div className="p-6 text-center font-bold">
                <h2 className="text-3xl">
                "
                {gameData.quote?.split(/\s+/).map((word, index) => (
                    <span
                    key={index}
                    className={`
                        ${gameData.progress[index] ? "text-green-700" : "text-white"}
                        ${index ? "first-letter:float-left first-letter:text-4xl first-letter:font-bold first-letter:mr-1 first-letter:mt-1" : ""}
                    `}
                    >
                    {index > 0 && " "}{word}
                    </span>
                ))}
                "
                </h2>
                {gameData.author && <p className="text-sm mt-2">— {gameData.author}</p>}
            </div>
        </div>

      {showModal && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 mx-4 border border-black rounded rounded-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">How to Play</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 hover:cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="mt-2">
              Welcome to WordWeave! WordWeave is a word matching game where you're given a quote and paragraph and its your job to generate paragraphs that contain words from the quote using the words from the paragraph as prompts for an AI.
              <h4>Here's how you play:</h4>
              <span>
                Select a word from the paragraph to form your prompt
                <img src={selectGif}/> 
              </span>
              <span>
                Once you're satisfied with your prompt hit send and watch your paragraph change
                <img src={sendGif}/> 
              </span>
              <span>
                The words in the quote light up if they're found in the generated response!
                <img src={litUrl}/>
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header