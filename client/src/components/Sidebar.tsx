import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Plus, Copy, Check, Edit2, X, ShieldCheck, ShieldAlert } from 'lucide-react'
import { ContactItem } from './ContactItem'
import { EmptyState } from './EmptyState'
import { copyDeviceKeyToClipboard, isValidInviteCode, saveInviteCode } from '../utils/deviceKey'
import socketService from '../socket'
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
  const [isEditingCode, setIsEditingCode] = useState(false)
  const [editCodeValue, setEditCodeValue] = useState('')
  const [editCodeError, setEditCodeError] = useState('')
  const [isSavingCode, setIsSavingCode] = useState(false)
  const editInputRef = useRef<HTMLInputElement>(null)

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

  const startEditCode = () => {
    setEditCodeValue(deviceKey)
    setEditCodeError('')
    setIsEditingCode(true)
    setTimeout(() => editInputRef.current?.focus(), 50)
  }

  const cancelEditCode = () => {
    setIsEditingCode(false)
    setEditCodeError('')
  }

  const handleEditCodeChange = (val: string) => {
    // Allow typing with auto-format: uppercase, alphanum + dash
    const upper = val.toUpperCase()
    // Strip invalid chars, allow A-Z 0-9 and dash
    const cleaned = upper.replace(/[^A-Z0-9-]/g, '')
    setEditCodeValue(cleaned)
    setEditCodeError('')
  }

  const submitNewCode = useCallback(() => {
    const newCode = editCodeValue.trim()
    if (!isValidInviteCode(newCode)) {
      setEditCodeError('Format must be XXXXX-XXXX (e.g. JWELL-0291)')
      return
    }
    if (newCode === deviceKey) {
      setIsEditingCode(false)
      return
    }

    setIsSavingCode(true)
    setEditCodeError('')

    socketService.emit('update-invite-code', { newCode, displayName: newCode })

    const handleSuccess = (data: unknown) => {
      const d = data as { newCode: string }
      saveInviteCode(d.newCode)
      setIsSavingCode(false)
      setIsEditingCode(false)
      // Reload page to re-register with new code
      window.location.reload()
    }

    const handleError = (data: unknown) => {
      const d = data as { message: string }
      setEditCodeError(d.message || 'Code unavailable')
      setIsSavingCode(false)
    }

    socketService.on('invite-code-updated', handleSuccess)
    socketService.on('invite-code-error', handleError)

    setTimeout(() => {
      socketService.off('invite-code-updated', handleSuccess)
      socketService.off('invite-code-error', handleError)
    }, 5000)
  }, [editCodeValue, deviceKey])

  // Cancel on Escape, submit on Enter
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEditingCode) cancelEditCode()
      if (e.key === 'Enter' && isEditingCode) submitNewCode()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isEditingCode, submitNewCode])

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
        {isEditingCode ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <input
                ref={editInputRef}
                type="text"
                value={editCodeValue}
                onChange={e => handleEditCodeChange(e.target.value)}
                placeholder="XXXXX-XXXX"
                maxLength={10}
                className="flex-1 font-mono text-sm px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] tracking-widest uppercase"
                disabled={isSavingCode}
              />
              <button
                onClick={submitNewCode}
                disabled={isSavingCode}
                className="px-3 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium disabled:opacity-50 transition-colors"
              >
                {isSavingCode ? '...' : 'Save'}
              </button>
              <button
                onClick={cancelEditCode}
                disabled={isSavingCode}
                className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {editCodeError && (
              <p className="text-xs text-red-500 pl-1">{editCodeError}</p>
            )}
            <p className="text-xs text-[var(--text-secondary)] pl-1">Format: ABCDE-1234 (uppercase alphanumeric)</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2.5 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)] group">
            <span className="flex-1 font-mono text-sm font-medium text-[var(--text-primary)] tracking-widest min-w-0 truncate">
              {deviceKey}
            </span>
            <button
              onClick={startEditCode}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-all"
              title="Edit invite code"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCopyCode}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title="Copy invite code"
            >
              {keyCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
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
