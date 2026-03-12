import { useState } from 'react'
import { Search, Plus, Copy, Check, ShieldCheck, ShieldAlert } from 'lucide-react'
import { ContactItem } from './ContactItem'
import { EmptyState } from './EmptyState'
import { copyDeviceKeyToClipboard } from '../utils/deviceKey'
import type { Contact } from '../db'

interface SidebarProps {
  deviceKey: string
  contacts: Contact[]
  selectedContactId?: string
  onSelectContact: (contact: Contact) => void
  onNewChat: () => void
  currentRoomId?: string | null
  isEncryptionReady?: boolean
}

export function Sidebar({
  deviceKey,
  contacts,
  selectedContactId,
  onSelectContact,
  onNewChat,
  currentRoomId,
  isEncryptionReady = false
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [keyCopied, setKeyCopied] = useState(false)

  const filteredContacts = searchQuery.trim()
    ? contacts.filter(c =>
        c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : contacts

  const handleCopyCode = async () => {
    try {
      await copyDeviceKeyToClipboard(deviceKey)
      setKeyCopied(true)
      setTimeout(() => setKeyCopied(false), 2000)
    } catch {
      // Ignore clipboard errors
    }
  }

  const hasActiveChat = !!currentRoomId

  return (
    <div className="flex flex-col h-full w-72 lg:w-80 bg-[var(--bg-secondary)] border-r border-[var(--border)]">
      {/* App title */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">Zion Chat</h1>
      </div>

      {/* Invite Code Section */}
      <div className="px-4 pb-3">
        <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
          Your Invite Code
        </p>
        <div className="flex items-center gap-2 p-2.5 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)] group">
          <span className="flex-1 font-mono text-sm font-medium text-[var(--text-primary)] tracking-widest min-w-0 truncate">
            {deviceKey}
          </span>
          <button
            onClick={handleCopyCode}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="Copy invite code"
          >
            {keyCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
        {/* Online status */}
        <div className="flex items-center gap-1.5 mt-2 px-1">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-[var(--text-secondary)]">Online</span>
        </div>
      </div>

      {/* Session Controls */}
      {hasActiveChat && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-1.5">
            {isEncryptionReady ? (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Encrypted
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <ShieldAlert className="w-3.5 h-3.5" />
                Securing...
              </span>
            )}
          </div>
        </div>
      )}

      {/* New Chat Button */}
      <div className="px-4 pb-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
      </div>

      {/* Section label */}
      <div className="px-4 pb-2">
        <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
          Messages
        </p>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto">
        {filteredContacts.length > 0 ? (
          filteredContacts.map(contact => (
            <ContactItem
              key={contact.id}
              id={contact.id}
              username={contact.username}
              displayName={contact.displayName}
              avatar={contact.avatar}
              lastMessage={contact.lastMessage}
              lastMessageTime={contact.lastMessageTime}
              unreadCount={contact.unreadCount}
              isOnline={contact.status === 'accepted' || contact.status === 'online'}
              isSelected={contact.id === selectedContactId}
              onClick={() => onSelectContact(contact)}
            />
          ))
        ) : (
          <div className="h-full flex items-center justify-center p-6">
            <EmptyState
              type={searchQuery ? 'no-search-results' : 'no-contacts'}
              message={searchQuery ? `No contacts found for "${searchQuery}"` : 'No conversations yet'}
            />
          </div>
        )}
      </div>
    </div>
  )
}
