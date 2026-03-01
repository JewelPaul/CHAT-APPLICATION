import { useRef, type ChangeEvent, useState } from 'react'
import { Paperclip, Image, X } from 'lucide-react'

interface MediaPickerProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
}

export function MediaPicker({ onFileSelect, disabled = false }: MediaPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file)
      e.target.value = ''
      setIsOpen(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="p-2 hover:bg-bg-hover rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Attach media"
      >
        {isOpen ? (
          <X className="w-5 h-5 text-gold-primary" />
        ) : (
          <Paperclip className="w-5 h-5 text-gold-primary hover:text-gold-light" />
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
            role="button"
            aria-label="Close media picker"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Escape' || e.key === 'Enter') {
                setIsOpen(false)
              }
            }}
          />
          
          {/* Media Options Panel */}
          <div className="absolute bottom-full left-0 mb-2 bg-bg-card rounded-2xl p-4 shadow-2xl border border-border z-20 animate-slide-up">
            <div className="grid grid-cols-4 gap-4 min-w-[280px]">
              {/* Photo */}
              <label className="flex flex-col items-center cursor-pointer group">
                <div className="w-14 h-14 bg-purple-500/20 rounded-full flex items-center justify-center group-hover:bg-purple-500/30 transition-all group-hover:scale-105">
                  <span className="text-2xl">🖼️</span>
                </div>
                <span className="text-xs mt-2 text-text-secondary group-hover:text-gold-primary transition-colors font-medium">
                  Photo
                </span>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleFileChange}
                  disabled={disabled}
                />
              </label>

              {/* Video */}
              <label className="flex flex-col items-center cursor-pointer group">
                <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center group-hover:bg-red-500/30 transition-all group-hover:scale-105">
                  <span className="text-2xl">🎥</span>
                </div>
                <span className="text-xs mt-2 text-text-secondary group-hover:text-gold-primary transition-colors font-medium">
                  Video
                </span>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  hidden
                  onChange={handleFileChange}
                  disabled={disabled}
                />
              </label>

              {/* Audio */}
              <label className="flex flex-col items-center cursor-pointer group">
                <div className="w-14 h-14 bg-orange-500/20 rounded-full flex items-center justify-center group-hover:bg-orange-500/30 transition-all group-hover:scale-105">
                  <span className="text-2xl">🎵</span>
                </div>
                <span className="text-xs mt-2 text-text-secondary group-hover:text-gold-primary transition-colors font-medium">
                  Audio
                </span>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  hidden
                  onChange={handleFileChange}
                  disabled={disabled}
                />
              </label>

              {/* Document */}
              <label className="flex flex-col items-center cursor-pointer group">
                <div className="w-14 h-14 bg-blue-500/20 rounded-full flex items-center justify-center group-hover:bg-blue-500/30 transition-all group-hover:scale-105">
                  <span className="text-2xl">📄</span>
                </div>
                <span className="text-xs mt-2 text-text-secondary group-hover:text-gold-primary transition-colors font-medium">
                  File
                </span>
                <input
                  ref={documentInputRef}
                  type="file"
                  hidden
                  onChange={handleFileChange}
                  disabled={disabled}
                />
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Individual media type pickers (optional, for specific use cases)
export function ImagePicker({ onFileSelect, disabled = false }: MediaPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file)
      e.target.value = ''
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        disabled={disabled}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className="p-2 hover:bg-bg-hover rounded-lg transition-colors"
        title="Send image"
      >
        <Image className="w-5 h-5 text-gold-primary" />
      </button>
    </>
  )
}
