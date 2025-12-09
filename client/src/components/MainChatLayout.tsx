import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { ChatArea } from './ChatArea'
import { AddUserModal } from './AddUserModal'
import { IncomingRequestModal } from './IncomingRequestModal'
import { getDatabase } from '../db'
import socketService from '../socket'
import { useNotifications } from './NotificationProvider'
import type { Contact, StoredMessage } from '../db'
import type { CallType } from '../types'

interface MainChatLayoutProps {
  deviceKey: string
}

interface ActiveChat {
  partnerKey: string
  partnerName: string
  roomId: string
}

export function MainChatLayout({ deviceKey }: MainChatLayoutProps) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<StoredMessage[]>([])
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [activeChats, setActiveChats] = useState<Map<string, ActiveChat>>(new Map())
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [incomingRequest, setIncomingRequest] = useState<{ fromKey: string; fromName: string } | null>(null)
  const { addNotification } = useNotifications()

  // Load contacts on mount
  useEffect(() => {
    const loadContacts = async () => {
      try {
        const db = await getDatabase()
        const allContacts = await db.getContacts()
        setContacts(allContacts)
      } catch (error) {
        console.error('Failed to load contacts:', error)
      }
    }
    loadContacts()
  }, [])

  // Set up socket listeners
  useEffect(() => {
    // Handle incoming connection request
    const handleIncomingRequest = (data: { fromKey: string; fromName: string }) => {
      console.log('Incoming request from:', data)
      setIncomingRequest(data)
      addNotification('info', `Connection request from ${data.fromName}`)
    }

    // Handle connection established
    const handleConnectionEstablished = async (data: { partnerKey: string; partnerName: string; roomId: string }) => {
      console.log('Connection established:', data)
      
      // Add to active chats
      setActiveChats(prev => new Map(prev).set(data.partnerKey, data))
      
      // Create or update contact in database
      try {
        const db = await getDatabase()
        const existingContact = await db.getContact(data.partnerKey)
        
        if (!existingContact) {
          const newContact: Contact = {
            id: data.partnerKey,
            username: data.partnerName,
            displayName: data.partnerName,
            status: 'online',
            lastSeen: new Date(),
            createdAt: new Date()
          }
          await db.addContact(newContact)
          
          // Reload contacts
          const allContacts = await db.getContacts()
          setContacts(allContacts)
          
          // Auto-select the new contact
          setSelectedContact(newContact)
          setCurrentRoomId(data.roomId)
        } else {
          setSelectedContact(existingContact)
          setCurrentRoomId(data.roomId)
        }
      } catch (error) {
        console.error('Failed to create contact:', error)
      }
      
      addNotification('success', `Connected with ${data.partnerName}`)
    }

    // Handle new message
    const handleNewMessage = async (data: { id: string; fromKey: string; content: string; timestamp: number; roomId: string }) => {
      console.log('New message:', data)
      
      // Don't add message if it's from us (already added when sending)
      if (data.fromKey === deviceKey) {
        return
      }
      
      // Find contact by device key
      try {
        const db = await getDatabase()
        const contact = await db.getContact(data.fromKey)
        
        if (contact) {
          // Save message to IndexedDB
          const newMessage: StoredMessage = {
            id: data.id,
            chatId: contact.id,
            senderId: data.fromKey,
            recipientId: deviceKey,
            content: data.content,
            type: 'text',
            timestamp: new Date(data.timestamp),
            status: 'delivered'
          }
          
          await db.saveMessage(newMessage)
          
          // Update UI if this contact is selected
          if (selectedContact?.id === contact.id) {
            setMessages(prev => [...prev, newMessage])
          }
          
          // Update contact's last message
          await db.updateContact(contact.id, {
            lastMessage: data.content,
            lastMessageTime: new Date(data.timestamp),
            unreadCount: selectedContact?.id === contact.id ? 0 : (contact.unreadCount || 0) + 1
          })
          
          // Reload contacts to update sidebar
          const allContacts = await db.getContacts()
          setContacts(allContacts)
        }
      } catch (error) {
        console.error('Failed to handle new message:', error)
      }
    }

    // Handle typing indicators
    const handleUserTyping = (data: { userKey: string }) => {
      if (selectedContact?.id === data.userKey) {
        setIsTyping(true)
      }
    }

    const handleUserStoppedTyping = (data: { userKey: string }) => {
      if (selectedContact?.id === data.userKey) {
        setIsTyping(false)
      }
    }

    // Handle request sent confirmation
    const handleRequestSent = (data: { targetKey: string }) => {
      console.log('Request sent to:', data.targetKey)
    }

    // Handle user not found
    const handleUserNotFound = (data: { targetKey: string }) => {
      addNotification('error', `User ${data.targetKey} not found or offline`)
    }

    // Handle request rejected
    const handleRequestRejected = () => {
      addNotification('warning', 'Connection request was declined')
    }

    // Register listeners
    socketService.on('incoming-request', handleIncomingRequest)
    socketService.on('connection-established', handleConnectionEstablished)
    socketService.on('new-message', handleNewMessage)
    socketService.on('user-typing', handleUserTyping)
    socketService.on('user-stopped-typing', handleUserStoppedTyping)
    socketService.on('request-sent', handleRequestSent)
    socketService.on('user-not-found', handleUserNotFound)
    socketService.on('request-rejected', handleRequestRejected)

    return () => {
      socketService.off('incoming-request', handleIncomingRequest)
      socketService.off('connection-established', handleConnectionEstablished)
      socketService.off('new-message', handleNewMessage)
      socketService.off('user-typing', handleUserTyping)
      socketService.off('user-stopped-typing', handleUserStoppedTyping)
      socketService.off('request-sent', handleRequestSent)
      socketService.off('user-not-found', handleUserNotFound)
      socketService.off('request-rejected', handleRequestRejected)
    }
  }, [selectedContact, deviceKey, addNotification])

  // Load messages when contact is selected
  useEffect(() => {
    if (selectedContact) {
      loadMessages(selectedContact.id)
      // Set room ID if we have an active chat with this contact
      const activeChat = activeChats.get(selectedContact.id)
      if (activeChat) {
        setCurrentRoomId(activeChat.roomId)
      }
    } else {
      setMessages([])
      setCurrentRoomId(null)
    }
  }, [selectedContact, activeChats])

  const loadMessages = async (contactId: string) => {
    try {
      const db = await getDatabase()
      const chatMessages = await db.getMessages(contactId)
      setMessages(chatMessages)
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const handleSelectContact = async (contact: Contact) => {
    setSelectedContact(contact)
    
    // Mark messages as read
    if (contact.unreadCount && contact.unreadCount > 0) {
      try {
        const db = await getDatabase()
        await db.updateContact(contact.id, { unreadCount: 0 })
        
        // Reload contacts
        const allContacts = await db.getContacts()
        setContacts(allContacts)
      } catch (error) {
        console.error('Failed to mark messages as read:', error)
      }
    }
  }

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
      console.log('Accepting request from:', incomingRequest.fromKey)
      socketService.acceptRequest(incomingRequest.fromKey)
      setIncomingRequest(null)
    }
  }

  const handleRejectRequest = () => {
    if (incomingRequest) {
      console.log('Rejecting request from:', incomingRequest.fromKey)
      socketService.rejectRequest(incomingRequest.fromKey)
      setIncomingRequest(null)
    }
  }

  const handleSendMessage = async (message: string) => {
    if (!selectedContact || !currentRoomId) {
      addNotification('error', 'No active chat session')
      return
    }

    try {
      // Save message to IndexedDB first
      const db = await getDatabase()
      const msgId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
      const newMessage: StoredMessage = {
        id: msgId,
        chatId: selectedContact.id,
        senderId: deviceKey,
        recipientId: selectedContact.id,
        content: message,
        type: 'text',
        timestamp: new Date(),
        status: 'sending'
      }
      
      await db.saveMessage(newMessage)
      setMessages(prev => [...prev, newMessage])
      
      // Update contact's last message
      await db.updateContact(selectedContact.id, {
        lastMessage: message,
        lastMessageTime: new Date()
      })
      
      // Send via socket to room
      socketService.sendMessage(currentRoomId, message)
      
      // Update message status
      setTimeout(async () => {
        await db.updateMessageStatus(newMessage.id, 'sent')
        setMessages(prev => 
          prev.map(m => m.id === newMessage.id ? { ...m, status: 'sent' as const } : m)
        )
      }, 300)
    } catch (error) {
      console.error('Failed to send message:', error)
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

  return (
    <div className="flex h-screen bg-[#0a0a0f]">
      {/* Sidebar */}
      <Sidebar
        deviceKey={deviceKey}
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
