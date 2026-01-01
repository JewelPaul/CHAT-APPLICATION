import { formatDistanceToNow } from '../utils'
import { Avatar } from './ui/Avatar'

interface ContactItemProps {
  id: string
  username: string
  displayName: string
  avatar?: string
  lastMessage?: string
  lastMessageTime?: Date
  unreadCount?: number
  isOnline?: boolean
  isSelected?: boolean
  onClick: () => void
}

export function ContactItem({
  username,
  displayName,
  avatar,
  lastMessage,
  lastMessageTime,
  unreadCount = 0,
  isOnline = false,
  isSelected = false,
  onClick
}: ContactItemProps) {
  return (
    <button
      onClick={onClick}
      className={`contact-row w-full ${
        isSelected ? 'bg-[rgba(255,255,255,0.08)]' : ''
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar 
          name={displayName}
          src={avatar}
          size="md"
        />
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-[var(--success)] rounded-full border-2 border-[var(--bg-secondary)]" />
        )}
      </div>

      {/* Contact Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <h3 className="font-medium text-[var(--text-primary)] text-[var(--text-base)] truncate">
            {displayName}
          </h3>
          {lastMessageTime && (
            <span className="text-[var(--text-xs)] text-[var(--text-secondary)] flex-shrink-0">
              {formatDistanceToNow(lastMessageTime)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[var(--text-sm)] text-[var(--text-secondary)] truncate">
            {lastMessage || `@${username}`}
          </p>
          {unreadCount > 0 && (
            <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-[var(--accent)] text-white text-[var(--text-xs)] font-semibold rounded-full flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
