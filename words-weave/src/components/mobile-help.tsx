"use client"

import { useState, useEffect } from "react"
import { PixelButton } from "./pixel-ui/pixel-button"
import { HelpCircle, X } from "lucide-react"

const MobileHelp = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    if (window.innerWidth < 768 && !localStorage.getItem("wordweave-mobile-help-seen")) {
      setIsOpen(true)
      localStorage.setItem("wordweave-mobile-help-seen", "true")
    }

    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  if (!isMobile) return null

  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-4 right-4 z-50">
          <PixelButton
            onClick={() => setIsOpen(true)}
            className="bg-teal text-white hover:bg-teal-light"
            icon={<HelpCircle className="w-5 h-5" />}
          />
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="pixel-container bg-teal-dark p-5 max-w-xs w-full">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-yellow font-bold pixel-text">Mobile Tips</h3>
              <PixelButton onClick={() => setIsOpen(false)} className="text-coral" icon={<X className="w-5 h-5" />} />
            </div>

            <ul className="space-y-3 text-sm text-white">
              <li className="flex items-start">
                <span className="text-yellow mr-2">•</span>
                <span>Tap words in the paragraph to select them</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow mr-2">•</span>
                <span>Tap selected words to remove them</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow mr-2">•</span>
                <span>The Send button is at the bottom of your selections</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow mr-2">•</span>
                <span>Rotate your device for a better experience</span>
              </li>
            </ul>

            <PixelButton
              onClick={() => setIsOpen(false)}
              className="mt-4 bg-coral text-white hover:bg-coral-dark w-full"
              text="Got it!"
            />
          </div>
        </div>
      )}
    </>
  )
}

export default MobileHelp
