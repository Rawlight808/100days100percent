import { useCallback, useEffect, useRef } from 'react'

const SOUND_FILES = [
  '01_C__04162026.mp3',
  '02_D__04162026.mp3',
  '03_E__04162026.mp3',
  '04_F__04162026.mp3',
  '05_G__04162026.mp3',
  '06_A__04162026.mp3',
  '07_B__04162026.mp3',
  '08_CG__04162026.mp3',
  '09_DA__04162026.mp3',
  '10_EB__04162026.mp3',
  '11_FC__04162026.mp3',
  '12_GD__04162026.mp3',
  '13_AE__04162026.mp3',
  '14_BF#__04162026.mp3',
  '15_C E G__04162026.mp3',
  '16_D F A__04162026.mp3',
  '17_E G B__04162026.mp3',
  '18_F A C__04162026.mp3',
  '19_G B D__04162026.mp3',
  '20_A C E__04162026.mp3',
]

function soundUrl(filename: string): string {
  return `/sounds/${encodeURIComponent(filename)}`
}

function makeAudio(src: string): HTMLAudioElement {
  const audio = new Audio(src)
  audio.preload = 'auto'
  return audio
}

export function useCompletionSound() {
  const cache = useRef<Map<string, HTMLAudioElement>>(new Map())

  useEffect(() => {
    for (const file of SOUND_FILES) {
      const url = soundUrl(file)
      if (!cache.current.has(url)) {
        cache.current.set(url, makeAudio(url))
      }
    }
  }, [])

  const getAudio = useCallback((filename: string) => {
    const url = soundUrl(filename)
    let audio = cache.current.get(url)
    if (!audio) {
      audio = makeAudio(url)
      cache.current.set(url, audio)
    }
    if (!audio.paused && !audio.ended) {
      const fresh = makeAudio(url)
      cache.current.set(url + '_' + Date.now(), fresh)
      return fresh
    }
    audio.currentTime = 0
    return audio
  }, [])

  /**
   * Play the sound for the Nth completion in a session.
   * @param completionIndex - 0-based: how many items were already checked before this one
   * @param total - total number of items in the list
   *
   * The finale sound (index 19) always plays on the last completion;
   * earlier completions walk sounds 0-18 in order.
   */
  const playCheck = useCallback(
    (completionIndex: number, total: number) => {
      const isLast = completionIndex === total - 1
      const soundIdx = isLast
        ? SOUND_FILES.length - 1
        : Math.min(completionIndex, SOUND_FILES.length - 2)
      const audio = getAudio(SOUND_FILES[soundIdx])
      audio.volume = 0.75
      audio.play().catch(() => {})
    },
    [getAudio],
  )

  const playUncheck = useCallback(() => {
    // Silent on uncheck
  }, [])

  const playAllComplete = useCallback(() => {
    // No extra audio: playCheck already played the finale on the last checkbox.
  }, [])

  return { playCheck, playUncheck, playAllComplete }
}
