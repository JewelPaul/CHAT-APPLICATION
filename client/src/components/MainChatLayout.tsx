import { useState, useEffect, useCallback, useRef } from 'react'
import { Sidebar } from './Sidebar'
import { ChatArea } from './ChatArea'
import { AddUserModal } from './AddUserModal'
import socketService from '../socket'
import { useNotifications } from './NotificationProvider'
import { generateKeyPair, encryptMessage, decryptMessage, encryptBinary, decryptBinary } from '../encryption'
import { ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES, MAX_IMAGE_SIZE, MAX_VIDEO_SIZE } from './chat/MediaPicker'
import type { Contact, StoredMessage } from '../db'
import type { CallType } from '../types'

// Strict allowed MIME types — mirrored from server/utils.js
const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, 'audio/webm']
const MAX_VOICE_SIZE = 8 * 1024 * 1024  // 8MB

// Configuration constants
const MAX_FILE_SIZE_MB = 8
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

interface MainChatLayoutProps {
  deviceKey: string
  onInitiateCall?: (type: CallType) => void
  onSessionEnd?: () => void
  onContactChange?: (contact: Contact | null) => void
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

export function MainChatLayout({ deviceKey, onInitiateCall, onSessionEnd, onContactChange }: MainChatLayoutProps) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [conversations, setConversations] = useState<Record<string, StoredMessage[]>>({})
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [activeChats, setActiveChats] = useState<Map<string, ActiveChat>>(new Map())
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
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
      onContactChange?.(newContact)
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

