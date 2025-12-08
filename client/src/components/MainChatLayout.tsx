import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { ChatArea } from './ChatArea'
import { AddUserModal } from './AddUserModal'
import { getDatabase } from '../db'
import socketService from '../socket'
import { useNotifications } from './NotificationProvider'
import type { Contact, StoredMessage } from '../db'
import type { CallType } from '../types'

interface MainChatLayoutProps {
  deviceKey: string
}

export function MainChatLayout({ deviceKey }: MainChatLayoutProps) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<StoredMessage[]>([])
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const { addNotification } = useNotifications()

  // Load messages when contact is selected
  useEffect(() => {
    if (selectedContact) {
      loadMessages(selectedContact.id)
    } else {
      setMessages([])
    }
  }, [selectedContact])

  // Set up socket listeners for real-time messages
  useEffect(() => {
    const handleMessage = async (data: { from: string; message: string; timestamp: string }) => {
      // Find contact by username or ID
      const db = await getDatabase()
      const contacts = await db.getContacts()
      const contact = contacts.find(c => c.username === data.from)
      
      if (contact) {
        // Save message to IndexedDB
        const newMessage: StoredMessage = {
          id: `msg_${Date.now()}`,
          chatId: contact.id,
          senderId: contact.id,
          recipientId: deviceKey,
          content: data.message,
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
          lastMessage: data.message,
          lastMessageTime: new Date(data.timestamp),
          unreadCount: selectedContact?.id === contact.id ? 0 : (contact.unreadCount || 0) + 1
        })
      }
    }

    const handleTypingStart = (data: { from: string }) => {
      if (selectedContact?.username === data.from) {
        setIsTyping(true)
      }
    }

    const handleTypingStop = (data: { from: string }) => {
      if (selectedContact?.username === data.from) {
        setIsTyping(false)
      }
    }

    socketService.on('message', handleMessage)
    socketService.on('typing-start', handleTypingStart)
    socketService.on('typing-stop', handleTypingStop)

    return () => {
      socketService.off('message', handleMessage)
      socketService.off('typing-start', handleTypingStart)
      socketService.off('typing-stop', handleTypingStop)
    }
  }, [selectedContact, deviceKey])

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
    if (contact.unreadCount > 0) {
      try {
        const db = await getDatabase()
        await db.updateContact(contact.id, { unreadCount: 0 })
      } catch (error) {
        console.error('Failed to mark messages as read:', error)
      }
    }
  }

  // Load contacts for the modal
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

  const handleNewChat = () => {
    setIsAddUserModalOpen(true)
  }

  const handleRequestSent = (targetKey: string) => {
    addNotification('info', `Connection request sent to ${targetKey}`)
    // Optionally close the modal after a delay
    setTimeout(() => {
      setIsAddUserModalOpen(false)
    }, 2000)
  }

  const handleSendMessage = async (message: string) => {
    if (!selectedContact) return

    try {
      // Save message to IndexedDB
      const db = await getDatabase()
      const newMessage: StoredMessage = {
        id: `msg_${Date.now()}`,
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
      
      // Send via socket
      socketService.emit('send-message', {
        to: selectedContact.username,
        message,
        timestamp: new Date().toISOString()
      })
      
      // Update message status
      setTimeout(async () => {
        await db.updateMessageStatus(newMessage.id, 'sent')
        setMessages(prev => 
          prev.map(m => m.id === newMessage.id ? { ...m, status: 'sent' as const } : m)
        )
      }, 500)
    } catch (error) {
      console.error('Failed to send message:', error)
      addNotification('error', 'Failed to send message')
    }
  }

  const handleTypingStart = () => {
    if (selectedContact) {
      socketService.emit('typing-start', { to: selectedContact.username })
    }
  }

  const handleTypingStop = () => {
    if (selectedContact) {
      socketService.emit('typing-stop', { to: selectedContact.username })
    }
  }

  const handleSettings = () => {
    addNotification('info', 'Settings feature coming soon!')
  }

  const handleInitiateCall = (type: CallType) => {
    addNotification('info', `${type === 'audio' ? 'Voice' : 'Video'} call feature available`)
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
    </div>
  )
}
