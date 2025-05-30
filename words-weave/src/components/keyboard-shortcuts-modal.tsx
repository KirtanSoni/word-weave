"use client"

import type React from "react"
import { useCallback, useRef } from "react"
import { PixelButton } from "./pixel-ui/pixel-button"
import { X } from "lucide-react"

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

const KeyboardShortcutsModal = ({ isOpen, onClose }: KeyboardShortcutsModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null)

  const handleClose = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation()
      }
      
      if (modalRef.current) {
        modalRef.current.classList.add('modal-exiting')
        
        setTimeout(() => {
          onClose()
        }, 300)
      } else {
        onClose()
      }
    },
    [onClose],
  )

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  if (!isOpen) return null

  return (
    <>
    
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 modal-backdrop"
      onClick={handleClose}
    >
      <div
        ref={modalRef}
        className="pixel-container bg-teal-dark p-6 max-w-md w-full modal-content"
        onClick={handleContentClick}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-yellow pixel-text arcade-title">Keyboard Controls</h3>
          <PixelButton
            onClick={handleClose}
            className="text-coral hover:text-coral-light"
            icon={<X className="w-5 h-5" />}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="pixel-container bg-teal p-3">
            <div className="text-yellow text-center mb-2 pixel-text">Navigation</div>
            <div className="flex justify-center mb-2">
              <div className="pixel-key">Tab</div>
            </div>
            <p className="text-white text-center text-sm">Move between words</p>
          </div>

          <div className="pixel-container bg-teal p-3">
            <div className="text-yellow text-center mb-2 pixel-text">Selection</div>
            <div className="flex justify-center space-x-2 mb-2">
              <div className="pixel-key">Space</div>
              <div className="pixel-key">Enter</div>
            </div>
            <p className="text-white text-center text-sm">Select focused word</p>
          </div>

          <div className="pixel-container bg-teal p-3">
            <div className="text-yellow text-center mb-2 pixel-text">Submit</div>
            <div className="flex justify-center space-x-1 mb-2">
              <div className="pixel-key">Ctrl</div>
              <div className="pixel-key-plus">+</div>
              <div className="pixel-key">Enter</div>
            </div>
            <p className="text-white text-center text-sm">Submit your prompt</p>
          </div>

          <div className="pixel-container bg-teal p-3">
            <div className="text-yellow text-center mb-2 pixel-text">Clear</div>
            <div className="flex justify-center mb-2">
              <div className="pixel-key">Esc</div>
            </div>
            <p className="text-white text-center text-sm">Clear all selections</p>
          </div>
        </div>

        <div className="text-center">
          <PixelButton
            onClick={handleClose}
            className="bg-coral hover:bg-coral-dark text-white px-6 py-2 mx-auto"
            text="Got it!"
          />
        </div>
      </div>
    </div>

    <style>{`
      .modal-backdrop {
        animation: fadeIn 0.3s ease-out;
      }

      .modal-content {
        animation: modalEnter 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        transform-origin: center;
      }

      .modal-exiting .modal-backdrop {
        animation: fadeOut 0.3s ease-in forwards;
      }

      .modal-exiting .modal-content {
        animation: modalExit 0.3s ease-in forwards;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes fadeOut {
        from {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }

      @keyframes modalEnter {
        from {
          opacity: 0;
          transform: scale(0.8) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      @keyframes modalExit {
        from {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
        to {
          opacity: 0;
          transform: scale(0.9) translateY(10px);
        }
      }
    `}</style>
    </>
  )
}

export default KeyboardShortcutsModal