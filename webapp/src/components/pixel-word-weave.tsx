    "use client"

    import React, { useState, useEffect, useCallback, useRef } from "react"
    import PixelHeader from "./pixel-header"
    import PixelWinScreen from "./pixel-win-screen"
    import { PixelButton } from "./pixel-ui/pixel-button"
    import { Send } from "lucide-react"
    import KeyboardShortcutsModal from "./keyboard-shortcuts-modal"
    import HowToPlayModal from "./how-to-play-modal"
    import MobileHelp from "./mobile-help"
    import GameOverScreen from "./game-over"
    import DailyLimitScreen from "./daily-limit"

    const MAX_WORDS = 13

    interface WordElement {
      id: string
      text: string
      originalIndex: number
      selected: boolean
    }

    interface GameData {
      challenge: number
      quote: string
      author: string
      content: string
      attempts: number
      progress: boolean[]
    }

    interface TouchInfo {
      index: number
      startX: number
      startY: number
    }

    const PixelWordWeave = () => {
      const [selectedWords, setSelectedWords] = useState<WordElement[]>([])
      const [paragraph, setParagraph] = useState(
        `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`,
      )
      const [wordElements, setWordElements] = useState<WordElement[]>([])
      const [draggedBubbleIndex, setDraggedBubbleIndex] = useState<number | null>(null)
      const [touchInfo, setTouchInfo] = useState<TouchInfo | null>(null)
      const [isGameWon, setIsGameWon] = useState(false)
      const [isGameOevr, setIsGameOver] = useState(false)
      const [isDailyLimit, setIsDailyLimit] = useState(false)
      const [showInstructions, setShowInstructions] = useState(false)
      const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
      const containerRef = useRef<HTMLDivElement>(null)
      const paragraphRef = useRef<HTMLParagraphElement>(null)

      const [isDragging, setIsDragging] = useState(false)
      const [touchStartIndex, setTouchStartIndex] = useState<number | null>(null)
      const [touchCurrentIndex, setTouchCurrentIndex] = useState<number | null>(null)

      const [gameData, setGameData] = useState<GameData>({
        challenge: 0,
        quote: "",
        author: "",
        content: "",
        attempts: 0,
        progress: [],
      })

      const handleShowInstructions = useCallback(() => {
        setShowInstructions(true)
      }, [])

      const handleCloseInstructions = useCallback(() => {
        setShowInstructions(false)
      }, [])

      const handleShowKeyboardShortcuts = useCallback(() => {
        setShowKeyboardShortcuts(true)
      }, [])

      const handleCloseKeyboardShortcuts = useCallback(() => {
        setShowKeyboardShortcuts(false)
      }, [])


      

      useEffect(() => {
        if (gameData.progress.length > 0 && gameData.progress.every((item) => item === true)) {
          setIsGameWon(true)
        } else {
          setIsGameWon(false)
        }
      }, [gameData.progress])

      useEffect(() => {
        if (gameData.progress.some((item) => item === true)) {
        }
      }, [gameData.progress])

      const fetchGameData = useCallback(async (nextChallenge = false) => {
        try {
          setIsGameWon(false)
          setSelectedWords([])
          
          const url = nextChallenge ? '/game?next=true' : 'game'
          const response = await fetch(url)
          if (response.status === 202) {
            setIsDailyLimit(true)
            return 
          }
          const data = await response.json()
          console.log("fetch data: ", data)

          setGameData({
            challenge: data.challenge,
            quote: data.quote,
            author: data.author,
            content: data.content,
            attempts: data.attempts,
            progress: data.progress,
          })
          setParagraph(data.content)

          const words = data.content.split(/\s+/)
          const elements = words.map((word: any, index: any) => ({
            id: `word-${index}`,
            text: word,
            originalIndex: index,
            selected: false,
          }))
          setWordElements(elements)
        } catch (error) {
          console.error("Error with game data:", error)
        }
      }, [])

      useEffect(() => {
        console.log("gameData updated: ", gameData)
      }, [gameData])

      useEffect(() => {
        console.log("game data: ", gameData)
        fetchGameData()
      }, [fetchGameData])

      useEffect(() => {
        const words = paragraph.split(/\s+/)
        const elements = words.map((word, index) => ({
          id: `word-${index}`,
          text: word,
          originalIndex: index,
          selected: false,
        }))
        setWordElements(elements)
      }, [paragraph])

      const handleWordClick = useCallback(
        (index: number) => {
          if (selectedWords.length >= MAX_WORDS) {
            return
          }

          const newWordElements = [...wordElements]
          const wordToSelect = newWordElements[index]

          if (!wordToSelect.selected) {
            wordToSelect.selected = true
            setSelectedWords((prev) => [...prev, wordToSelect])
          }

          setWordElements(newWordElements)
        },
        [selectedWords.length, wordElements],
      )

      const handleBubbleClick = useCallback(
        (selectedIndex: number) => {
          setSelectedWords((prev) => prev.filter((_, index) => index !== selectedIndex))

          setWordElements((prev) => {
            const newWordElements = [...prev]
            const wordToDeselect = newWordElements.find((word) => word.id === selectedWords[selectedIndex].id)
            if (wordToDeselect) {
              wordToDeselect.selected = false
            }
            return newWordElements
          })

        },
        [selectedWords],
      )

      const handleDragStart = useCallback((index: number) => {
        setDraggedBubbleIndex(index)
      }, [])

      const handleDragOver = useCallback(
        (e: React.DragEvent, index: number) => {
          e.preventDefault()
          if (draggedBubbleIndex !== null && draggedBubbleIndex !== index) {
            setSelectedWords((prev) => {
              const newSelectedWords = [...prev]
              const draggedWord = newSelectedWords[draggedBubbleIndex]
              newSelectedWords.splice(draggedBubbleIndex, 1)
              newSelectedWords.splice(index, 0, draggedWord)
              return newSelectedWords
            })

            setDraggedBubbleIndex(index)
          }
        },
        [draggedBubbleIndex],
      )

      const handleDragEnd = useCallback(() => {
        setDraggedBubbleIndex(null)
      }, [])

      const handleTouchStart = useCallback(
        (_: React.TouchEvent, index: number) => {
          if (selectedWords.length >= MAX_WORDS) return

          const wordElement = wordElements[index]
          if (wordElement && !wordElement.selected) {
            setIsDragging(true)
            setTouchStartIndex(index)
            setTouchCurrentIndex(index)

            const element = document.querySelector(`[data-index="${index}"]`)
            if (element) {
              element.classList.add("word-selecting")
            }
          }
        },
        [selectedWords.length, wordElements],
      )

      const handleTouchMove = useCallback(
        (e: React.TouchEvent) => {
          if (!isDragging || selectedWords.length >= MAX_WORDS) return

          const touch = e.touches[0]
          const element = document.elementFromPoint(touch.clientX, touch.clientY)

          if (element && element.classList.contains("word-sprite")) {
            const index = Number.parseInt((element as HTMLElement).dataset.index || "-1")

            if (!isNaN(index) && index !== touchCurrentIndex) {
              document.querySelectorAll(".word-selecting").forEach((el) => {
                el.classList.remove("word-selecting")
              })

              const start = Math.min(touchStartIndex!, index)
              const end = Math.max(touchStartIndex!, index)

              for (let i = start; i <= end; i++) {
                const wordEl = document.querySelector(`[data-index="${i}"]`)
                if (wordEl && !wordElements[i].selected) {
                  wordEl.classList.add("word-selecting")
                }
              }

              setTouchCurrentIndex(index)
            }
          }
        },
        [isDragging, selectedWords.length, touchCurrentIndex, touchStartIndex, wordElements],
      )

      const handleTouchEnd = useCallback(() => {
        if (!isDragging) return

        const highlightedElements = document.querySelectorAll(".word-selecting")
        if (highlightedElements.length > 0) {
          const newWordElements = [...wordElements]
          const newSelectedWords = [...selectedWords]

          highlightedElements.forEach((el) => {
            const index = Number.parseInt((el as HTMLElement).dataset.index || "-1")
            if (!isNaN(index) && !newWordElements[index].selected && newSelectedWords.length < MAX_WORDS) {
              newWordElements[index].selected = true
              newSelectedWords.push(newWordElements[index])
            }
            el.classList.remove("word-selecting")
          })

          setWordElements(newWordElements)
          setSelectedWords(newSelectedWords)
        }

        setIsDragging(false)
        setTouchStartIndex(null)
        setTouchCurrentIndex(null)
      }, [isDragging, wordElements, selectedWords])

      const formatDate = () => {
        const date = new Date()
        return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`
      }

      const handleSubmit = useCallback(async () => {
        if (selectedWords.length > 0) {
          const inputString = selectedWords.map((word) => word.text).join(" ")

          try {const response = await fetch('/game', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              input: inputString
            })
          });

          if (response.status === 417) {
            setIsGameOver(true)
            return 
          }
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          if (response.body) {
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
          } else {
            console.warn("response body empty")
          }
            

            setSelectedWords([])

          } catch (error) {
            console.error("Error processing submission:", error)
          } finally {
            fetchGameData()
          }
        }
      }, [selectedWords, paragraph, gameData])

      useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
          if (
            (e.key === " " || e.key === "Enter") &&
            (document.activeElement as HTMLElement).classList.contains("word-sprite")
          ) {
            e.preventDefault()
            const index = Number.parseInt((document.activeElement as HTMLElement).dataset.index || "-1")
            if (!isNaN(index)) {
              handleWordClick(index)
            }
          }

          if (e.key === "Enter" && e.ctrlKey && selectedWords.length > 0) {
            e.preventDefault()
            handleSubmit()
          }

          if (e.key === "Escape" && selectedWords.length > 0) {
            e.preventDefault()
            setSelectedWords([])
            setWordElements((prev) => {
              const newWordElements = [...prev]
              newWordElements.forEach((word) => (word.selected = false))
              return newWordElements
            })
          }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
      }, [selectedWords, wordElements, handleWordClick, handleSubmit])

      return (
        <div
          ref={containerRef}
          className="mx-auto flex flex-col h-screen w-full md:max-w-2xl lg:max-w-4xl relative font-pixel text-gray-800"
          style={{
            backgroundImage: "linear-gradient(to bottom, #264653, #264653)",
          }}
        >
          <div className="scanlines light-scanlines"></div>
          <div className="crt-flicker light-flicker"></div>

          <PixelHeader
            gameData={gameData}
            formatDate={formatDate}
            onShowInstructions={handleShowInstructions}
            onShowKeyboardShortcuts={handleShowKeyboardShortcuts}
          />

          {isGameWon ? (
            <PixelWinScreen onNextChallenge={() => fetchGameData(true)} />
          ) : isGameOevr ?  <GameOverScreen 
              attempts={gameData.attempts} 
              onNextChallenge={() => {
                setIsGameOver(false)
                fetchGameData(true)
              }} 
            />:
              isDailyLimit ? <DailyLimitScreen gamesPlayed={3} /> :
            (
            <>
              <div className="flex-grow flex flex-col md:justify-center md:mt-4 px-4">
                <div className="flex-shrink-0">
                  <div className="pixel-container bg-teal p-4 my-6 h-16 flex items-center">
                    {selectedWords.length > 0 ? (
                      <p className="w-full text-center text-white pixel-text">
                        {selectedWords.map((word) => word.text).join(" ")}
                      </p>
                    ) : (
                      <p className="w-full text-center text-teal-100 pixel-text">Select words from below</p>
                    )}
                  </div>

                  <div className="pb-4 flex flex-wrap gap-2 flex-shrink-0">
                    {selectedWords.map((word, index) => (
                      <div
                        key={`bubble-${word.id}`}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        onTouchStart={(e) => {
                          const touch = e.touches[0]
                          setTouchInfo({
                            index: index,
                            startX: touch.clientX,
                            startY: touch.clientY,
                          })
                        }}
                        onTouchMove={(e) => {
                          if (touchInfo && touchInfo.index === index) {
                            e.preventDefault()
                          }
                        }}
                        onTouchEnd={() => {
                          setTouchInfo(null)
                        }}
                        className="pixel-bubble bg-coral px-3 py-1 text-white cursor-move hover:bg-coral-dark active:bg-coral-darker transition-colors"
                        onClick={() => handleBubbleClick(index)}
                      >
                        {word.text}
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, MAX_WORDS - selectedWords.length) }).map((_, index) => (
                      <div key={`empty-${index}`} className="pixel-bubble-empty bg-teal-dark px-6 py-1"></div>
                    ))}
                  </div>
                </div>

                <div className="pixel-divider mx-4"></div>

                <div className="p-4 overflow-y-auto">
                  <p className="text-white leading-relaxed pixel-text" ref={paragraphRef}>
                    {wordElements.map((wordObj, index) => (
                      <React.Fragment key={wordObj.id}>
                        {index > 0 && " "}
                        <span
                          data-index={index}
                          tabIndex={!wordObj.selected && selectedWords.length < MAX_WORDS ? 0 : -1}
                          className={`
                            ${wordObj.selected ? "text-gray-500" : "text-white"} 
                            ${!wordObj.selected && selectedWords.length >= MAX_WORDS ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:text-yellow focus:text-yellow focus:outline-dashed focus:outline-2 focus:outline-yellow transition-colors"}
                            word-sprite
                          `}
                          onClick={() => !wordObj.selected && selectedWords.length < MAX_WORDS && handleWordClick(index)}
                          onTouchStart={(e) => handleTouchStart(e, index)}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={handleTouchEnd}
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
            <div className="px-4 pb-4 flex justify-end">
              <PixelButton
                className={`p-3 ${
                  selectedWords.length > 0
                    ? "bg-coral hover:bg-coral-dark active:bg-coral-darker text-white cursor-pointer"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-70"
                }`}
                onClick={() => selectedWords.length > 0 && handleSubmit()}
                disabled={selectedWords.length === 0}
                icon={<Send className="w-5 h-5" />}
                text="Send"
              />
            </div>
          )}

          <HowToPlayModal isOpen={showInstructions} onClose={handleCloseInstructions} />
          <KeyboardShortcutsModal isOpen={showKeyboardShortcuts} onClose={handleCloseKeyboardShortcuts} />
          <MobileHelp />
        </div>
      )
    }

    export default PixelWordWeave
