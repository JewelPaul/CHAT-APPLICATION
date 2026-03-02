import { Download } from 'lucide-react'

interface VideoMessageProps {
  src: string
  onDownload?: () => void
}

export function VideoMessage({ src, onDownload }: VideoMessageProps) {
  return (
    <div className="relative rounded-xl overflow-hidden max-w-[280px]">
      <video
        src={src}
        controls
        className="w-full h-auto max-h-64"
        preload="metadata"
        playsInline
      >
        Your browser does not support video playback.
      </video>
      {onDownload && (
        <div className="absolute top-2 right-2">
          <button
            onClick={onDownload}
            className="p-1.5 bg-black/60 hover:bg-black/80 rounded-lg transition-colors"
            title="Download video"
          >
            <Download className="w-4 h-4 text-white" />
          </button>
        </div>
      )}
    </div>
  )
}
