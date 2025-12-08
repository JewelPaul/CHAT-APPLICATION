import { formatDistanceToNow } from '../utils'

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
      className={`w-full p-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors ${
        isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500' : ''
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {avatar ? (
          <img
            src={avatar}
            alt={displayName}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold">
            {displayName[0]?.toUpperCase() || '?'}
          </div>
        )}
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
        )}
      </div>

      {/* Contact Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {displayName}
          </h3>
          {lastMessageTime && (
            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
              {formatDistanceToNow(lastMessageTime)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {lastMessage || `@${username}`}
          </p>
          {unreadCount > 0 && (
            <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-indigo-500 text-white text-xs font-semibold rounded-full flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
