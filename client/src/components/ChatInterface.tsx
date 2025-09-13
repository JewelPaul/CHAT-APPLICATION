import { useState, useRef, useEffect } from 'react'
import { 
  ArrowLeft, 
  Send, 
  Paperclip, 
  User as UserIcon, 
  AlertTriangle, 
  MoreVertical,
  X
} from 'lucide-react'
import { MessageComponent } from './Message'
import { fileToBase64, validateFile } from '../utils'
import { useNotifications } from './NotificationProvider'
import type { User, Message } from '../types'

interface ChatInterfaceProps {
  user: User | null
  chat: {
    user: User
    roomId: string
    messages: Message[]
  }
  isTyping: boolean
  typingUser: string | null
  onSendMessage: (message: string) => void
  onSendTypingStart: () => void
  onSendTypingStop: () => void
  onDisconnect: () => void
  onBackToWelcome: () => void
}

export function ChatInterface({
  user,
  chat,
  isTyping,
  typingUser,
  onSendMessage,
  onSendTypingStart,
  onSendTypingStop,
  onDisconnect,
  onBackToWelcome
}: ChatInterfaceProps) {
  const [message, setMessage] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const { addNotification } = useNotifications()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages])

  // Handle typing indicators
  useEffect(() => {
    if (message.length > 0) {
      onSendTypingStart()
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Set new timeout to stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        onSendTypingStop()
      }, 3000)
    } else {
      onSendTypingStop()
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [message, onSendTypingStart, onSendTypingStop])

  const handleSendMessage = () => {
    const trimmedMessage = message.trim()
    if (trimmedMessage) {
      onSendMessage(trimmedMessage)
      setMessage('')
      onSendTypingStop()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateFile(file)
    if (!validation.valid) {
      addNotification('error', validation.error || 'Invalid file')
      return
    }

    setIsUploading(true)
    
    try {
      await fileToBase64(file)
      // TODO: Implement file upload through socket
      addNotification('info', 'File sharing will be implemented in the next update')
    } catch (error) {
      console.error('File upload error:', error)
      addNotification('error', 'Failed to upload file')
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToWelcome}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors lg:hidden"
              title="Back to welcome screen"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3">
              {chat.user.avatar ? (
                <img
                  src={chat.user.avatar}
                  alt={chat.user.deviceName}
                  className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
              )}
              
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                  {chat.user.deviceName}
                </h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Online • {chat.user.code}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="More options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                  <button
                    onClick={() => {
                      onDisconnect()
                      setShowMenu(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className="w-4 h-4 inline mr-2" />
                    End Chat
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {/* Ephemeral notice */}
        <div className="flex justify-center mb-6">
          <div className="max-w-md p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-yellow-900 dark:text-yellow-100">
                  Ephemeral Chat Active
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Messages exist only in memory and will be lost when you disconnect.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Message list */}
        {chat.messages.map((msg) => (
          <MessageComponent
            key={msg.id}
            message={msg}
            isSent={msg.from === user?.code}
            senderName={msg.from === user?.code ? undefined : chat.user.deviceName}
          />
        ))}

        {/* Typing indicator */}
        {isTyping && typingUser && typingUser !== user?.code && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-lg px-4 py-2 max-w-xs">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {chat.user.deviceName} is typing...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-end gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,video/*,audio/*,.pdf,.txt"
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors disabled:opacity-50"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={1}
              style={{
                minHeight: '40px',
                maxHeight: '120px',
                resize: 'none'
              }}
            />
          </div>

          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || isUploading}
            className="btn btn-primary"
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}