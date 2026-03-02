import { formatTimeAgo } from '../utils'
import { MessageBubble } from './chat/MessageBubble'
import { ImageMessage } from './chat/ImageMessage'
import { VideoMessage } from './chat/VideoMessage'
import { AudioMessage } from './chat/AudioMessage'
import type { Message } from '../types'

interface MessageProps {
  message: Message
  isSent: boolean
  senderName?: string
}

export function MessageComponent({ message, isSent, senderName }: MessageProps) {
  // Use objectUrl (decrypted ephemeral) or fall back to base64 data URL
  const mediaSrc = message.objectUrl
    ? message.objectUrl
    : message.mediaData && message.mimeType
      ? `data:${message.mimeType};base64,${message.mediaData}`
      : null

  const handleDownload = () => {
    if (!mediaSrc || !message.mimeType) return
    const link = document.createElement('a')
    link.href = mediaSrc
    // Generate a safe download filename
    const ext = message.mimeType.split('/')[1] || 'bin'
    link.download = message.filename || `media.${ext}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const renderMediaContent = () => {
    if (!mediaSrc || !message.mimeType) return null

    if (message.mimeType.startsWith('image/')) {
      return (
        <ImageMessage
          src={mediaSrc}
          filename={message.filename}
          onDownload={handleDownload}
        />
      )
    }

    if (message.mimeType.startsWith('video/')) {
      return (
        <VideoMessage
          src={mediaSrc}
          onDownload={handleDownload}
        />
      )
    }

    if (message.mimeType.startsWith('audio/')) {
      return (
        <AudioMessage
          src={mediaSrc}
          onDownload={handleDownload}
        />
      )
    }

    return null
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