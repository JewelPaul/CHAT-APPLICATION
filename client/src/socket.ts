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
        // Register with invite code on connection
        this.socket?.emit('register', { deviceKey, deviceName })
      })

      this.socket.on('registered', () => {
        resolve(this.socket!)
      })

      this.socket.on('error', () => {
        // Handle socket errors silently
      })

      this.socket.on('disconnect', () => {
        // Socket disconnected — ephemeral data is gone
      })

      this.socket.on('connect_error', (error) => {
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

  // Key exchange — relay ECDH public key to room partner
  sendPublicKey(roomId: string, publicKey: string): void {
    this.socket?.emit('key-exchange', { roomId, publicKey })
  }

  // Typing indicators
  startTyping(roomId: string): void {
    this.socket?.emit('typing-start', { roomId })
  }

  stopTyping(roomId: string): void {
    this.socket?.emit('typing-stop', { roomId })
  }

  // Generic emit for custom events
  emit(event: string, data: unknown): void {
    this.socket?.emit(event, data)
  }

  // Event listeners
  on(event: string, callback: (...args: unknown[]) => void): void {
    this.socket?.on(event, callback)
  }

  off(event: string, callback?: (...args: unknown[]) => void): void {
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