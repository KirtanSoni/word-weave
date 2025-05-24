export interface GameData {
  challenge: number
  quote: string
  author: string
  content: string
  attempts: number
  progress: boolean[]
}

export interface WordElement {
  id: string
  text: string
  originalIndex: number
  selected: boolean
}
