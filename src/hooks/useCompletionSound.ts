import { useCallback, useRef } from 'react'

/** Files in public/sounds/ — encode for spaces / case in URLs */
const ITEM_CHECK_SRC = `/sounds/${encodeURIComponent('ITEM CHECK.mp3')}`
const ITEM_COMPLETE_SRC = `/sounds/${encodeURIComponent('ITEM COMPLETE.mp3')}`

function preload(src: string): HTMLAudioElement {
  const audio = new Audio(src)
  audio.preload = 'auto'
  return audio
}

export function useCompletionSound() {
  const checkPool = useRef<HTMLAudioElement[]>([])
  const completeRef = useRef<HTMLAudioElement | null>(null)

  const getCheckAudio = useCallback(() => {
    if (checkPool.current.length === 0) {
      for (let i = 0; i < 4; i++) {
        checkPool.current.push(preload(ITEM_CHECK_SRC))
      }
    }
    const available = checkPool.current.find(a => a.paused || a.ended)
    if (available) {
      available.currentTime = 0
      return available
    }
    const fresh = preload(ITEM_CHECK_SRC)
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
    if (!completeRef.current) {
      completeRef.current = preload(ITEM_COMPLETE_SRC)
    }
    const audio = completeRef.current
    audio.currentTime = 0
    audio.volume = 0.8
    audio.play().catch(() => {})
  }, [])

  return { playCheck, playUncheck, playAllComplete }
}
