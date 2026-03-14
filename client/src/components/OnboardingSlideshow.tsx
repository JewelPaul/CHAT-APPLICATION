import { useState } from 'react'
import { Lock, Video, Key, ArrowRight, ChevronLeft, ChevronRight, Shield, MessageCircle } from 'lucide-react'

interface OnboardingSlideshowProps {
  onComplete: () => void
}

interface Slide {
  icon: React.ReactNode
  title: string
  description: string
  accent: string
}

const slides: Slide[] = [
  {
    icon: (
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-pulse" />
        <div className="relative w-16 h-16 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center">
          <Lock className="w-8 h-8 text-[var(--accent)]" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center">
          <MessageCircle className="w-4 h-4 text-green-500" />
        </div>
      </div>
    ),
    title: 'Private Messaging',
    description: 'Your conversations are never stored.\nEverything disappears after the session.',
    accent: 'text-[var(--accent)]',
  },
  {
    icon: (
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-violet-500/10 animate-pulse" />
        <div className="relative w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
          <Video className="w-8 h-8 text-violet-500" />
        </div>
      </div>
    ),
    title: 'Instant Audio & Video Calls',
    description: 'Crystal clear real-time communication.\nNo accounts required.',
    accent: 'text-violet-500',
  },
  {
    icon: (
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-pulse" />
        <div className="relative w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
          <Key className="w-8 h-8 text-amber-500" />
        </div>
        <div className="absolute -top-1 -right-2 w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center">
          <Shield className="w-4 h-4 text-green-500" />
        </div>
      </div>
    ),
    title: 'Invite-Only Chat',
    description: 'Connect using secure invite codes.\nNo phone numbers required.',
    accent: 'text-amber-500',
  },
]

export function OnboardingSlideshow({ onComplete }: OnboardingSlideshowProps) {
  const [current, setCurrent] = useState(0)

  const showCTA = current === slides.length

  const goNext = () => {
    if (current < slides.length) {
      setCurrent(prev => prev + 1)
    }
  }

  const goPrev = () => {
    if (current > 0) {
      setCurrent(prev => prev - 1)
    }
  }

  const goTo = (idx: number) => setCurrent(idx)

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle animated gradient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[var(--accent)]/5 blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-violet-500/5 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Skip button */}
      {!showCTA && (
        <button
          onClick={onComplete}
          className="absolute top-6 right-6 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors px-3 py-1 rounded-lg hover:bg-[var(--bg-secondary)]"
        >
          Skip
        </button>
      )}

      {/* Branding */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Zion Chat</h1>
      </div>

      {/* Slide content */}
      <div className="w-full max-w-sm space-y-8">
        {!showCTA ? (
          <div className="text-center space-y-6 animate-enter">
            {/* Icon */}
            <div className="flex justify-center">
              {slides[current].icon}
            </div>

            {/* Text */}
            <div className="space-y-3">
              <h2 className={`text-2xl font-bold ${slides[current].accent}`}>
                {slides[current].title}
              </h2>
              <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                {slides[current].description}
              </p>
            </div>

            {/* Nav row */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={goPrev}
                disabled={current === 0}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Dots */}
              <div className="flex gap-2 items-center">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={`rounded-full transition-all ${
                      i === current
                        ? 'w-6 h-2 bg-[var(--accent)]'
                        : 'w-2 h-2 bg-[var(--border)] hover:bg-[var(--text-muted)]'
                    }`}
                  />
                ))}
                {/* Last dot for CTA slide */}
                <button
                  onClick={() => goTo(slides.length)}
                  className={`rounded-full transition-all ${
                    showCTA
                      ? 'w-6 h-2 bg-[var(--accent)]'
                      : 'w-2 h-2 bg-[var(--border)] hover:bg-[var(--text-muted)]'
                  }`}
                />
              </div>

              <button
                onClick={goNext}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-secondary)] transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          // CTA Slide
          <div className="text-center space-y-6 animate-enter">
            <div className="flex justify-center">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[var(--accent)]/10 animate-pulse" />
                <div className="w-16 h-16 rounded-2xl bg-[var(--accent)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/20">
                  <ArrowRight className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Ready to Start?</h2>
              <p className="text-[var(--text-secondary)]">
                Your privacy-first chat experience awaits.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={onComplete}
                className="w-full btn btn-primary py-3 text-base font-semibold rounded-2xl"
              >
                Start Chat
              </button>
              <button
                onClick={onComplete}
                className="w-full btn btn-secondary py-3 text-base rounded-2xl"
              >
                Skip
              </button>
            </div>

            {/* Back arrow */}
            <button
              onClick={goPrev}
              className="flex items-center gap-1 mx-auto text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
