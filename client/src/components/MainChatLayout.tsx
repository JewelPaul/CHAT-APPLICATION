import { useState, useEffect, useCallback, useRef } from 'react'
import { Sidebar } from './Sidebar'
import { ChatArea } from './ChatArea'
import { AddUserModal } from './AddUserModal'
import { IncomingRequestModal } from './IncomingRequestModal'
import socketService from '../socket'
import { useNotifications } from './NotificationProvider'
import { generateKeyPair, encryptMessage, decryptMessage } from '../encryption'
import type { Contact, StoredMessage } from '../db'
import type { CallType } from '../types'

// Configuration constants
const MAX_FILE_SIZE_MB = 10
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

interface MainChatLayoutProps {
  deviceKey: string
}

interface ActiveChat {
  partnerKey: string
  partnerName: string
  roomId: string
}

// In-memory encryption keys per room (ephemeral, lost on disconnect)
interface RoomKeys {
  privateKey: string
  publicKey: string
  peerPublicKey?: string
}

export function MainChatLayout({ deviceKey }: MainChatLayoutProps) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<StoredMessage[]>([])
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  // In-memory contacts (ephemeral — lost on refresh)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [activeChats, setActiveChats] = useState<Map<string, ActiveChat>>(new Map())
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [incomingRequest, setIncomingRequest] = useState<{ fromKey: string; fromName: string } | null>(null)
  // In-memory room encryption keys (ephemeral)
  const [roomKeys, setRoomKeys] = useState<Map<string, RoomKeys>>(new Map())
  // Explicit partner key → room ID mapping (avoids fragile substring matching, no re-render needed)
  const partnerToRoom = useRef<Map<string, string>>(new Map())
  const { addNotification } = useNotifications()

  // Set up socket listeners
  useEffect(() => {
    // Handle incoming connection request
    const handleIncomingRequest = (data: { fromKey: string; fromName: string }) => {
      setIncomingRequest(data)
      addNotification('info', `Connection request from ${data.fromName}`)
    }

    // Handle connection established — generate key pair and start key exchange
    const handleConnectionEstablished = async (data: { partnerKey: string; partnerName: string; roomId: string }) => {
      // Create in-memory contact (not persisted)
      const newContact: Contact = {
        id: data.partnerKey,
        username: data.partnerName,
        displayName: data.partnerName,
        status: 'online',
        lastSeen: new Date(),
        unreadCount: 0
      }

      setContacts(prev => {
        const exists = prev.some(c => c.id === data.partnerKey)
        return exists ? prev : [...prev, newContact]
      })

      setActiveChats(prev => new Map(prev).set(data.partnerKey, data))
      partnerToRoom.current.set(data.partnerKey, data.roomId)
      setSelectedContact(newContact)
      setCurrentRoomId(data.roomId)

      // Generate ECDH key pair for this room session
      try {
        const keys = await generateKeyPair()
        setRoomKeys(prev => {
          const next = new Map(prev)
          next.set(data.roomId, { privateKey: keys.privateKey, publicKey: keys.publicKey })
          return next
        })
        // Send our public key to partner
        socketService.sendPublicKey(data.roomId, keys.publicKey)
      } catch {
        // Key generation failed — chat still works but without encryption
      }

      addNotification('success', `Connected with ${data.partnerName}`)
    }

    // Handle key exchange from partner
    const handleKeyExchange = async (data: { fromKey: string; publicKey: string; roomId: string }) => {
      setRoomKeys(prev => {
        const existing = prev.get(data.roomId)
        if (!existing) return prev
        const next = new Map(prev)
        next.set(data.roomId, { ...existing, peerPublicKey: data.publicKey })
        return next
      })
    }

    // Handle new message
    const handleNewMessage = async (data: { id: string; fromKey: string; content: string; timestamp: number; roomId: string }) => {
      // Don't add message if it's from us (already added when sending)
      if (data.fromKey === deviceKey) {
        return
      }

      // Attempt to decrypt if we have keys for this room
      let content = data.content
      const keys = roomKeys.get(data.roomId)
      if (keys?.privateKey && keys.peerPublicKey) {
        try {
          const parsed: unknown = JSON.parse(data.content)
          if (
            parsed !== null &&
            typeof parsed === 'object' &&
            'encrypted' in parsed &&
            'iv' in parsed &&
            typeof (parsed as { encrypted: unknown }).encrypted === 'string' &&
            typeof (parsed as { iv: unknown }).iv === 'string'
          ) {
            const { encrypted, iv } = parsed as { encrypted: string; iv: string }
            content = await decryptMessage(encrypted, iv, keys.privateKey, keys.peerPublicKey)
          }
        } catch {
          // Not encrypted or decryption failed — use as-is
        }
      }

      const newMessage: StoredMessage = {
        id: data.id,
        chatId: data.fromKey,
        senderId: data.fromKey,
        recipientId: deviceKey,
        content,
        type: 'text',
        timestamp: new Date(data.timestamp),
        status: 'delivered'
      }

      // Update messages if this contact is currently selected
      setSelectedContact(prev => {
        if (prev?.id === data.fromKey) {
          setMessages(msgs => [...msgs, newMessage])
        }
        return prev
      })

      // Update contact's last message
      setContacts(prev => prev.map(c =>
        c.id === data.fromKey
          ? { ...c, lastMessage: content, lastMessageTime: new Date(data.timestamp) }
          : c
      ))
    }

    // Handle typing indicators
    const handleUserTyping = (data: { userKey: string }) => {
      setSelectedContact(prev => {
        if (prev?.id === data.userKey) {
          setIsTyping(true)
        }
        return prev
      })
    }

    const handleUserStoppedTyping = (data: { userKey: string }) => {
      setSelectedContact(prev => {
        if (prev?.id === data.userKey) {
          setIsTyping(false)
        }
        return prev
      })
    }

    // Handle user not found
    const handleUserNotFound = (data: { targetKey: string }) => {
      addNotification('error', `User ${data.targetKey} not found or offline`)
    }

    // Handle request rejected
    const handleRequestRejected = () => {
      addNotification('warning', 'Connection request was declined')
    }

    // Handle partner disconnect — destroy room and keys
    const handleUserOffline = (data: { deviceKey: string }) => {
      const key = data.deviceKey
      setContacts(prev => prev.filter(c => c.id !== key))
      setActiveChats(prev => {
        const next = new Map(prev)
        next.delete(key)
        return next
      })
      // Use explicit partner→room mapping for precise key cleanup
      const roomIdForPartner = partnerToRoom.current.get(key)
      if (roomIdForPartner) {
        setRoomKeys(keys => {
          const next = new Map(keys)
          next.delete(roomIdForPartner)
          return next
        })
      }
      partnerToRoom.current.delete(key)
      setSelectedContact(prev => {
        if (prev?.id === key) {
          setMessages([])
          setCurrentRoomId(null)
          addNotification('warning', 'Chat partner disconnected — session ended')
          return null
        }
        return prev
      })
    }

    // Register listeners
    socketService.on('incoming-request', handleIncomingRequest)
    socketService.on('connection-established', handleConnectionEstablished)
    socketService.on('key-exchange', handleKeyExchange)
    socketService.on('new-message', handleNewMessage)
    socketService.on('user-typing', handleUserTyping)
    socketService.on('user-stopped-typing', handleUserStoppedTyping)
    socketService.on('user-not-found', handleUserNotFound)
    socketService.on('request-rejected', handleRequestRejected)
    socketService.on('user-offline', handleUserOffline)

    return () => {
      socketService.off('incoming-request', handleIncomingRequest)
      socketService.off('connection-established', handleConnectionEstablished)
      socketService.off('key-exchange', handleKeyExchange)
      socketService.off('new-message', handleNewMessage)
      socketService.off('user-typing', handleUserTyping)
      socketService.off('user-stopped-typing', handleUserStoppedTyping)
      socketService.off('user-not-found', handleUserNotFound)
      socketService.off('request-rejected', handleRequestRejected)
      socketService.off('user-offline', handleUserOffline)
    }
  }, [deviceKey, addNotification, roomKeys])

  // Update messages and room ID when selected contact changes
  useEffect(() => {
    if (selectedContact) {
      const activeChat = activeChats.get(selectedContact.id)
      if (activeChat) {
        setCurrentRoomId(activeChat.roomId)
      }
    } else {
      setMessages([])
      setCurrentRoomId(null)
    }
  }, [selectedContact, activeChats])

  const handleSelectContact = useCallback((contact: Contact) => {
    setSelectedContact(contact)
    // Load messages for this contact from in-memory state
    // Messages are already in React state, no DB needed
  }, [])

  const handleNewChat = () => {
    setIsAddUserModalOpen(true)
  }

  const handleRequestSent = (targetKey: string) => {
    addNotification('info', `Connection request sent to ${targetKey}`)
    setTimeout(() => {
      setIsAddUserModalOpen(false)
    }, 1500)
  }

  const handleAcceptRequest = () => {
    if (incomingRequest) {
      socketService.acceptRequest(incomingRequest.fromKey)
      setIncomingRequest(null)
    }
  }

  const handleRejectRequest = () => {
    if (incomingRequest) {
      socketService.rejectRequest(incomingRequest.fromKey)
      setIncomingRequest(null)
    }
  }

  const handleSendMessage = async (message: string) => {
    if (!selectedContact || !currentRoomId) {
      addNotification('error', 'No active chat session')
      return
    }

    // Validate message length (2KB max)
    if (message.length > 2048) {
      addNotification('error', 'Message too long (max 2KB)')
      return
    }

    try {
      const msgId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

      // Attempt end-to-end encryption
      let contentToSend = message
      const keys = roomKeys.get(currentRoomId)
      if (keys?.privateKey && keys.peerPublicKey) {
        try {
          const encrypted = await encryptMessage(message, keys.privateKey, keys.peerPublicKey)
          contentToSend = JSON.stringify(encrypted)
        } catch {
          // Encryption failed — send plaintext (still secure via TLS)
        }
      }

      // Add to local messages immediately (in-memory only)
      const newMessage: StoredMessage = {
        id: msgId,
        chatId: selectedContact.id,
        senderId: deviceKey,
        recipientId: selectedContact.id,
        content: message, // Store decrypted locally
        type: 'text',
        timestamp: new Date(),
        status: 'sending'
      }

      setMessages(prev => [...prev, newMessage])

      // Update contact's last message
      setContacts(prev => prev.map(c =>
        c.id === selectedContact.id
          ? { ...c, lastMessage: message, lastMessageTime: new Date() }
          : c
      ))

      // Send via socket to room
      socketService.sendMessage(currentRoomId, contentToSend)

      // Update message status
      setTimeout(() => {
        setMessages(prev =>
          prev.map(m => m.id === newMessage.id ? { ...m, status: 'sent' as const } : m)
        )
      }, 300)
    } catch {
      addNotification('error', 'Failed to send message')
    }
  }

  const handleTypingStart = () => {
    if (currentRoomId) {
      socketService.startTyping(currentRoomId)
    }
  }

  const handleTypingStop = () => {
    if (currentRoomId) {
      socketService.stopTyping(currentRoomId)
    }
  }

  const handleSettings = () => {
    addNotification('info', 'Settings feature coming soon!')
  }

  const handleInitiateCall = (type: CallType) => {
    addNotification('info', `${type === 'audio' ? 'Voice' : 'Video'} call feature coming soon`)
  }

  const handleFileSelect = async (file: File) => {
    if (!selectedContact || !currentRoomId) {
      addNotification('error', 'No active chat session')
      return
    }

    // Check file size limit
    if (file.size > MAX_FILE_SIZE_BYTES) {
      addNotification('error', `File size must be less than ${MAX_FILE_SIZE_MB}MB`)
      return
    }

    try {
      // Convert file to base64
      const reader = new FileReader()
      reader.onload = async () => {
        const base64Data = reader.result as string
        const base64Content = base64Data.split(',')[1]

        const msgId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
        const newMessage: StoredMessage = {
          id: msgId,
          chatId: selectedContact.id,
          senderId: deviceKey,
          recipientId: selectedContact.id,
          content: file.name,
          type: 'media',
          timestamp: new Date(),
          status: 'sending',
          mediaData: base64Content,
          mimeType: file.type,
          filename: file.name,
          size: file.size
        }

        setMessages(prev => [...prev, newMessage])

        // Update contact's last message
        setContacts(prev => prev.map(c =>
          c.id === selectedContact.id
            ? { ...c, lastMessage: `Sent ${file.type.startsWith('image/') ? 'an image' : 'a file'}`, lastMessageTime: new Date() }
            : c
        ))

        // Send via socket
        socketService.emit('media-upload', {
          to: selectedContact.id,
          roomId: currentRoomId,
          mediaData: base64Content,
          filename: file.name,
          mimeType: file.type
        })

        addNotification('success', 'File sent successfully')

        // Update message status
        setTimeout(() => {
          setMessages(prev =>
            prev.map(m => m.id === newMessage.id ? { ...m, status: 'sent' as const } : m)
          )
        }, 300)
      }

      reader.onerror = () => {
        addNotification('error', 'Failed to read file')
      }

      reader.readAsDataURL(file)
    } catch {
      addNotification('error', 'Failed to send file')
    }
  }

  return (
    <div className="flex h-screen bg-[var(--bg-primary)]">
      {/* Sidebar */}
      <Sidebar
        deviceKey={deviceKey}
        contacts={contacts}
        selectedContactId={selectedContact?.id}
        onSelectContact={handleSelectContact}
        onNewChat={handleNewChat}
        onSettings={handleSettings}
      />

      {/* Chat Area */}
      <ChatArea
        contact={selectedContact}
        messages={messages}
        currentUserId={deviceKey}
        isTyping={isTyping}
        onSendMessage={handleSendMessage}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        onInitiateCall={handleInitiateCall}
        onFileSelect={handleFileSelect}
      />

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        myKey={deviceKey}
        existingContacts={contacts.map(c => c.id)}
        onRequestSent={handleRequestSent}
      />

      {/* Incoming Request Modal */}
      {incomingRequest && (
        <IncomingRequestModal
          fromKey={incomingRequest.fromKey}
          fromName={incomingRequest.fromName}
          onAccept={handleAcceptRequest}
          onReject={handleRejectRequest}
        />
      )}
    </div>
  )
}
