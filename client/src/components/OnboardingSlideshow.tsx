import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface OnboardingSlideshowProps {
  onComplete: () => void
}

interface Slide {
  image: string
  title: string
  description: string
  accent: string
}

const slides: Slide[] = [
  {
    image: '/assets/onboarding/slide1.svg',
    title: 'Private Messaging',
    description:
      'Your conversations are never stored.\nMessages disappear when the session ends.',
    accent: 'text-blue-400',
  },
  {
    image: '/assets/onboarding/slide2.svg',
    title: 'Audio & Video Calls',
    description: 'Crystal clear communication\nwith real-time encrypted calls.',
    accent: 'text-violet-400',
  },
  {
    image: '/assets/onboarding/slide3.svg',
    title: 'Invite-Only Chat',
    description: 'Connect securely using private invite codes.\nNo phone numbers required.',
    accent: 'text-amber-400',
  },
  {
    image: '/assets/onboarding/slide4.svg',
    title: 'Ready to Start?',
    description: 'Enter Zion Chat and start secure conversations.',
    accent: 'text-blue-400',
  },
]

export function OnboardingSlideshow({ onComplete }: OnboardingSlideshowProps) {
  const [current, setCurrent] = useState(0)

  const isLast = current === slides.length - 1

  const goNext = () => {
    if (current < slides.length - 1) {
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
    <div className="min-h-screen bg-[#0f172a] dark:bg-[#0f172a] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-blue-600/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-violet-600/5 blur-3xl" />
      </div>

      {/* Branding */}
      <div className="mb-4 sm:mb-6 text-center relative z-10">
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">✦ Zion Chat</h1>
      </div>

      {/* Slide card */}
      <div className="relative z-10 w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
        <div
          className="rounded-2xl bg-[#1e293b] border border-[#334155] shadow-2xl overflow-hidden"
          style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}
        >
          {/* Illustration */}
          <div className="w-full bg-[#0f172a] overflow-hidden" style={{ aspectRatio: '400/320' }}>
            <img
              key={current}
              src={slides[current].image}
              alt={slides[current].title}
              className="w-full h-full object-contain animate-enter"
              draggable={false}
            />
          </div>

          {/* Text content */}
          <div className="px-6 pt-5 pb-6 space-y-5">
            <div className="space-y-2 text-center" key={`text-${current}`}>
              <h2 className={`text-xl sm:text-2xl font-bold ${slides[current].accent} animate-enter`}>
                {slides[current].title}
              </h2>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed whitespace-pre-line animate-enter">
                {slides[current].description}
              </p>
            </div>

            {/* Dot indicators */}
            <div className="flex justify-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`rounded-full transition-all duration-300 ${
                    i === current
                      ? 'w-6 h-2 bg-blue-500'
                      : 'w-2 h-2 bg-slate-600 hover:bg-slate-500'
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            {isLast ? (
              /* Final slide — Start Chat only, no Skip */
              <button
                onClick={onComplete}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700
                           text-white font-semibold text-base transition-colors shadow-lg
                           shadow-blue-900/40"
              >
                Start Chat
              </button>
            ) : (
              /* Slides 1–3 — Next (primary) + Skip (subtle) */
              <div className="flex items-center gap-3">
                {/* Back button */}
                <button
                  onClick={goPrev}
                  disabled={current === 0}
                  aria-label="Previous slide"
                  className="p-2.5 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-700/60
                             disabled:opacity-20 disabled:pointer-events-none transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Next button */}
                <button
                  onClick={goNext}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                             bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white
                             font-semibold text-base transition-colors shadow-lg shadow-blue-900/40"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Skip button */}
                <button
                  onClick={onComplete}
                  className="px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-300
                             hover:bg-slate-700/60 transition-all"
                >
                  Skip
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
