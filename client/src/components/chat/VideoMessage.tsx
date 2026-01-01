interface VideoMessageProps {
  src: string
  filename?: string
}

export function VideoMessage({ src, filename }: VideoMessageProps) {
  return (
    <div className="relative rounded-xl overflow-hidden max-w-[280px]">
      <video
        src={src}
        controls
        className="w-full h-auto"
        preload="metadata"
      >
        Your browser does not support video playback.
      </video>
      {filename && (
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 backdrop-blur-sm px-2 py-1 rounded-lg text-xs text-white">
          {filename}
        </div>
      )}
    </div>
  )
}
