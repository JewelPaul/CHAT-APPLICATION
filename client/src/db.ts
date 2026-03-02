/**
 * IndexedDB wrapper for local storage of chat data
 * All user data stored locally in browser - zero cloud storage costs
 */

const DB_NAME = 'ZionChatDB';
const DB_VERSION = 1;

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatar?: string;
  privateKey: string; // encrypted with password
  publicKey: string;
  settings: UserSettings;
  createdAt: Date;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  notifications: boolean;
  soundEnabled: boolean;
  readReceipts: boolean;
  lastSeen: boolean;
}

export interface Contact {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  publicKey?: string;
  status: 'pending' | 'accepted' | 'blocked' | 'online' | 'offline';
  lastSeen?: Date;
  unreadCount: number;
  lastMessage?: string;
  lastMessageTime?: Date;
}

export interface StoredMessage {
  id: string;
  chatId: string;
  senderId: string;
  recipientId: string;
  content: string; // encrypted
  type: 'text' | 'image' | 'file' | 'audio' | 'video' | 'system' | 'media';
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  replyTo?: string;
  reactions?: Array<{ emoji: string; userId: string }>;
  mediaData?: string;
  objectUrl?: string; // ephemeral object URL for decrypted media (revoked on cleanup)
  mimeType?: string;
  filename?: string;
  size?: number;
}

export interface MediaItem {
  id: string;
  chatId: string;
  messageId: string;
  blob: Blob;
  filename: string;
  mimeType: string;
  size: number;
  timestamp: Date;
}

