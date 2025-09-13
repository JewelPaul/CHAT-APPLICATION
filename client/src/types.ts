export interface User {
  code: string
  deviceName: string
  avatar?: string
  socketId?: string
  connectionTime?: Date
}

export interface Message {
  id: string | number
  from: string
  to: string
  message?: string
  timestamp: Date
  type: 'text' | 'media'
  mediaId?: string
  filename?: string
  mimeType?: string
  size?: number
  mediaData?: string
}

export interface ChatRoom {
  roomId: string
  user1: string
  user2: string
  messages: Message[]
  createdAt: Date
}

export interface ConnectionRequest {
  code: string
  deviceName: string
  avatar?: string
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface Notification {
  id: string
  type: NotificationType
  message: string
  duration?: number
}