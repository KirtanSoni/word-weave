import React, { useState, useEffect } from 'react';

export default function App() {
  const [quote, setQuote] = useState('');
  const [byline, setByline] = useState('');
  const [llmResponses, setLlmResponses] = useState("");
  const [selectedWords, setSelectedWords] = useState([]);
  const [foundWords, setFoundWords] = useState(new Set());
  const [targetWords, setTargetWords] = useState([]);
  const [completed, setCompleted] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [length, setLength] = useState(0)
  const [progress, setProgress] = useState([])

  const fetchQuoteAndResponse = async () => {
    // const stored = localStorage.getItem('gameData');
    // if (stored) {
    //   const { quote: storedQuote, byline: storedByline, date, sampleResponse } = JSON.parse(stored);
    //   const today = new Date().toDateString();

      // if (date === today) {
      //   setQuote(storedQuote);
      //   setByline(storedByline);
      //   setLlmResponses([sampleResponse]);
      //   return;
      // }
    // }

    try {
      const response = await fetch('/game', {
        method: "GET",
        credentials:'include'
      });

      const cookie = response.headers.get('Set-Cookie')
      const result = await response.json();
      const today = new Date().toDateString();
      // localStorage.setItem('gameData', JSON.stringify({
      //   quote: result.quote,
      //   byline: result.author,
      //   sampleResponse: result.content,
      //   date: today
      // }));
      console.log(result)
      setAttempts(result.attempts)
      setProgress(result.progress)
      setCompleted(result.progress.filter(Boolean).length)
      setQuote(result.quote.trim())
      setByline(result.author)
      setLength(result.length)
      setLlmResponses([result.content]);
    } catch (error) {
      console.error(error);
    }
  };

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
    fetchQuoteAndResponse();
  }, []);


  useEffect(() => {
    if (quote) {
      const words = quote.toLowerCase()
        .split(' ')
        .map(word => word.replace(/[.,!?'"]/g, ''))
        .filter(word => word.length > 2);
      setTargetWords(words);
    }
  }, [quote]);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
  
    if (selectedText && selectedText.split(' ').length <= 4) {
      setSelectedWords(selectedText.split(' '));
    } else {
      setSelectedWords([]);
    }
    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.style.backgroundColor = 'rgba(59, 130, 246, 0.5)'; 
    range.surroundContents(span);
  }

  const clearHighlight = () => {
    const highlightedSpans = document.querySelectorAll('span[style*="background-color"]');
    highlightedSpans.forEach((span) => {
      const parent = span.parentNode;
      while (span.firstChild) {
        parent.insertBefore(span.firstChild, span);
      }
      parent.removeChild(span);
    });
  }

  const handleSelectionSubmit = async () => {
   
    try {
      const response = await fetch('/game', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: selectedWords.join(' ') })
      });

      if (!response.ok){
        if (response.status == 401 ){
          return await fetchQuoteAndResponse()
        }
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = ''; // Incrementally store content
      
      // Process the stream
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });
        
        if(done){
          try {
            const response = await fetch('/game', {
              method: "GET",
              credentials:'include'
            });
      
            const cookie = response.headers.get('Set-Cookie')
            const result = await response.json();
            const today = new Date().toDateString();
            // localStorage.setItem('gameData', JSON.stringify({
            //   quote: result.quote,
            //   byline: result.author,
            //   sampleResponse: result.content,
            //   date: today
            // }));
            console.log(result)
            setProgress(result.progress)
            setAttempts(result.attempts)
            setCompleted(result.progress.filter(Boolean).length)
            setQuote(result.quote.trim())
            setByline(result.author)
            setLength(result.length)
          } catch (error) {
            console.error(error);
          }
        }
        else {
          buffer += chunk;
          setLlmResponses(buffer); // Update with the latest chunk of content
        }
      }
      

      // const responseWords = result.text.toLowerCase()
      //   .split(' ')
      //   .map(word => word.replace(/[.,!?'"]/g, ''));
  
      const newFound = new Set(foundWords);
      targetWords.forEach(target => {
        if (responseWords.includes(target)) {
          newFound.add(target);
        }
      });
      setFoundWords(newFound);
  
      if (newFound.size === targetWords.length) {
        alert('Congratulations! You found all the words!');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const words = quote.split(/\s+/);
  return (
    <div className='bg-slate-950 min-h-screen p-6'>
  <h3 className='text-white mb-3'> Quote of the Day</h3>
  <p className='text-slate-400 mb-6'>Found: {completed}/{length} in {attempts} attempts</p>

  <div className="mb-6 p-4 bg-slate-800 rounded-lg">

   <p className="font-bold text-lg">
        {words.map((word, index) => (
          <React.Fragment key={index}>
            {index > 0 && " "}
            <span
              className={progress[index] ? 'text-green-500' : 'text-white'}
            >
              {word}
            </span>
          </React.Fragment>
        ))}
      </p>
    <p className='text-slate-500 text-sm text-right'>- {byline}</p>
  </div>

  <div className='space-y-4 mb-6'>
    <div className='p-4 bg-slate-900 rounded-lg'>
      <div
          className='text-slate-300'
          onMouseUp={handleTextSelection}
        >
          {llmResponses}
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
        onClick={() => setSelectedWords([])}
        className='text-slate-400'
      >
        Clear Selection
      </button>
      <button
        onClick={handleSelectionSubmit}
        className='bg-blue-500 text-white p-2 rounded'
      >
        Submit Selection
      </button>
    </div>
  </div>

  {foundWords.size > 0 && (
    <div className='mt-6'>
      <p className='text-slate-400 mb-2'>Found Words:</p>
      <div className='flex flex-wrap gap-2'>
        {Array.from(foundWords).map((word, index) => (
          <span key={index} className='px-2 py-1 bg-slate-800 text-slate-200 rounded'>
            {word}
          </span>
        ))}
      </div>
    </div>
  )}
</div>
  );
}