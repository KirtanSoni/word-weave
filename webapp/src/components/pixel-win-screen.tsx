"use client"

import { useEffect, useState } from "react"
import { PixelButton } from "./pixel-ui/pixel-button"
import Confetti from "./pixel-ui/confetti"

interface PixelWinScreenProps {
  onNextChallenge: () => void
}

const PixelWinScreen = ({ onNextChallenge }: PixelWinScreenProps) => {
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(true)
    }, 300)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center relative">
      {showConfetti && <Confetti />}

      <div className="pixel-container bg-teal-dark p-8 max-w-md w-full">
        <h2 className="text-3xl font-bold text-yellow mb-4 pixel-text arcade-title victory-pulse">YOU WIN!</h2>
        <div className="pixel-trophy mb-6"></div>
        <p className="mb-6 text-white pixel-text">Congratulations! You've completed this challenge.</p>
        <PixelButton
          onClick={onNextChallenge}
          className="bg-coral hover:bg-coral-dark active:bg-coral-darker text-white font-bold py-2 px-6 mx-auto"
          text="Next Challenge"
        />
      </div>
    </div>
  )
}

export default PixelWinScreen
