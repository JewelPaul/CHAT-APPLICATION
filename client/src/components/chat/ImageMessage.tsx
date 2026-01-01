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
          className="rounded-xl max-w-[280px] w-full h-auto"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
          <ZoomIn className="w-8 h-8 text-white" />
        </div>
      </div>

      {/* Fullscreen Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
            onClick={() => setShowModal(false)}
          >
            <X className="w-8 h-8 text-white" />
          </button>
          
          <img
            src={src}
            alt={alt || filename || 'Image'}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          
          {onDownload && (
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDownload()
                }}
                className="btn btn-primary inline-flex items-center gap-2"
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
