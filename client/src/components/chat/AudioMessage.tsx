import { useState, useRef, useEffect, useMemo } from 'react'
import { Play, Pause } from 'lucide-react'

interface AudioMessageProps {
  src: string
  filename?: string
  duration?: number
}

const WAVEFORM_BARS = 20
const WAVEFORM_SEED_MULTIPLIER = 0.5
const WAVEFORM_HASH_SCALE = 10000
const WAVEFORM_HEIGHT_MIN = 40
const WAVEFORM_HEIGHT_RANGE = 60

export function AudioMessage({ src, filename, duration }: AudioMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(duration || 0)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Generate deterministic waveform heights based on filename
  // This prevents flickering by ensuring the same heights are generated on each render
  const waveformHeights = useMemo(() => {
    const seed = filename || src
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i)
      hash = hash & hash
    }
    
    return Array.from({ length: WAVEFORM_BARS }).map((_, i) => {
      const x = Math.sin(hash + i * WAVEFORM_SEED_MULTIPLIER) * WAVEFORM_HASH_SCALE
      const normalized = (x - Math.floor(x))
      return normalized * WAVEFORM_HEIGHT_RANGE + WAVEFORM_HEIGHT_MIN
    })
  }, [filename, src])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0

  return (
    <div className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded-xl min-w-[240px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      
      <button
        onClick={togglePlay}
        className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] flex items-center justify-center transition-colors"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 text-white" fill="white" />
        ) : (
          <Play className="w-5 h-5 text-white" fill="white" />
        )}
      </button>

      <div className="flex-1">
        <div className="relative h-8 flex items-center">
          {/* Waveform visualization (deterministic) */}
          <div className="flex items-center gap-0.5 h-full">
            {waveformHeights.map((height, i) => {
              const isPast = (i / WAVEFORM_BARS) * 100 < progress
              return (
                <div
                  key={i}
                  className="w-1 rounded-full transition-all"
                  style={{
                    height: `${height}%`,
                    backgroundColor: isPast ? 'var(--accent)' : 'var(--text-tertiary)'
                  }}
                />
              )
            })}
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-[var(--text-secondary)]">
            {filename || 'Voice message'}
          </span>
          <span className="text-xs text-[var(--text-secondary)]">
            {formatTime(currentTime)} / {formatTime(audioDuration)}
          </span>
        </div>
      </div>
    </div>
  )
}
