"use client"

import { useEffect, useState } from "react"
import { Trophy } from "lucide-react"

interface DailyLimitScreenProps {
  gamesPlayed: number
}

const DailyLimitScreen = ({ gamesPlayed }: DailyLimitScreenProps) => {
  const [animationClass, setAnimationClass] = useState("")

  useEffect(() => {
    setAnimationClass("modal-enter")
  }, [])

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center relative">
      <div className={`pixel-container bg-teal-dark p-8 max-w-md w-full ${animationClass}`}>
        <div className="pixel-trophy-large mb-6"></div>

        <h2 className="text-3xl font-bold text-yellow mb-4 pixel-text arcade-title victory-pulse">DAILY COMPLETE!</h2>

        <div className="pixel-container bg-yellow p-4 mb-6">
          <p className="text-teal-dark pixel-text text-lg font-bold">
            <Trophy className="w-5 h-5 inline mr-2" />
            {gamesPlayed}/3 Games Played
          </p>
          <p className="text-teal-dark pixel-text text-sm mt-1">Outstanding work today!</p>
        </div>

        <p className="mb-6 text-white pixel-text">
          You've mastered today's word challenges! Return tomorrow for fresh puzzles and new adventures.
        </p>
          <p className="text-teal-light pixel-text text-sm">Come back tomorrow for 3 new challenges!</p>

        <div className="mt-6 flex justify-center space-x-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full ${i < gamesPlayed ? "bg-yellow" : "bg-teal-light opacity-30"}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default DailyLimitScreen
