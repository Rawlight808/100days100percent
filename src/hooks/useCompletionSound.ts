import { useCallback, useRef } from 'react'

function preload(src: string): HTMLAudioElement {
  const audio = new Audio(src)
  audio.preload = 'auto'
  return audio
}

export function useCompletionSound() {
  const checkPool = useRef<HTMLAudioElement[]>([])
  const fanfareRef = useRef<HTMLAudioElement | null>(null)

  const getCheckAudio = useCallback(() => {
    if (checkPool.current.length === 0) {
      for (let i = 0; i < 4; i++) {
        checkPool.current.push(preload('/sounds/cash-register.wav'))
      }
    }
    const available = checkPool.current.find(a => a.paused || a.ended)
    if (available) {
      available.currentTime = 0
      return available
    }
    const fresh = preload('/sounds/cash-register.wav')
    checkPool.current.push(fresh)
    return fresh
  }, [])

  const playCheck = useCallback(() => {
    const audio = getCheckAudio()
    audio.volume = 0.7
    audio.playbackRate = 0.95 + Math.random() * 0.1
    audio.play().catch(() => {})
  }, [getCheckAudio])

  const playUncheck = useCallback(() => {
    // Silent on uncheck
  }, [])

  const playAllComplete = useCallback(() => {
    if (!fanfareRef.current) {
      fanfareRef.current = preload('/sounds/fanfare.wav')
    }
    const audio = fanfareRef.current
    audio.currentTime = 0
    audio.volume = 0.8
    audio.play().catch(() => {})
  }, [])

  return { playCheck, playUncheck, playAllComplete }
}
