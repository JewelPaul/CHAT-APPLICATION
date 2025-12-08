import { useState, useEffect } from 'react'
import { Search, X, MessageCircle, Loader2 } from 'lucide-react'
import { EmptyState } from './EmptyState'
import socketService from '../socket'

interface SearchResult {
  id: string
  username: string
  displayName: string
  avatarUrl?: string
}

interface SearchUsersModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectUser: (user: SearchResult) => void
  currentUserId?: string
}

export function SearchUsersModal({ isOpen, onClose, onSelectUser, currentUserId }: SearchUsersModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Search with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    // Clear previous timer
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }

    // Set new timer
    const timer = setTimeout(() => {
      performSearch(query.trim())
    }, 500) // 500ms debounce

    setSearchDebounceTimer(timer)

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [query])

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true)
    try {
      // Emit search event and wait for response
      socketService.emit('search-users', { query: searchQuery }, (response: { users: SearchResult[] }) => {
        if (response && response.users) {
          // Filter out current user
          const filteredUsers = currentUserId 
            ? response.users.filter(u => u.id !== currentUserId)
            : response.users
          setResults(filteredUsers)
        } else {
          setResults([])
        }
        setIsLoading(false)
      })
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
      setIsLoading(false)
    }
  }

  const handleSelectUser = (user: SearchResult) => {
    onSelectUser(user)
    onClose()
    setQuery('')
    setResults([])
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Search Users
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by @username..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          )}

          {!isLoading && query && results.length === 0 && (
            <div className="p-8">
              <EmptyState type="no-search-results" message={`No users found for "${query}"`} />
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {results.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                >
                  {/* Avatar */}
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold">
                      {user.displayName[0]?.toUpperCase() || '?'}
                    </div>
                  )}

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {user.displayName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      @{user.username}
                    </p>
                  </div>

                  {/* Action */}
                  <div className="flex-shrink-0">
                    <MessageCircle className="w-5 h-5 text-indigo-500" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {!isLoading && !query && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" />
              <p>Start typing to search for users</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
