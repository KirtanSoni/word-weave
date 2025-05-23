"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { PixelButton } from "./pixel-ui/pixel-button"
import { X, ChevronLeft, ChevronRight } from "lucide-react"

interface HowToPlayModalProps {
  isOpen: boolean
  onClose: () => void
}

interface TutorialStep {
  title: string
  description: string
  image: string
}

const HowToPlayModal = ({ isOpen, onClose }: HowToPlayModalProps) => {
  const [animationClass, setAnimationClass] = useState("")
  const [currentStep, setCurrentStep] = useState(0)

  const steps: TutorialStep[] = [
    {
      title: "Welcome to WordWeave!",
      description: "A word-matching puzzle game where you craft AI prompts to match quote words.",
      image: "welcome",
    },
    {
      title: "Step 1: Select Words",
      description: "Tap or drag across words in the paragraph to build your prompt.",
      image: "select",
    },
    {
      title: "Step 2: Submit Prompt",
      description: "Hit the SEND button to generate a new paragraph with your selected words.",
      image: "submit",
    },
    {
      title: "Step 3: Match Words",
      description: "Words from the quote will light up when they appear in your generated text!",
      image: "match",
    },
    {
      title: "Win the Game!",
      description: "Match all words in the quote to win and advance to the next challenge.",
      image: "win",
    },
  ]

  const handleClose = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation()
      }
      setAnimationClass("modal-exit")

      setTimeout(() => {
        onClose()
      }, 300)
    },
    [onClose],
  )

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  const nextStep = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation()

      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1)
      } else {
        handleClose(e)
      }
    },
    [currentStep, steps.length, handleClose],
  )

  const prevStep = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation()

      if (currentStep > 0) {
        setCurrentStep(currentStep - 1)
      }
    },
    [currentStep],
  )

  useEffect(() => {
    if (isOpen) {
      setAnimationClass("modal-enter")
      setCurrentStep(0)
    }
  }, [isOpen])

  if (!isOpen) return null

  const step = steps[currentStep]

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className={`pixel-container bg-teal-dark p-6 max-w-md w-full ${animationClass}`}
        onClick={handleContentClick}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-yellow pixel-text arcade-title">{step.title}</h3>
          <PixelButton
            onClick={handleClose}
            className="text-coral hover:text-coral-light"
            icon={<X className="w-5 h-5" />}
          />
        </div>

        <div className="pixel-container bg-teal p-4 mb-4">
          <div className={`tutorial-image tutorial-${step.image} h-40 flex items-center justify-center`}>
            <div className="pixel-animation"></div>
          </div>
        </div>

        <p className="text-white mb-6 text-center pixel-text">{step.description}</p>

        <div className="flex justify-between items-center">
          <PixelButton
            onClick={prevStep}
            className={`${currentStep === 0 ? "invisible" : ""} bg-teal hover:bg-teal-light text-white`}
            icon={<ChevronLeft className="w-5 h-5" />}
          />

          <div className="flex space-x-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${index === currentStep ? "bg-yellow" : "bg-teal-light"}`}
              ></div>
            ))}
          </div>

          <PixelButton
            onClick={nextStep}
            className="bg-coral hover:bg-coral-dark text-white"
            icon={currentStep === steps.length - 1 ? null : <ChevronRight className="w-5 h-5" />}
            text={currentStep === steps.length - 1 ? "Start Playing!" : ""}
          />
        </div>
      </div>
    </div>
  )
}

export default HowToPlayModal
