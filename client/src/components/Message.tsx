import { formatTimeAgo } from '../utils'
import { MessageBubble } from './chat/MessageBubble'
import { ImageMessage } from './chat/ImageMessage'
import { VideoMessage } from './chat/VideoMessage'
import { AudioMessage } from './chat/AudioMessage'
import { FileMessage } from './chat/FileMessage'
import type { Message } from '../types'

interface MessageProps {
  message: Message
  isSent: boolean
  senderName?: string
}

export function MessageComponent({ message, isSent, senderName }: MessageProps) {
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
        <ImageMessage
          src={dataUrl}
          filename={message.filename}
          onDownload={handleDownload}
        />
      )
    }

    if (message.mimeType.startsWith('video/')) {
      return (
        <VideoMessage
          src={dataUrl}
          filename={message.filename}
        />
      )
    }

    if (message.mimeType.startsWith('audio/')) {
      return (
        <AudioMessage
          src={dataUrl}
          filename={message.filename}
        />
      )
    }

    // For other file types
    return (
      <FileMessage
        filename={message.filename || 'file'}
        size={message.size}
        mimeType={message.mimeType}
        onDownload={handleDownload}
      />
    )
  }

  const timestamp = formatTimeAgo(new Date(message.timestamp))

  return (
    <MessageBubble 
      isSent={isSent}
      timestamp={timestamp}
      senderName={!isSent ? senderName : undefined}
    >
      {message.type === 'text' ? (
        <p className="text-[var(--text-base)] whitespace-pre-wrap break-words">
          {message.message}
        </p>
      ) : (
        renderMediaContent()
      )}
    </MessageBubble>
  )
}