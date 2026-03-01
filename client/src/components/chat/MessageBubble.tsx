import { type ReactNode } from 'react'

interface MessageBubbleProps {
  isSent: boolean
  children: ReactNode
  timestamp?: string
  senderName?: string
}

export function MessageBubble({ 
  isSent, 
  children, 
  timestamp,
  senderName 
}: MessageBubbleProps) {
  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-3 message-enter`}>
      <div className={`${isSent ? 'bubble-sent' : 'bubble-received'}`}>
        {!isSent && senderName && (
          <p className="text-xs opacity-70 mb-1 font-medium">
            {senderName}
          </p>
        )}
        
        <div>{children}</div>
        
        {timestamp && (
          <p className={`text-xs mt-1 ${isSent ? 'opacity-70' : 'opacity-60'}`}>
            {timestamp}
          </p>
        )}
      </div>
    </div>
  )
}
