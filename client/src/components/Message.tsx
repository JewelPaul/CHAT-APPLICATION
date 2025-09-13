import { Download, FileText, Image, Video, Music, File } from 'lucide-react'
import { formatFileSize, formatTimeAgo } from '../utils'
import type { Message } from '../types'

interface MessageProps {
  message: Message
  isSent: boolean
  senderName?: string
}

export function MessageComponent({ message, isSent, senderName }: MessageProps) {
  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <File className="w-5 h-5" />
    
    if (mimeType.startsWith('image/')) return <Image className="w-5 h-5" />
    if (mimeType.startsWith('video/')) return <Video className="w-5 h-5" />
    if (mimeType.startsWith('audio/')) return <Music className="w-5 h-5" />
    if (mimeType === 'application/pdf' || mimeType.startsWith('text/')) return <FileText className="w-5 h-5" />
    
    return <File className="w-5 h-5" />
  }

  const handleDownload = () => {
    if (message.type === 'media' && message.mediaData && message.filename) {
      const link = document.createElement('a')
      link.href = `data:${message.mimeType};base64,${message.mediaData}`
      link.download = message.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const renderMediaContent = () => {
    if (!message.mediaData || !message.mimeType) return null

    const dataUrl = `data:${message.mimeType};base64,${message.mediaData}`

    if (message.mimeType.startsWith('image/')) {
      return (
        <div className="max-w-xs">
          <img
            src={dataUrl}
            alt={message.filename}
            className="rounded-lg max-w-full h-auto"
            loading="lazy"
          />
        </div>
      )
    }

    if (message.mimeType.startsWith('video/')) {
      return (
        <div className="max-w-xs">
          <video
            src={dataUrl}
            controls
            className="rounded-lg max-w-full h-auto"
            preload="metadata"
          >
            Your browser does not support video playback.
          </video>
        </div>
      )
    }

    if (message.mimeType.startsWith('audio/')) {
      return (
        <div className="w-64">
          <audio
            src={dataUrl}
            controls
            className="w-full"
            preload="metadata"
          >
            Your browser does not support audio playback.
          </audio>
        </div>
      )
    }

    // For other file types, show a download link
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 max-w-xs">
        <div className="text-gray-500 dark:text-gray-400">
          {getFileIcon(message.mimeType)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {message.filename}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {message.size ? formatFileSize(message.size) : 'Unknown size'}
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[70%] ${isSent ? 'order-2' : 'order-1'}`}>
        <div
          className={`rounded-lg px-4 py-2 ${
            isSent
              ? 'bg-primary-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
          }`}
        >
          {!isSent && senderName && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
              {senderName}
            </p>
          )}

          {message.type === 'text' ? (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.message}
            </p>
          ) : (
            <div className="space-y-2">
              {renderMediaContent()}
              {message.filename && (
                <p className="text-xs opacity-75">
                  {message.filename}
                </p>
              )}
            </div>
          )}

          <p
            className={`text-xs mt-1 ${
              isSent
                ? 'text-primary-100'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {formatTimeAgo(new Date(message.timestamp))}
          </p>
        </div>
      </div>
    </div>
  )
}