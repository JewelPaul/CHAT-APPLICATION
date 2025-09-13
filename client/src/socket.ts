import { io, Socket } from 'socket.io-client'
import type { ConnectionStatus } from './types'

class SocketService {
  private socket: Socket | null = null
  private connectionStatus: ConnectionStatus = 'disconnected'
  private listeners: Map<string, Function[]> = new Map()

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use the current domain for socket connection, or localhost for development
      const socketUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : window.location.origin

      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })

      this.socket.on('connect', () => {
        this.connectionStatus = 'connected'
        this.emit('connection-status', 'connected')
        resolve()
      })

      this.socket.on('disconnect', () => {
        this.connectionStatus = 'disconnected'
        this.emit('connection-status', 'disconnected')
      })

      this.socket.on('connect_error', (error) => {
        this.connectionStatus = 'error'
        this.emit('connection-status', 'error')
        reject(error)
      })

      // Forward all socket events to listeners
      this.setupEventForwarding()
    })
  }

  private setupEventForwarding(): void {
    if (!this.socket) return

    const events = [
      'registered',
      'connection-error',
      'connection-request',
      'connection-request-sent',
      'connection-accepted',
      'connection-established',
      'message',
      'message-sent',
      'message-error',
      'media-message',
      'media-sent',
      'media-error',
      'media-data',
      'typing-start',
      'typing-stop',
      'user-disconnected'
    ]

    events.forEach(event => {
      this.socket?.on(event, (data) => {
        this.emit(event, data)
      })
    })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.connectionStatus = 'disconnected'
    this.listeners.clear()
  }

  register(code: string, deviceName: string, avatar?: string): void {
    this.socket?.emit('register', { code, deviceName, avatar })
  }

  sendConnectionRequest(code: string): void {
    this.socket?.emit('connection-request', { code })
  }

  acceptConnection(code: string): void {
    this.socket?.emit('connection-accept', { code })
  }

  sendMessage(to: string, message: string, roomId: string): void {
    this.socket?.emit('message', { to, message, roomId })
  }

  sendMediaUpload(to: string, roomId: string, mediaData: string, filename: string, mimeType: string): void {
    this.socket?.emit('media-upload', { to, roomId, mediaData, filename, mimeType })
  }

  getMedia(mediaId: string): void {
    this.socket?.emit('get-media', { mediaId })
  }

  sendTypingStart(to: string, roomId: string): void {
    this.socket?.emit('typing-start', { to, roomId })
  }

  sendTypingStop(to: string, roomId: string): void {
    this.socket?.emit('typing-stop', { to, roomId })
  }

  // Event listener management
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)?.push(callback)
  }

  off(event: string, callback?: Function): void {
    if (!callback) {
      this.listeners.delete(event)
      return
    }

    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      const index = eventListeners.indexOf(callback)
      if (index > -1) {
        eventListeners.splice(index, 1)
      }
    }
  }

  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data))
    }
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false
  }
}

// Export singleton instance
export const socketService = new SocketService()
export default socketService