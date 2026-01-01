import { useState } from 'react'
import { ZoomIn, Download, X } from 'lucide-react'

interface ImageMessageProps {
  src: string
  alt?: string
  filename?: string
  onDownload?: () => void
}

export function ImageMessage({ src, alt, filename, onDownload }: ImageMessageProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <div className="relative group cursor-pointer" onClick={() => setShowModal(true)}>
        <img
          src={src}
          alt={alt || filename || 'Image'}
          className="rounded-2xl max-w-[280px] w-full h-auto border-2 border-gold-primary/20 hover:border-gold-primary/50 transition-all"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-gold-primary/90 rounded-full p-3 shadow-gold">
            <ZoomIn className="w-6 h-6 text-black" />
          </div>
        </div>
      </div>

      {/* Fullscreen Modal with Royal Gold accents */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <button
            className="absolute top-4 right-4 p-3 bg-bg-card/80 hover:bg-bg-hover rounded-full transition-all border border-gold-primary/30 hover:border-gold-primary shadow-gold"
            onClick={() => setShowModal(false)}
          >
            <X className="w-6 h-6 text-gold-primary" />
          </button>
          
          <img
            src={src}
            alt={alt || filename || 'Image'}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          
          {onDownload && (
            <div className="absolute bottom-8 left-0 right-0 text-center">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDownload()
                }}
                className="btn btn-primary inline-flex items-center gap-2 shadow-gold"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
