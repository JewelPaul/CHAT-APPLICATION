import { useState, useRef, useEffect } from 'react'
import { Play, Pause } from 'lucide-react'

interface AudioMessageProps {
  src: string
  filename?: string
  duration?: number
}

export function AudioMessage({ src, filename, duration }: AudioMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(duration || 0)
  const audioRef = useRef<HTMLAudioElement>(null)

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
          {/* Waveform visualization (simplified) */}
          <div className="flex items-center gap-0.5 h-full">
            {Array.from({ length: 20 }).map((_, i) => {
              const height = Math.random() * 60 + 40
              const isPast = (i / 20) * 100 < progress
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
