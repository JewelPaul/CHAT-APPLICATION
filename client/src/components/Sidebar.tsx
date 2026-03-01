import { useState } from 'react'
import { Search, Plus, Settings, Menu, Copy, Check, Key } from 'lucide-react'
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
  onSettings: () => void
}

export function Sidebar({
  deviceKey,
  contacts,
  selectedContactId,
  onSelectContact,
  onNewChat,
  onSettings
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [keyCopied, setKeyCopied] = useState(false)

  // Filter contacts by search query
  const filteredContacts = searchQuery.trim()
    ? contacts.filter(
        (c) =>
          c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : contacts

  return (
    <div
      className={`flex flex-col h-full bg-[var(--bg-secondary)] border-r border-[var(--border)] transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-80 lg:w-96'
      }`}
    >
      {/* Header - Large Title */}
      {!isCollapsed && (
        <div className="p-6 pb-4">
          <h1 className="text-[var(--text-2xl)] font-semibold text-[var(--text-primary)]" style={{ letterSpacing: '-0.02em' }}>
            Chats
          </h1>
        </div>
      )}

      {/* Collapse Button (Mobile) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="lg:hidden p-4 hover:bg-[rgba(255,255,255,0.05)] transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5 text-[var(--text-secondary)]" />
      </button>

      {!isCollapsed && (
        <>
          {/* Search Bar - Pill Shaped */}
          <div className="px-4 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="input-field w-full pl-9 pr-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Device Key Section - Royal Gold Card */}
          <div className="px-4 pb-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gold-primary">
                <Key className="w-4 h-4" />
                <span className="text-[var(--text-xs)] font-semibold uppercase tracking-wide">Your Key</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-bg-card to-bg-hover rounded-xl border-2 border-gold-primary/20 hover:border-gold-primary/40 transition-all">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-mono text-[var(--text-sm)] font-medium truncate">{deviceKey}</p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await copyDeviceKeyToClipboard(deviceKey);
                      setKeyCopied(true);
                      setTimeout(() => setKeyCopied(false), 2000);
                    } catch (error) {
                      console.error('Failed to copy key:', error);
                    }
                  }}
                  className="flex items-center justify-center w-9 h-9 bg-gold-primary hover:bg-gold-light text-black rounded-lg transition-all active:scale-95 shadow-glow"
                  title="Copy key"
                >
                  {keyCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center gap-2 px-1">
                <div className="w-2 h-2 bg-online rounded-full animate-pulse" />
                <span className="text-[var(--text-xs)] text-gold-primary font-medium">Online</span>
              </div>
            </div>
          </div>

          {/* Section Header */}
          <div className="px-4 pb-2">
            <h2 className="text-[var(--text-xs)] font-medium uppercase tracking-wide text-[var(--text-secondary)]">
              Messages
            </h2>
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto">
            {filteredContacts.length > 0 ? (
              <div>
                {filteredContacts.map((contact) => (
                  <ContactItem
                    key={contact.id}
                    id={contact.id}
                    username={contact.username}
                    displayName={contact.displayName}
                    avatar={contact.avatar}
                    lastMessage={contact.lastMessage}
                    lastMessageTime={contact.lastMessageTime}
                    unreadCount={contact.unreadCount}
                    isOnline={contact.status === 'accepted'}
                    isSelected={contact.id === selectedContactId}
                    onClick={() => onSelectContact(contact)}
                  />
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-6">
                <EmptyState
                  type={searchQuery ? 'no-search-results' : 'no-contacts'}
                  message={
                    searchQuery
                      ? `No contacts found for "${searchQuery}"`
                      : 'No conversations yet'
                  }
                />
              </div>
            )}
          </div>

          {/* New Chat Button - Floating at Bottom */}
          <div className="p-4 border-t border-[var(--border)]">
            <button
              onClick={onNewChat}
              className="btn btn-primary w-full"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </button>
          </div>
        </>
      )}

      {isCollapsed && (
        <div className="flex flex-col items-center gap-4 py-4">
          {/* Collapsed state - show icons only */}
          <button
            onClick={onNewChat}
            className="p-3 hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors"
            title="New Chat"
          >
            <Plus className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
          <button
            onClick={onSettings}
            className="p-3 hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>
      )}
    </div>
  )
}
