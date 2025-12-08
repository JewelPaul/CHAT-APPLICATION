import { MessageCircle, Search, UserPlus } from 'lucide-react'

interface EmptyStateProps {
  type?: 'no-chat' | 'no-contacts' | 'no-search-results'
  message?: string
}

export function EmptyState({ type = 'no-chat', message }: EmptyStateProps) {
  const getContent = () => {
    switch (type) {
      case 'no-contacts':
        return {
          icon: <UserPlus className="w-16 h-16 text-gray-400 dark:text-gray-600" />,
          title: 'No contacts yet',
          description: message || 'Search for users to start chatting'
        }
      case 'no-search-results':
        return {
          icon: <Search className="w-16 h-16 text-gray-400 dark:text-gray-600" />,
          title: 'No results found',
          description: message || 'Try searching with a different username'
        }
      case 'no-chat':
      default:
        return {
          icon: <MessageCircle className="w-16 h-16 text-gray-400 dark:text-gray-600" />,
          title: 'No chat selected',
          description: message || 'Select a contact or search for users to start a conversation'
        }
    }
  }

  const content = getContent()

  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          {content.icon}
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {content.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm">
            {content.description}
          </p>
        </div>
      </div>
    </div>
  )
}