    const handleNewMessage = async (msgData: { id: string; fromKey: string; content: string; timestamp: number; roomId: string }) => {
      // Don't add message if it's from us (already added when sending)
      if (msgData.fromKey === deviceKey) return

      // Helper: check if content looks like an encrypted payload (JSON with encrypted + iv fields)
      const isEncryptedPayload = (raw: string): boolean => {
        try {
          const p = JSON.parse(raw)
          return p !== null && typeof p === 'object' && typeof p.encrypted === 'string' && typeof p.iv === 'string'
        } catch {
          return false
        }
      }

      // Use ref to get latest keys — avoids stale closure
      let content = msgData.content
      const keys = roomKeysRef.current.get(msgData.roomId)
      if (keys?.privateKey && keys.peerPublicKey) {
        if (isEncryptedPayload(msgData.content)) {
          try {
            const parsed = JSON.parse(msgData.content) as { encrypted: string; iv: string }
            content = await decryptMessage(parsed.encrypted, parsed.iv, keys.privateKey, keys.peerPublicKey)
          } catch {
            content = '⚠️ Message could not be decrypted. Keys may not be synchronized.'
          }
        }
      } else if (isEncryptedPayload(msgData.content)) {
        // Encrypted payload received before key exchange completed
        content = '⚠️ Message could not be decrypted. Keys may not be synchronized.'
      }

      const newMessage: StoredMessage = {
        id: msgData.id,
        chatId: msgData.fromKey,
        senderId: msgData.fromKey,
        recipientId: deviceKey,
        content,
        type: 'text',
        timestamp: new Date(msgData.timestamp),
        status: 'delivered'
      }

      setConversations(prev => ({
        ...prev,
        [msgData.roomId]: [...(prev[msgData.roomId] || []), newMessage]
      }))

      setContacts(prev => prev.map(c =>
        c.id === msgData.fromKey
          ? { ...c, lastMessage: content, lastMessageTime: new Date(msgData.timestamp) }
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
          // Revoke object URLs for this conversation to free memory
          setConversations(conv => {
            const convMsgs = roomIdForPartner ? (conv[roomIdForPartner] || []) : []
            const urls = convMsgs.map(m => m.objectUrl).filter(Boolean) as string[]
            urls.forEach(url => URL.revokeObjectURL(url))
            const next = { ...conv }
            if (roomIdForPartner) delete next[roomIdForPartner]
            return next
          })
          setCurrentRoomId(null)
          addNotification('warning', 'Chat partner disconnected — session ended')
          onContactChange?.(null)
          onSessionEnd?.()
          return null
        }
        return prev
      })
    }

    // Receive encrypted media (image/video/voice) from partner or echoed back to sender
    const handleMediaMessage = async (msgData: {
      id: string
      from: string
      mimeType: string
      size: number
      filename?: string
      timestamp: number
      encrypted?: string
      iv?: string
      mediaData?: string
      roomId?: string
    }) => {
      // Skip messages from ourselves (already added locally)
      if (msgData.from === deviceKey) return

      let objectUrl: string | undefined
      let mediaData: string | undefined

      const roomId = msgData.roomId || partnerToRoom.current.get(msgData.from)
      const keys = roomId ? roomKeysRef.current.get(roomId) : undefined

      if (msgData.encrypted && msgData.iv) {
        // Encrypted binary media — decrypt using session key
        if (keys?.privateKey && keys.peerPublicKey) {
          try {
            const decrypted = await decryptBinary(msgData.encrypted, msgData.iv, keys.privateKey, keys.peerPublicKey)
            const blob = new Blob([decrypted], { type: msgData.mimeType })
            objectUrl = URL.createObjectURL(blob)
          } catch {
            addNotification('error', 'Media could not be decrypted')
            return
          }
        } else {
          addNotification('error', 'Cannot decrypt media — keys not ready')
          return
        }
      } else if (msgData.mediaData) {
        // Unencrypted fallback (legacy or before key exchange)
        mediaData = msgData.mediaData
      }

      const newMessage: StoredMessage = {
        id: msgData.id || `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        chatId: msgData.from,
        senderId: msgData.from,
        recipientId: deviceKey,
        content: '',
        type: 'media',
        timestamp: new Date(msgData.timestamp || Date.now()),
        status: 'delivered',
        mimeType: msgData.mimeType,
        filename: msgData.filename,
        size: msgData.size,
        objectUrl,
        mediaData
      }

      if (!roomId) {
        // Revoke any created objectUrl to avoid memory leak before returning
        if (objectUrl) URL.revokeObjectURL(objectUrl)
        return
      }

      setConversations(prev => ({
        ...prev,
        [roomId]: [...(prev[roomId] || []), newMessage]
      }))

      setContacts(prev => prev.map(c =>
        c.id === msgData.from
          ? {
              ...c,
              lastMessage: msgData.mimeType?.startsWith('image/') ? '📷 Image' :
                           msgData.mimeType?.startsWith('video/') ? '🎥 Video' : '🎙 Voice message',
              lastMessageTime: new Date(msgData.timestamp || Date.now())
            }
          : c
      ))
    }

    const handleMediaError = (data: { error: string }) => {
      addNotification('error', data.error || 'Failed to send media')
    }

    socketService.on('connection-established', handleConnectionEstablished)
    socketService.on('key-exchange', handleKeyExchange)
    socketService.on('new-message', handleNewMessage)
    socketService.on('media-message', handleMediaMessage)
    socketService.on('media-error', handleMediaError)
    socketService.on('user-typing', handleUserTyping)
    socketService.on('user-stopped-typing', handleUserStoppedTyping)
    socketService.on('user-not-found', handleUserNotFound)
    socketService.on('request-rejected', handleRequestRejected)
    socketService.on('user-offline', handleUserOffline)

    return () => {
      socketService.off('connection-established', handleConnectionEstablished)
      socketService.off('key-exchange', handleKeyExchange)
      socketService.off('new-message', handleNewMessage)
      socketService.off('media-message', handleMediaMessage)
      socketService.off('media-error', handleMediaError)
      socketService.off('user-typing', handleUserTyping)
      socketService.off('user-stopped-typing', handleUserStoppedTyping)
      socketService.off('user-not-found', handleUserNotFound)
      socketService.off('request-rejected', handleRequestRejected)
      socketService.off('user-offline', handleUserOffline)
    }
    // deviceKey and addNotification are stable; updateRoomKeys is stable (useCallback)
    // onSessionEnd and onContactChange are stable (useCallback in App.tsx)
    // roomKeysRef is always current — no need to re-register on every key change
  }, [deviceKey, addNotification, updateRoomKeys, onSessionEnd, onContactChange])

  useEffect(() => {
    if (selectedContact) {
      const activeChat = activeChats.get(selectedContact.id)
      if (activeChat) setCurrentRoomId(activeChat.roomId)
    } else {
      setCurrentRoomId(null)
    }
  }, [selectedContact, activeChats])

  const handleSelectContact = useCallback((contact: Contact) => {
    setSelectedContact(contact)
    const activeChat = activeChats.get(contact.id)
    if (activeChat) setCurrentRoomId(activeChat.roomId)
    onContactChange?.(contact)
    setIsMobileSidebarOpen(false)
  }, [onContactChange, activeChats])

  const handleNewChat = () => setIsAddUserModalOpen(true)

  const handleRequestSent = (targetKey: string) => {
    addNotification('info', `Connection request sent to ${targetKey}`)
    setTimeout(() => setIsAddUserModalOpen(false), 1500)
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

      setConversations(prev => ({
        ...prev,
        [currentRoomId]: [...(prev[currentRoomId] || []), newMessage]
      }))
      setContacts(prev => prev.map(c =>
        c.id === selectedContact.id
          ? { ...c, lastMessage: message, lastMessageTime: new Date() }
          : c
      ))

      socketService.sendMessage(currentRoomId, contentToSend)

      setTimeout(() => {
        setConversations(prev => ({
          ...prev,
          [currentRoomId]: (prev[currentRoomId] || []).map(m =>
            m.id === newMessage.id ? { ...m, status: 'sent' as const } : m
          )
        }))
      }, 300)
    } catch {
      addNotification('error', 'Failed to send message')
    }
  }

  const handleTypingStart = () => { if (currentRoomId) socketService.startTyping(currentRoomId) }
  const handleTypingStop = () => { if (currentRoomId) socketService.stopTyping(currentRoomId) }

  // Shared helper: encrypt a binary blob and emit via media-upload, add message locally
  const sendMediaBlob = useCallback(async (blob: Blob, mimeType: string, filename: string) => {
    if (!selectedContact || !currentRoomId) {
      addNotification('error', 'No active chat session')
      return
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      addNotification('error', `File type "${mimeType}" is not allowed`)
      return
    }

    // Validate size
    const maxSize = mimeType.startsWith('image/') ? MAX_IMAGE_SIZE
                  : mimeType.startsWith('video/') ? MAX_VIDEO_SIZE
                  : MAX_VOICE_SIZE
    if (blob.size > maxSize) {
      const maxMB = Math.round(maxSize / (1024 * 1024))
      addNotification('error', `File too large (max ${maxMB}MB for this type)`)
      return
    }

    try {
      const arrayBuffer = await blob.arrayBuffer()
      const keys = roomKeysRef.current.get(currentRoomId)
      const msgId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

      // Create local object URL for immediate display
      const localBlob = new Blob([arrayBuffer], { type: mimeType })
      const objectUrl = URL.createObjectURL(localBlob)

      const newMessage: StoredMessage = {
        id: msgId,
        chatId: selectedContact.id,
        senderId: deviceKey,
        recipientId: selectedContact.id,
        content: '',
        type: 'media',
        timestamp: new Date(),
        status: 'sending',
        mimeType,
        filename,
        size: blob.size,
        objectUrl
      }

      setConversations(prev => ({
        ...prev,
        [currentRoomId]: [...(prev[currentRoomId] || []), newMessage]
      }))
      setContacts(prev => prev.map(c =>
        c.id === selectedContact.id
          ? {
              ...c,
              lastMessage: mimeType.startsWith('image/') ? '📷 Image' :
                           mimeType.startsWith('video/') ? '🎥 Video' : '🎙 Voice message',
              lastMessageTime: new Date()
            }
          : c
      ))

      let payload: Record<string, unknown>

      if (keys?.privateKey && keys.peerPublicKey) {
        // Encrypt binary data using shared session key
        const { encrypted, iv } = await encryptBinary(arrayBuffer, keys.privateKey, keys.peerPublicKey)
        payload = {
          to: selectedContact.id,
          roomId: currentRoomId,
          encrypted,
          iv,
          // mediaData is set to the encrypted data so server can validate payload size
          mediaData: encrypted,
          mimeType,
          filename,
          size: blob.size
        }
      } else {
        // No encryption key yet — send as plain base64 (best-effort)
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const result = reader.result as string
            resolve(result.split(',')[1])
          }
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
        payload = {
          to: selectedContact.id,
          roomId: currentRoomId,
          mediaData: base64,
          mimeType,
          filename,
          size: blob.size
        }
      }

      socketService.emit('media-upload', payload)

      setTimeout(() => {
        setConversations(prev => ({
          ...prev,
          [currentRoomId]: (prev[currentRoomId] || []).map(m =>
            m.id === newMessage.id ? { ...m, status: 'sent' as const } : m
          )
        }))
      }, 300)
    } catch {
      addNotification('error', 'Failed to send media')
    }
  }, [selectedContact, currentRoomId, deviceKey, addNotification])

  const handleFileSelect = useCallback(async (file: File) => {
    // Strict client-side MIME validation
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      addNotification('error', `File type "${file.type}" is not allowed. Only images (JPEG/PNG/WebP/GIF) and videos (MP4/WebM) are supported.`)
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      addNotification('error', `File size must be less than ${MAX_FILE_SIZE_MB}MB`)
      return
    }
    await sendMediaBlob(file, file.type, file.name)
  }, [sendMediaBlob, addNotification])

  const handleVoiceSend = useCallback(async (blob: Blob) => {
    // Voice messages are always audio/webm from MediaRecorder
    const mimeType = blob.type.startsWith('audio/') ? blob.type : 'audio/webm'
    await sendMediaBlob(blob, mimeType, 'voice-message.webm')
  }, [sendMediaBlob])

  const isEncryptionReady = currentRoomId ? (encryptionReady.get(currentRoomId) ?? false) : false
  const activeMessages = currentRoomId ? (conversations[currentRoomId] || []) : []

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
          currentRoomId={currentRoomId}
          isEncryptionReady={isEncryptionReady}
        />
      </div>

      {/* Chat Area */}
      <ChatArea
        contact={selectedContact}
        messages={activeMessages}
        currentUserId={deviceKey}
        isTyping={isTyping}
        onSendMessage={handleSendMessage}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        onFileSelect={handleFileSelect}
        onVoiceSend={handleVoiceSend}
        isEncryptionReady={isEncryptionReady}
        onOpenSidebar={() => setIsMobileSidebarOpen(true)}
        onInitiateCall={onInitiateCall}
      />

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        myKey={deviceKey}
        existingContacts={contacts.map(c => c.id)}
        onRequestSent={handleRequestSent}
      />
    </div>
  )
}
