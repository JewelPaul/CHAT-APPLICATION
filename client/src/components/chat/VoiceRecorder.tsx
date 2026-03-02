import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, Send, X } from 'lucide-react'

const MAX_RECORDING_SECONDS = 60

interface VoiceRecorderProps {
  onSend: (blob: Blob) => void
  disabled?: boolean
}

export function VoiceRecorder({ onSend, disabled = false }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopRecording = useCallback((send: boolean) => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    const recorder = mediaRecorderRef.current
    if (!recorder) return

    if (send) {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        onSend(blob)
        chunksRef.current = []
      }
    } else {
      recorder.onstop = () => {
        chunksRef.current = []
      }
    }

    if (recorder.state !== 'inactive') {
      recorder.stop()
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }

    mediaRecorderRef.current = null
    setIsRecording(false)
    setElapsed(0)
  }, [onSend])

  // Auto-stop at 60 seconds
  useEffect(() => {
    if (elapsed >= MAX_RECORDING_SECONDS) {
      stopRecording(true)
    }
  }, [elapsed, stopRecording])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream

      // Prefer audio/webm; fall back to default
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : ''

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      setElapsed(0)

      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Microphone access denied:', err)
    }
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (!isRecording) {
    return (
      <button
        onClick={startRecording}
        disabled={disabled}
        className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Record voice message"
      >
        <Mic className="w-5 h-5 text-[var(--text-secondary)] hover:text-[var(--accent)]" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--error)]/40">
      {/* Red pulsing dot */}
      <span className="w-2.5 h-2.5 rounded-full bg-[var(--error)] animate-pulse flex-shrink-0" />

      {/* Timer */}
      <span className="text-sm font-mono text-[var(--error)] min-w-[40px]">
        {formatTime(elapsed)}
      </span>

      <span className="text-xs text-[var(--text-secondary)] flex-1">
        Recording...
      </span>

      {/* Cancel */}
      <button
        onClick={() => stopRecording(false)}
        className="p-1.5 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
        title="Cancel recording"
      >
        <X className="w-4 h-4 text-[var(--text-secondary)]" />
      </button>

      {/* Stop & Send */}
      <button
        onClick={() => stopRecording(true)}
        className="p-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg transition-colors"
        title="Send voice message"
      >
        <Send className="w-4 h-4 text-white" />
      </button>
    </div>
  )
}
