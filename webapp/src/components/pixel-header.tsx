"use client"

import { PixelButton } from "./pixel-ui/pixel-button"
import { Info, Keyboard } from "lucide-react"
import type { GameData } from "../types"

interface PixelHeaderProps {
  gameData: GameData
  formatDate: () => string
  onShowInstructions: () => void
  onShowKeyboardShortcuts: () => void
}

const PixelHeader = ({ gameData, formatDate, onShowInstructions, onShowKeyboardShortcuts }: PixelHeaderProps) => {
  return (
    <>
      <div className="md:hidden bg-teal-dark text-white sticky top-0 z-10 flex-shrink-0 pixel-container">
        <div className="p-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-yellow pixel-text arcade-title">WordWeave</h1>
            <p className="text-sm text-teal-light pixel-text">{formatDate()}</p>
          </div>
          <div className="flex space-x-2">
            <PixelButton
              className="text-teal-light hover:text-yellow"
              onClick={onShowKeyboardShortcuts}
              icon={<Keyboard className="w-5 h-5" />}
            />
            <PixelButton
              className="text-teal-light hover:text-yellow"
              onClick={onShowInstructions}
              icon={<Info className="w-5 h-5" />}
            />
          </div>
          <div className="pixel-counter">
            <span className="text-coral pixel-text">Attempts: {gameData.attempts}</span>
          </div>
        </div>
        <div className="p-6 text-center font-bold">
          <h2 className="text-2xl pixel-text">
            <span className="text-yellow">"</span>
            {gameData.quote?.split(/\s+/).map((word, index) => (
              <span
                key={index}
                className={`
                  ${gameData.progress[index] ? "text-teal-light glow-text-light" : "text-white"}
                  ${index ? "first-letter:text-yellow first-letter:text-4xl first-letter:mr-1" : ""}
                  word-match-animation
                `}
              >
                {index > 0 && " "}
                {word}
              </span>
            ))}
            <span className="text-yellow">"</span>
          </h2>
          {gameData.author && <p className="text-sm mt-2 text-teal-light pixel-text">— {gameData.author}</p>}
        </div>
      </div>

      <div className="hidden md:block bg-teal-dark text-white z-10 flex-shrink-0 pixel-container mt-4">
        <div className="p-4 flex items-center">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-yellow pixel-text arcade-title">
              <span className="arcade-decoration">★</span> WordWeave <span className="arcade-decoration">★</span>
            </h1>
            <p className="text-sm text-teal-light pixel-text">{formatDate()}</p>
          </div>
          <div className="flex flex-col items-end p-2">
            <div className="flex space-x-2">
              <PixelButton
                className="text-teal-light hover:text-yellow flex items-center"
                onClick={onShowKeyboardShortcuts}
                icon={<Keyboard className="w-4 h-4 mr-1" />}
                text="Keyboard"
              />
              <PixelButton
                className="text-teal-light hover:text-yellow flex items-center"
                onClick={onShowInstructions}
                icon={<Info className="w-4 h-4 mr-1" />}
                text="How to Play"
              />
            </div>
            <div className="pixel-counter mt-2">
              <span className="text-coral pixel-text">Attempts: {gameData.attempts}</span>
            </div>
          </div>
        </div>
        <div className="p-6 text-center font-bold">
          <h2 className="text-3xl pixel-text">
            <span className="text-yellow">"</span>
            {gameData.quote?.split(/\s+/).map((word, index) => (
              <span
                key={index}
                className={`
                  ${gameData.progress[index] ? "text-teal-light glow-text-light" : "text-white"}
                  ${index ? "first-letter:text-yellow first-letter:text-4xl first-letter:mr-1" : ""}
                  word-match-animation
                `}
              >
                {index > 0 && " "}
                {word}
              </span>
            ))}
            <span className="text-yellow">"</span>
          </h2>
          {gameData.author && <p className="text-sm mt-2 text-teal-light pixel-text">— {gameData.author}</p>}
        </div>
      </div>
    </>
  )
}

export default PixelHeader
