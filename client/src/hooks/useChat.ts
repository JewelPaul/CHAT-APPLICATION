import { useState, useEffect, useCallback } from 'react'
import socketService from '../socket'
// import { createEncryption } from '../crypto' // TODO: implement encryption
import { generateUserCode, detectDevice } from '../utils'
import { useNotifications } from '../components/NotificationProvider'
import type { User, Message, ConnectionRequest, ConnectionStatus } from '../types'

export function useChat() {
  const [user, setUser] = useState<User | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [currentChat, setCurrentChat] = useState<{
    user: User
    roomId: string
    messages: Message[]
  } | null>(null)
  const [connectionRequest, setConnectionRequest] = useState<ConnectionRequest | null>(null)
  const [waitingForResponse, setWaitingForResponse] = useState<string | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [typingUser, setTypingUser] = useState<string | null>(null)

  const { addNotification } = useNotifications()
  // Note: encryption will be implemented in future update
  // const encryption = createEncryption()

  // Initialize user and connect to socket
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setConnectionStatus('connecting')
        await socketService.connect()
        
        // Generate user info
        const userCode = generateUserCode()
        const deviceName = detectDevice()
        const newUser: User = { code: userCode, deviceName }
        
        setUser(newUser)
        socketService.register(userCode, deviceName)
        
        addNotification('success', 'Connected to ChatWave!')
      } catch (error) {
        console.error('Failed to connect:', error)
        setConnectionStatus('error')
        addNotification('error', 'Failed to connect to ChatWave')
      }
    }

    initializeChat()

    return () => {
      socketService.disconnect()
    }
  }, [addNotification])

  // Set up socket event listeners
  useEffect(() => {
    const handleConnectionStatus = (status: ConnectionStatus) => {
      setConnectionStatus(status)
    }

    const handleRegistered = (data: { code: string; deviceName: string }) => {
      setConnectionStatus('connected')
      addNotification('info', `You're connected as ${data.code}`)
    }

    const handleConnectionRequest = (request: ConnectionRequest) => {
      setConnectionRequest(request)
      addNotification('info', `${request.deviceName} wants to connect`)
    }

    const handleConnectionRequestSent = (data: { code: string }) => {
      setWaitingForResponse(data.code)
      addNotification('info', `Connection request sent to ${data.code}`)
    }

    const handleConnectionAccepted = (data: { code: string; roomId: string; deviceName: string; avatar?: string }) => {
      const chatUser: User = {
        code: data.code,
        deviceName: data.deviceName,
        avatar: data.avatar
      }
      
      setCurrentChat({
        user: chatUser,
        roomId: data.roomId,
        messages: []
      })
      
      setWaitingForResponse(null)
      addNotification('success', `Connected to ${data.deviceName}!`)
    }

    const handleConnectionEstablished = (data: { code: string; roomId: string; deviceName: string; avatar?: string }) => {
      const chatUser: User = {
        code: data.code,
        deviceName: data.deviceName,
        avatar: data.avatar
      }
      
      setCurrentChat({
        user: chatUser,
        roomId: data.roomId,
        messages: []
      })
      
      setConnectionRequest(null)
      addNotification('success', `Chat started with ${data.deviceName}!`)
    }

    const handleMessage = (message: Message) => {
      setCurrentChat(prev => {
        if (prev) {
          return {
            ...prev,
            messages: [...prev.messages, message]
          }
        }
        return prev
      })
    }

    const handleMessageSent = (message: Message) => {
      setCurrentChat(prev => {
        if (prev) {
          return {
            ...prev,
            messages: [...prev.messages, message]
          }
        }
        return prev
      })
    }

    const handleMediaMessage = (message: Message) => {
      setCurrentChat(prev => {
        if (prev) {
          return {
            ...prev,
            messages: [...prev.messages, message]
          }
        }
        return prev
      })
    }

    const handleTypingStart = (data: { from: string }) => {
      if (data.from !== user?.code) {
        setIsTyping(true)
        setTypingUser(data.from)
      }
    }

    const handleTypingStop = (data: { from: string }) => {
      if (data.from !== user?.code) {
        setIsTyping(false)
        setTypingUser(null)
      }
    }

    const handleUserDisconnected = (data: { userCode: string }) => {
      if (currentChat?.user.code === data.userCode) {
        addNotification('warning', `${currentChat.user.deviceName} disconnected`)
        setCurrentChat(null)
      }
    }

    const handleConnectionError = (data: { error: string }) => {
      addNotification('error', data.error)
      setWaitingForResponse(null)
    }

    // Register event listeners
    socketService.on('connection-status', handleConnectionStatus)
    socketService.on('registered', handleRegistered)
    socketService.on('connection-request', handleConnectionRequest)
    socketService.on('connection-request-sent', handleConnectionRequestSent)
    socketService.on('connection-accepted', handleConnectionAccepted)
    socketService.on('connection-established', handleConnectionEstablished)
    socketService.on('message', handleMessage)
    socketService.on('message-sent', handleMessageSent)
    socketService.on('media-message', handleMediaMessage)
    socketService.on('typing-start', handleTypingStart)
    socketService.on('typing-stop', handleTypingStop)
    socketService.on('user-disconnected', handleUserDisconnected)
    socketService.on('connection-error', handleConnectionError)

    return () => {
      socketService.off('connection-status', handleConnectionStatus)
      socketService.off('registered', handleRegistered)
      socketService.off('connection-request', handleConnectionRequest)
      socketService.off('connection-request-sent', handleConnectionRequestSent)
      socketService.off('connection-accepted', handleConnectionAccepted)
      socketService.off('connection-established', handleConnectionEstablished)
      socketService.off('message', handleMessage)
      socketService.off('message-sent', handleMessageSent)
      socketService.off('media-message', handleMediaMessage)
      socketService.off('typing-start', handleTypingStart)
      socketService.off('typing-stop', handleTypingStop)
      socketService.off('user-disconnected', handleUserDisconnected)
      socketService.off('connection-error', handleConnectionError)
    }
  }, [user, currentChat, addNotification])

  const sendConnectionRequest = useCallback((code: string) => {
    if (!user) return
    socketService.sendConnectionRequest(code)
  }, [user])

  const acceptConnection = useCallback((code: string) => {
    socketService.acceptConnection(code)
  }, [])

  const rejectConnection = useCallback(() => {
    setConnectionRequest(null)
    addNotification('info', 'Connection request declined')
  }, [addNotification])

  const sendMessage = useCallback((message: string) => {
    if (!currentChat || !user) return
    
    socketService.sendMessage(currentChat.user.code, message, currentChat.roomId)
  }, [currentChat, user])

  const sendTypingStart = useCallback(() => {
    if (!currentChat || !user) return
    socketService.sendTypingStart(currentChat.user.code, currentChat.roomId)
  }, [currentChat, user])

  const sendTypingStop = useCallback(() => {
    if (!currentChat || !user) return
    socketService.sendTypingStop(currentChat.user.code, currentChat.roomId)
  }, [currentChat, user])

  const disconnectChat = useCallback(() => {
    setCurrentChat(null)
    setConnectionRequest(null)
    setWaitingForResponse(null)
    addNotification('info', 'Chat disconnected')
  }, [addNotification])

  const cancelWaitingRequest = useCallback(() => {
    setWaitingForResponse(null)
    addNotification('info', 'Connection request cancelled')
  }, [addNotification])

  return {
    user,
    connectionStatus,
    currentChat,
    connectionRequest,
    waitingForResponse,
    isTyping,
    typingUser,
    sendConnectionRequest,
    acceptConnection,
    rejectConnection,
    sendMessage,
    sendTypingStart,
    sendTypingStop,
    disconnectChat,
    cancelWaitingRequest
  }
}