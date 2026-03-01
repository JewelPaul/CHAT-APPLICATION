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
  onInitiateCall?: (type: CallType) => void
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

export function MainChatLayout({ deviceKey, onInitiateCall }: MainChatLayoutProps) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<StoredMessage[]>([])
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [activeChats, setActiveChats] = useState<Map<string, ActiveChat>>(new Map())
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [incomingRequest, setIncomingRequest] = useState<{ fromKey: string; fromName: string } | null>(null)
  // Ref always holds latest keys — avoids stale closures in socket handlers
  const roomKeysRef = useRef<Map<string, RoomKeys>>(new Map())
  // Explicit partner key → room ID mapping
  const partnerToRoom = useRef<Map<string, string>>(new Map())
  // Track encryption readiness per room
  const [encryptionReady, setEncryptionReady] = useState<Map<string, boolean>>(new Map())
  const encryptionReadyRef = useRef<Map<string, boolean>>(new Map())
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const { addNotification } = useNotifications()

  // Helper: update roomKeys in ref and update encryptionReady state
  const updateRoomKeys = useCallback((updater: (prev: Map<string, RoomKeys>) => Map<string, RoomKeys>) => {
    const next = updater(roomKeysRef.current)
    roomKeysRef.current = next
    // Update encryption readiness state
    for (const [roomId, keys] of next.entries()) {
      const ready = !!(keys.privateKey && keys.peerPublicKey)
      if (encryptionReadyRef.current.get(roomId) !== ready) {
        encryptionReadyRef.current.set(roomId, ready)
        setEncryptionReady(prevReady => {
          const r = new Map(prevReady)
          r.set(roomId, ready)
          return r
        })
      }
    }
  }, [])

  // Set up socket listeners — no roomKeys in dependency array (use ref instead)
  useEffect(() => {
    const handleIncomingRequest = (data: { fromKey: string; fromName: string }) => {
      setIncomingRequest(data)
      addNotification('info', `Connection request from ${data.fromName}`)
    }

    const handleConnectionEstablished = async (data: { partnerKey: string; partnerName: string; roomId: string }) => {
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
      setIsMobileSidebarOpen(false)

      // Generate ECDH key pair for this room session
      try {
        const keys = await generateKeyPair()
        updateRoomKeys(prev => {
          const next = new Map(prev)
          next.set(data.roomId, { privateKey: keys.privateKey, publicKey: keys.publicKey })
          return next
        })
        socketService.sendPublicKey(data.roomId, keys.publicKey)
      } catch {
        // Key generation failed — no encryption for this session
      }

      addNotification('success', `Connected with ${data.partnerName}`)
    }

    const handleKeyExchange = (data: { fromKey: string; publicKey: string; roomId: string }) => {
      updateRoomKeys(prev => {
        const existing = prev.get(data.roomId)
        if (!existing) return prev
        const next = new Map(prev)
        next.set(data.roomId, { ...existing, peerPublicKey: data.publicKey })
        return next
      })
    }

    const handleNewMessage = async (data: { id: string; fromKey: string; content: string; timestamp: number; roomId: string }) => {
      // Don't add message if it's from us (already added when sending)
      if (data.fromKey === deviceKey) return

      // Use ref to get latest keys — avoids stale closure
      let content = data.content
      const keys = roomKeysRef.current.get(data.roomId)
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
          // Decryption failed — show error indicator instead of raw JSON
          content = '⚠️ Decryption failed'
        }
      } else if (data.content.includes('"encrypted"') && data.content.includes('"iv"')) {
        // Looks like encrypted JSON but we don't have keys yet — show error
        content = '⚠️ Decryption failed'
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

      setSelectedContact(prev => {
        if (prev?.id === data.fromKey) {
          setMessages(msgs => [...msgs, newMessage])
        }
        return prev
      })

      setContacts(prev => prev.map(c =>
        c.id === data.fromKey
          ? { ...c, lastMessage: content, lastMessageTime: new Date(data.timestamp) }
          : c
      ))
    }

    const handleUserTyping = (data: { userKey: string }) => {
      setSelectedContact(prev => {
        if (prev?.id === data.userKey) setIsTyping(true)
        return prev
      })
    }

    const handleUserStoppedTyping = (data: { userKey: string }) => {
      setSelectedContact(prev => {
        if (prev?.id === data.userKey) setIsTyping(false)
        return prev
      })
    }

    const handleUserNotFound = (data: { targetKey: string }) => {
      addNotification('error', `User ${data.targetKey} not found or offline`)
    }

    const handleRequestRejected = () => {
      addNotification('warning', 'Connection request was declined')
    }

    const handleUserOffline = (data: { deviceKey: string }) => {
      const key = data.deviceKey
      setContacts(prev => prev.filter(c => c.id !== key))
      setActiveChats(prev => { const next = new Map(prev); next.delete(key); return next })
      const roomIdForPartner = partnerToRoom.current.get(key)
      if (roomIdForPartner) {
        updateRoomKeys(keys => { const next = new Map(keys); next.delete(roomIdForPartner); return next })
        setEncryptionReady(prev => { const next = new Map(prev); next.delete(roomIdForPartner); return next })
        encryptionReadyRef.current.delete(roomIdForPartner)
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
    // deviceKey and addNotification are stable; updateRoomKeys is stable (useCallback)
    // roomKeysRef is always current — no need to re-register on every key change
  }, [deviceKey, addNotification, updateRoomKeys])

  useEffect(() => {
    if (selectedContact) {
      const activeChat = activeChats.get(selectedContact.id)
      if (activeChat) setCurrentRoomId(activeChat.roomId)
    } else {
      setMessages([])
      setCurrentRoomId(null)
    }
  }, [selectedContact, activeChats])

  const handleSelectContact = useCallback((contact: Contact) => {
    setSelectedContact(contact)
    setIsMobileSidebarOpen(false)
  }, [])

  const handleNewChat = () => setIsAddUserModalOpen(true)

  const handleRequestSent = (targetKey: string) => {
    addNotification('info', `Connection request sent to ${targetKey}`)
    setTimeout(() => setIsAddUserModalOpen(false), 1500)
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
    if (message.length > 2048) {
      addNotification('error', 'Message too long (max 2KB)')
      return
    }

    try {
      const msgId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

      let contentToSend = message
      const keys = roomKeysRef.current.get(currentRoomId)
      if (keys?.privateKey && keys.peerPublicKey) {
        try {
          const encrypted = await encryptMessage(message, keys.privateKey, keys.peerPublicKey)
          contentToSend = JSON.stringify(encrypted)
        } catch {
          // Encryption failed — send plaintext (still secured by TLS)
        }
      }

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
      setContacts(prev => prev.map(c =>
        c.id === selectedContact.id
          ? { ...c, lastMessage: message, lastMessageTime: new Date() }
          : c
      ))

      socketService.sendMessage(currentRoomId, contentToSend)

      setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, status: 'sent' as const } : m))
      }, 300)
    } catch {
      addNotification('error', 'Failed to send message')
    }
  }

  const handleTypingStart = () => { if (currentRoomId) socketService.startTyping(currentRoomId) }
  const handleTypingStop = () => { if (currentRoomId) socketService.stopTyping(currentRoomId) }

  const handleFileSelect = async (file: File) => {
    if (!selectedContact || !currentRoomId) {
      addNotification('error', 'No active chat session')
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      addNotification('error', `File size must be less than ${MAX_FILE_SIZE_MB}MB`)
      return
    }

    try {
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
        setContacts(prev => prev.map(c =>
          c.id === selectedContact.id
            ? { ...c, lastMessage: `Sent ${file.type.startsWith('image/') ? 'an image' : 'a file'}`, lastMessageTime: new Date() }
            : c
        ))
        socketService.emit('media-upload', {
          to: selectedContact.id,
          roomId: currentRoomId,
          mediaData: base64Content,
          filename: file.name,
          mimeType: file.type
        })
        addNotification('success', 'File sent successfully')
        setTimeout(() => {
          setMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, status: 'sent' as const } : m))
        }, 300)
      }
      reader.onerror = () => addNotification('error', 'Failed to read file')
      reader.readAsDataURL(file)
    } catch {
      addNotification('error', 'Failed to send file')
    }
  }

  const isEncryptionReady = currentRoomId ? (encryptionReady.get(currentRoomId) ?? false) : false

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] overflow-hidden">
      {/* Mobile overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-30
        transform transition-transform duration-300 ease-in-out lg:transform-none
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex-shrink-0
      `}>
        <Sidebar
          deviceKey={deviceKey}
          contacts={contacts}
          selectedContactId={selectedContact?.id}
          onSelectContact={handleSelectContact}
          onNewChat={handleNewChat}
          onInitiateCall={onInitiateCall}
          currentRoomId={currentRoomId}
          isEncryptionReady={isEncryptionReady}
        />
      </div>

      {/* Chat Area */}
      <ChatArea
        contact={selectedContact}
        messages={messages}
        currentUserId={deviceKey}
        isTyping={isTyping}
        onSendMessage={handleSendMessage}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        onFileSelect={handleFileSelect}
        isEncryptionReady={isEncryptionReady}
        onOpenSidebar={() => setIsMobileSidebarOpen(true)}
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
