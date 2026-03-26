import { useCallback, useRef } from 'react'

const SOUND_FILES = [
  '01_C__03252026.wav',
  '02_D__03252026.wav',
  '03_E__03252026.wav',
  '04_F__03252026.wav',
  '05_G__03252026.wav',
  '06_A__03252026.wav',
  '07_B__03252026.wav',
  '08_CG__03252026.wav',
  '09_DA__03252026.wav',
  '10_EB__03252026.wav',
  '11_FC__03252026.wav',
  '12_GD__03252026.wav',
  '13_AE__03252026.wav',
  '14_BF#__03252026.wav',
  '15_C E G__03252026.wav',
  '16_D F A__03252026.wav',
  '17_E G B__03252026.wav',
  '18_F A C__03252026.wav',
  '19_G B D__03252026.wav',
  '20_A C E__03252026.wav',
]

function soundUrl(filename: string): string {
  return `/sounds/${encodeURIComponent(filename)}`
}

function preload(src: string): HTMLAudioElement {
  const audio = new Audio(src)
  audio.preload = 'auto'
  return audio
}

export function useCompletionSound() {
  const cache = useRef<Map<string, HTMLAudioElement>>(new Map())

  const getAudio = useCallback((filename: string) => {
    const url = soundUrl(filename)
    let audio = cache.current.get(url)
    if (!audio) {
      audio = preload(url)
      cache.current.set(url, audio)
    }
    if (!audio.paused && !audio.ended) {
      const fresh = preload(url)
      cache.current.set(url + '_' + Date.now(), fresh)
      return fresh
    }
    audio.currentTime = 0
    return audio
  }, [])

  /**
   * Play the sound for a specific checklist position.
   * @param index - 0-based position of the item being checked
   * @param total - total number of items in the list
   *
   * Sound 20 is always reserved for the last item.
   * Sounds 1-19 are distributed evenly across the remaining items.
   */
  const playCheck = useCallback(
    (index: number, total: number) => {
      // Play sound 20 for the final item, otherwise play sequentially (1, 2, 3…)
      const soundIdx = index === total - 1 ? 19 : index
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
    const audio = getAudio(SOUND_FILES[19])
    audio.volume = 0.85
    audio.play().catch(() => {})
  }, [getAudio])

  return { playCheck, playUncheck, playAllComplete }
}