class ChatDatabase {
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB connection
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // User profile store
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('username', 'username', { unique: true });
        }

        // Contacts store
        if (!db.objectStoreNames.contains('contacts')) {
          const contactStore = db.createObjectStore('contacts', { keyPath: 'id' });
          contactStore.createIndex('username', 'username', { unique: true });
          contactStore.createIndex('status', 'status', { unique: false });
          contactStore.createIndex('lastMessageTime', 'lastMessageTime', { unique: false });
        }

        // Messages store
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
          messageStore.createIndex('chatId', 'chatId', { unique: false });
          messageStore.createIndex('timestamp', 'timestamp', { unique: false });
          messageStore.createIndex('chatId_timestamp', ['chatId', 'timestamp'], { unique: false });
        }

        // Media store
        if (!db.objectStoreNames.contains('media')) {
          const mediaStore = db.createObjectStore('media', { keyPath: 'id' });
          mediaStore.createIndex('chatId', 'chatId', { unique: false });
          mediaStore.createIndex('messageId', 'messageId', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        console.log('IndexedDB schema created');
      };
    });
  }

  /**
   * User profile operations
   */

  async saveUserProfile(profile: UserProfile): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['users'], 'readwrite');
      const store = transaction.objectStore('users');
      const request = store.put(profile);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const request = store.get(userId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteUserProfile(userId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['users'], 'readwrite');
      const store = transaction.objectStore('users');
      const request = store.delete(userId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Contact operations
   */

  async saveContact(contact: Contact): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['contacts'], 'readwrite');
      const store = transaction.objectStore('contacts');
      const request = store.put(contact);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async addContact(contact: Contact): Promise<void> {
    return this.saveContact(contact);
  }

  async updateContact(contactId: string, updates: Partial<Contact>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const contact = await this.getContact(contactId);
    if (contact) {
      const updatedContact = { ...contact, ...updates };
      await this.saveContact(updatedContact);
    }
  }

  async getContacts(): Promise<Contact[]> {
    return this.getAllContacts();
  }

  async getMessages(chatId: string): Promise<StoredMessage[]> {
    return this.getMessagesByChatId(chatId);
  }

  async getContact(contactId: string): Promise<Contact | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['contacts'], 'readonly');
      const store = transaction.objectStore('contacts');
      const request = store.get(contactId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllContacts(): Promise<Contact[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['contacts'], 'readonly');
      const store = transaction.objectStore('contacts');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getAcceptedContacts(): Promise<Contact[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['contacts'], 'readonly');
      const store = transaction.objectStore('contacts');
      const index = store.index('status');
      const request = index.getAll('accepted');

      request.onsuccess = () => {
        const contacts = request.result || [];
        // Sort by last message time
        contacts.sort((a, b) => {
          const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
          const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
          return timeB - timeA;
        });
        resolve(contacts);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteContact(contactId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['contacts'], 'readwrite');
      const store = transaction.objectStore('contacts');
      const request = store.delete(contactId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Message operations
   */

  async saveMessage(message: StoredMessage): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      const request = store.put(message);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMessage(messageId: string): Promise<StoredMessage | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      const request = store.get(messageId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getMessagesByChatId(chatId: string, limit = 100, offset = 0): Promise<StoredMessage[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      const index = store.index('chatId_timestamp');
      const range = IDBKeyRange.bound([chatId, 0], [chatId, Date.now()]);
      const request = index.openCursor(range, 'prev');

      const messages: StoredMessage[] = [];
      let count = 0;
      let skipped = 0;

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && count < limit) {
          if (skipped < offset) {
            skipped++;
            cursor.continue();
          } else {
            messages.push(cursor.value);
            count++;
            cursor.continue();
          }
        } else {
          resolve(messages.reverse()); // Return in chronological order
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateMessageStatus(messageId: string, status: StoredMessage['status']): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const message = await this.getMessage(messageId);
    if (message) {
      message.status = status;
      await this.saveMessage(message);
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      const request = store.delete(messageId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Media operations
   */

  async saveMedia(media: MediaItem): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['media'], 'readwrite');
      const store = transaction.objectStore('media');
      const request = store.put(media);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMedia(mediaId: string): Promise<MediaItem | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['media'], 'readonly');
      const store = transaction.objectStore('media');
      const request = store.get(mediaId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Settings operations
   */

  async saveSetting(key: string, value: unknown): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSetting(key: string): Promise<unknown> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all data (for logout)
   */
  async clearAll(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stores = ['users', 'contacts', 'messages', 'media', 'settings'];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(stores, 'readwrite');
      
      let completed = 0;
      const checkComplete = () => {
        completed++;
        if (completed === stores.length) {
          resolve();
        }
      };

      stores.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = checkComplete;
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * Export all data for backup
   */
  async exportData(): Promise<Record<string, unknown>> {
    if (!this.db) throw new Error('Database not initialized');

    const [users, contacts, messages, settings] = await Promise.all([
      this.getAllFromStore('users'),
      this.getAllFromStore('contacts'),
      this.getAllFromStore('messages'),
      this.getAllFromStore('settings')
    ]);

    return {
      version: DB_VERSION,
      exportDate: new Date().toISOString(),
      users,
      contacts,
      messages,
      settings
    };
  }

  /**
   * Import data from backup
   */
  async importData(data: Record<string, unknown[]>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Clear existing data first
    await this.clearAll();

    // Import each store
    if (data.users) {
      await this.importToStore('users', data.users);
    }
    if (data.contacts) {
      await this.importToStore('contacts', data.contacts);
    }
    if (data.messages) {
      await this.importToStore('messages', data.messages);
    }
    if (data.settings) {
      await this.importToStore('settings', data.settings);
    }
  }

  private async getAllFromStore(storeName: string): Promise<unknown[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private async importToStore(storeName: string, data: unknown[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      let completed = 0;
      const checkComplete = () => {
        completed++;
        if (completed === data.length) {
          resolve();
        }
      };

      data.forEach(item => {
        const request = store.put(item);
        request.onsuccess = checkComplete;
        request.onerror = () => reject(request.error);
      });

      if (data.length === 0) {
        resolve();
      }
    });
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('IndexedDB connection closed');
    }
  }
}

// Singleton instance
let dbInstance: ChatDatabase | null = null;

export async function getDatabase(): Promise<ChatDatabase> {
  if (!dbInstance) {
    dbInstance = new ChatDatabase();
    await dbInstance.init();
  }
  return dbInstance;
}

export { ChatDatabase };
