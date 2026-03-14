import { io, Socket } from 'socket.io-client'

class SocketService {
  private socket: Socket | null = null
  /** Stores the server-assigned invite code so it can be re-registered on reconnect */
  private inviteCode: string | null = null
  /**
   * Listeners registered before the socket is created (race condition guard).
   * They are flushed onto the real socket the moment connect() creates it.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pendingListeners: Array<{ event: string; callback: (...args: any[]) => void }> = []

  connect(deviceKey: string, deviceName: string): Promise<{ socket: Socket; username?: string; inviteCode?: string }> {
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

      // Flush any listeners that were registered before the socket was created
      for (const { event, callback } of this.pendingListeners) {
        this.socket.on(event, callback)
      }
      this.pendingListeners = []

      this.socket.on('connect', () => {
        // Register with device fingerprint on every (re)connect
        this.socket?.emit('register', { deviceKey, deviceName })
        // If we already know the invite code, also send explicit register-device
        // so the server mapping is refreshed immediately without waiting for DB lookup
        if (this.inviteCode) {
          this.socket?.emit('register-device', { inviteCode: this.inviteCode })
        }
      })

      this.socket.on('registered', (data: { success: boolean; deviceKey: string; username?: string; inviteCode?: string }) => {
        // Cache the server-assigned invite code for use on reconnect
        if (data?.inviteCode) {
          this.inviteCode = data.inviteCode
          // Also send register-device to ensure inviteCode→socketId mapping is current
          this.socket?.emit('register-device', { inviteCode: data.inviteCode })
        }
        resolve({ socket: this.socket!, username: data?.username, inviteCode: data?.inviteCode })
      })

      this.socket.on('error', (err) => {
        reject(err)
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
    this.pendingListeners = []
  }

  // Connection requests
  sendRequest(targetKey: string): void {
    if (!this.inviteCode) return
    this.socket?.emit('send-request', {
      targetInviteCode: targetKey,
      senderInviteCode: this.inviteCode,
    })
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

  // Call signaling
  initiateCall(toCode: string, callType: string): void {
    this.socket?.emit('call-initiate', { to: toCode, type: callType })
  }

  acceptCall(fromCode: string): void {
    this.socket?.emit('call-accept', { from: fromCode })
  }

  rejectCall(fromCode: string): void {
    this.socket?.emit('call-reject', { from: fromCode })
  }

  endCall(toCode: string): void {
    this.socket?.emit('call-end', { to: toCode })
  }

  sendWebRTCSignal(toCode: string, signal: RTCSessionDescriptionInit | RTCIceCandidateInit, signalType: string): void {
    this.socket?.emit('webrtc-signal', { to: toCode, signal, signalType })
  }

  // Generic emit for custom events
  emit(event: string, data: unknown): void {
    this.socket?.emit(event, data)
  }

  // Event listeners
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback)
    } else {
      // Socket not yet created — buffer the listener and flush it in connect()
      this.pendingListeners.push({ event, callback })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback)
      } else {
        this.socket.off(event)
      }
    } else {
      // Remove from pending buffer if not yet flushed
      if (callback) {
        this.pendingListeners = this.pendingListeners.filter(
          (l) => !(l.event === event && l.callback === callback)
        )
      } else {
        this.pendingListeners = this.pendingListeners.filter((l) => l.event !== event)
      }
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false
  }
}

export default new SocketService()