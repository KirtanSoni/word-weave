"use client"

import { useEffect, useState } from "react"
import { PixelButton } from "./pixel-ui/pixel-button"
import { SkipForward } from "lucide-react"

interface GameOverScreenProps {
  attempts: number
  onNextChallenge: () => void
}

const GameOverScreen = ({ attempts, onNextChallenge }: GameOverScreenProps) => {
  const [animationClass, setAnimationClass] = useState("")

  useEffect(() => {
    setAnimationClass("modal-enter")
  }, [])

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center relative">
      <div className={`pixel-container bg-teal-dark p-8 max-w-md w-full ${animationClass}`}>
        <div className="pixel-skull mb-6"></div>
        <h2 className="text-3xl font-bold text-coral mb-4 pixel-text arcade-title game-over-pulse">GAME OVER</h2>

        <div className="pixel-container bg-coral p-4 mb-6">
          <p className="text-white pixel-text text-lg font-bold">Maximum attempts reached!</p>
          <p className="text-white pixel-text text-sm mt-2">You used all {attempts} attempts</p>
        </div>

        <p className="mb-6 text-white pixel-text">Don't give up! Every puzzle is a chance to learn something new.</p>

        <div className="flex justify-center">
          <PixelButton
            onClick={onNextChallenge}
            className="bg-yellow hover:bg-orange text-teal-dark font-bold py-2 px-4"
            icon={<SkipForward className="w-5 h-5 mr-2" />}
            text="Next Challenge"
          />
        </div>
      </div>
    </div>
  )
}

export default GameOverScreen