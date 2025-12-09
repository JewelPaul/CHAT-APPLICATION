import { io, Socket } from 'socket.io-client'

class SocketService {
  private socket: Socket | null = null

  connect(deviceKey: string, deviceName: string): Promise<Socket> {
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
        console.log('Socket connected:', this.socket?.id)
        // Register with device key on connection
        this.socket?.emit('register', { deviceKey, deviceName })
      })

      this.socket.on('registered', (data) => {
        console.log('Registered successfully:', data)
        resolve(this.socket!)
      })

      this.socket.on('error', (data) => {
        console.error('Socket error:', data)
      })

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected')
      })

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error)
        reject(error)
      })
    })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  // Connection requests
  sendRequest(targetKey: string): void {
    this.socket?.emit('connection-request', { targetKey })
  }

  acceptRequest(fromKey: string): void {
    this.socket?.emit('accept-request', { fromKey })
  }

  rejectRequest(fromKey: string): void {
    this.socket?.emit('reject-request', { fromKey })
  }

  // Messages
  sendMessage(roomId: string, message: string): void {
    this.socket?.emit('send-message', { roomId, message })
  }

  // Typing indicators
  startTyping(roomId: string): void {
    this.socket?.emit('typing-start', { roomId })
  }

  stopTyping(roomId: string): void {
    this.socket?.emit('typing-stop', { roomId })
  }

  // Event listeners
  on(event: string, callback: (...args: any[]) => void): void {
    this.socket?.on(event, callback)
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    if (callback) {
      this.socket?.off(event, callback)
    } else {
      this.socket?.off(event)
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false
  }
}

export default new SocketService()