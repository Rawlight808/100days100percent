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

/**
 * Sound playback strategy:
 *
 * - For each file, keep ONE master Audio element with preload="auto" so the
 *   browser fetches and decodes the bytes up front.
 * - On each play, clone the master element. Clones inherit the resolved src
 *   and (in all modern browsers) the cached network response, so they start
 *   playing without re-fetching. This lets rapid repeat clicks overlap
 *   instead of re-triggering or dropping the sound.
 * - Fire-and-forget clones are discarded after playback so we don't grow
 *   memory unboundedly.
 */
function createMaster(src: string): HTMLAudioElement {
  const audio = new Audio(src)
  audio.preload = 'auto'
  // Touch .load() so Safari reliably starts fetching before the first click.
  audio.load()
  return audio
}

export function useCompletionSound() {
  const masters = useRef<Map<string, HTMLAudioElement>>(new Map())

  useEffect(() => {
    for (const file of SOUND_FILES) {
      const url = soundUrl(file)
      if (!masters.current.has(url)) {
        masters.current.set(url, createMaster(url))
      }
    }
  }, [])

  const playFile = useCallback((filename: string, volume = 0.75) => {
    const url = soundUrl(filename)
    let master = masters.current.get(url)
    if (!master) {
      master = createMaster(url)
      masters.current.set(url, master)
    }
    const instance = master.cloneNode() as HTMLAudioElement
    instance.volume = volume
    const result = instance.play()
    if (result && typeof result.catch === 'function') {
      result.catch(() => {
        // Autoplay policy, interrupted playback, or 404 for a stale bundle —
        // swallow silently; the UI still reflects the check.
      })
    }
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
      playFile(SOUND_FILES[soundIdx])
    },
    [playFile],
  )

  const playUncheck = useCallback(() => {
    // Silent on uncheck
  }, [])

  const playAllComplete = useCallback(() => {
    // No extra audio: playCheck already played the finale on the last checkbox.
  }, [])

  return { playCheck, playUncheck, playAllComplete }
}
