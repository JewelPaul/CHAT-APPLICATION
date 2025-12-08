import { useState, useEffect } from 'react'
import { Search, Plus, Settings, Menu, Copy, Check, Key } from 'lucide-react'
import { ContactItem } from './ContactItem'
import { EmptyState } from './EmptyState'
import { getDatabase } from '../db'
import { copyDeviceKeyToClipboard } from '../utils/deviceKey'
import type { Contact } from '../db'

interface SidebarProps {
  deviceKey: string
  selectedContactId?: string
  onSelectContact: (contact: Contact) => void
  onNewChat: () => void
  onSettings: () => void
}

export function Sidebar({
  deviceKey,
  selectedContactId,
  onSelectContact,
  onNewChat,
  onSettings
}: SidebarProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [keyCopied, setKeyCopied] = useState(false)

  // Load contacts from IndexedDB
  useEffect(() => {
    loadContacts()
  }, [])

  const loadContacts = async () => {
    try {
      const db = await getDatabase()
      const allContacts = await db.getContacts()
      // Sort by last message time (most recent first)
      const sorted = allContacts.sort((a, b) => {
        const timeA = a.lastMessageTime?.getTime() || 0
        const timeB = b.lastMessageTime?.getTime() || 0
        return timeB - timeA
      })
      setContacts(sorted)
    } catch (error) {
      console.error('Failed to load contacts:', error)
    }
  }

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
      className={`flex flex-col h-full bg-[#12121a] border-r border-gray-800 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-80'
      }`}
    >
      {/* Collapse Button (Mobile) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="lg:hidden p-4 hover:bg-gray-700/50 transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5 text-gray-400" />
      </button>

      {!isCollapsed && (
        <>
          {/* Device Key Section */}
          <div className="p-4 border-b border-gray-800">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-gray-400">
                <Key className="w-4 h-4" />
                <span className="text-xs font-medium">Your Key</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-[#1e1e2e] border border-gray-700 rounded-lg px-3 py-2">
                  <p className="text-white font-mono text-sm truncate">{deviceKey}</p>
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
                  className="flex items-center justify-center w-9 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  title="Copy key"
                >
                  {keyCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-xs text-gray-400">Online</span>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2 bg-[#1e1e2e] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* New Chat Button */}
          <div className="p-3 border-b border-gray-800">
            <button
              onClick={onNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </button>
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto">
            {filteredContacts.length > 0 ? (
              <div className="divide-y divide-gray-800">
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
              <div className="h-full">
                <EmptyState
                  type={searchQuery ? 'no-search-results' : 'no-contacts'}
                  message={
                    searchQuery
                      ? `No contacts found for "${searchQuery}"`
                      : 'Click "New Chat" to start a conversation'
                  }
                />
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="p-3 border-t border-gray-800">
            <button
              onClick={onSettings}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">Settings</span>
            </button>
          </div>
        </>
      )}

      {isCollapsed && (
        <div className="flex flex-col items-center gap-4 py-4">
          {/* Collapsed state - show icons only */}
          <button
            onClick={onNewChat}
            className="p-3 hover:bg-gray-700/50 rounded-lg transition-colors"
            title="New Chat"
          >
            <Plus className="w-5 h-5 text-gray-400" />
          </button>
          <button
            onClick={onSettings}
            className="p-3 hover:bg-gray-700/50 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      )}
    </div>
  )
}
