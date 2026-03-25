import { useCallback, useRef } from 'react'

export function useCompletionSound() {
  const ctxRef = useRef<AudioContext | null>(null)

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume()
    }
    return ctxRef.current
  }, [])

  const playNoise = useCallback(
    (ctx: AudioContext, time: number, duration: number, volume: number) => {
      const bufferSize = ctx.sampleRate * duration
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5
      }
      const source = ctx.createBufferSource()
      source.buffer = buffer
      const bandpass = ctx.createBiquadFilter()
      bandpass.type = 'bandpass'
      bandpass.frequency.value = 6000
      bandpass.Q.value = 1.2
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(volume, time)
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration)
      source.connect(bandpass)
      bandpass.connect(gain)
      gain.connect(ctx.destination)
      source.start(time)
      source.stop(time + duration)
    },
    [],
  )

  const playCheck = useCallback(() => {
    const ctx = getCtx()
    const now = ctx.currentTime
    const pitchOffset = (Math.random() - 0.5) * 30

    playNoise(ctx, now, 0.04, 0.18)

    const chimeNotes = [1318.5 + pitchOffset, 1568.0 + pitchOffset, 2093.0 + pitchOffset]
    chimeNotes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.connect(gain)
      gain.connect(ctx.destination)
      const t = now + 0.025 + i * 0.055
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.22, t + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
      osc.start(t)
      osc.stop(t + 0.22)
    })

    const bell = ctx.createOscillator()
    const bellGain = ctx.createGain()
    bell.type = 'triangle'
    bell.frequency.value = 2637 + pitchOffset
    bell.connect(bellGain)
    bellGain.connect(ctx.destination)
    const bellT = now + 0.17
    bellGain.gain.setValueAtTime(0, bellT)
    bellGain.gain.linearRampToValueAtTime(0.15, bellT + 0.01)
    bellGain.gain.exponentialRampToValueAtTime(0.001, bellT + 0.25)
    bell.start(bellT)
    bell.stop(bellT + 0.3)
  }, [getCtx, playNoise])

  const playUncheck = useCallback(() => {
    // Silent on uncheck
  }, [])

  const playAllComplete = useCallback(() => {
    const ctx = getCtx()
    const now = ctx.currentTime

    playNoise(ctx, now, 0.06, 0.2)

    const fanfare = [1318.5, 1568.0, 2093.0, 2637.0, 3136.0]
    fanfare.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = i < 3 ? 'sine' : 'triangle'
      osc.frequency.value = freq
      osc.connect(gain)
      gain.connect(ctx.destination)
      const t = now + 0.04 + i * 0.08
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.2, t + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45)
      osc.start(t)
      osc.stop(t + 0.5)
    })

    const shimmer = ctx.createOscillator()
    const shimmerGain = ctx.createGain()
    shimmer.type = 'sine'
    shimmer.frequency.value = 4186
    shimmer.connect(shimmerGain)
    shimmerGain.connect(ctx.destination)
    const sT = now + 0.42
    shimmerGain.gain.setValueAtTime(0, sT)
    shimmerGain.gain.linearRampToValueAtTime(0.12, sT + 0.02)
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, sT + 0.6)
    shimmer.start(sT)
    shimmer.stop(sT + 0.65)
  }, [getCtx, playNoise])

  return { playCheck, playUncheck, playAllComplete }
}
