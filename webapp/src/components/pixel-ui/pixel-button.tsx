"use client"

import type React from "react"

interface PixelButtonProps {
  onClick: (e?: React.MouseEvent) => void
  className?: string
  disabled?: boolean
  text?: string
  icon?: React.ReactNode
}

export const PixelButton: React.FC<PixelButtonProps> = ({ onClick, className = "", disabled = false, text, icon }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`pixel-button ${className} ${disabled ? "opacity-50 cursor-not-allowed" : "hover:brightness-110 active:brightness-90"}`}
    >
      {icon && <span className="pixel-icon">{icon}</span>}
      {text && <span className="pixel-text">{text}</span>}
    </button>
  )
}
