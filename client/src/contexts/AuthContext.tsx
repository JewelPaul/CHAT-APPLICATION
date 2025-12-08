/**
 * Authentication Context and Hook
 * Manages user authentication state and operations
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getDatabase } from '../db';
import { 
  generateKeyPair, 
  encryptPrivateKey, 
  decryptPrivateKey,
  isCryptoSupported 
} from '../encryption';
import socketService from '../socket';

interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  publicKey: string;
  privateKey: string; // Decrypted in memory
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, displayName: string, password: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<AuthUser>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || '';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved session on mount
  useEffect(() => {
    loadSession();
  }, []);

  // Authenticate socket when user logs in
  useEffect(() => {
    if (user && token) {
      socketService.emit('authenticate', { token });
    }
  }, [user, token]);

  async function loadSession() {
    try {
      const savedToken = localStorage.getItem('chatwave_token');
      const savedPassword = sessionStorage.getItem('chatwave_session_key'); // In-memory only

      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      // Verify token with server
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${savedToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Session expired');
      }

      const data = await response.json();
      const serverUser = data.user;

      // Load user profile from IndexedDB
      const db = await getDatabase();
      const profile = await db.getUserProfile(serverUser.id);

      if (!profile || !savedPassword) {
        // Need to re-authenticate
        throw new Error('Session incomplete');
      }

      // Decrypt private key
      const { encrypted, salt, iv } = JSON.parse(profile.privateKey);
      const decryptedPrivateKey = await decryptPrivateKey(
        encrypted,
        salt,
        iv,
        savedPassword
      );

      setUser({
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        email: profile.email,
        avatarUrl: profile.avatar,
        publicKey: profile.publicKey,
        privateKey: decryptedPrivateKey
      });

      setToken(savedToken);
    } catch (error) {
      console.error('Failed to load session:', error);
      // Clear invalid session
      localStorage.removeItem('chatwave_token');
      sessionStorage.removeItem('chatwave_session_key');
    } finally {
      setIsLoading(false);
    }
  }

  async function register(
    username: string,
    displayName: string,
    password: string,
    email?: string
  ) {
    try {
      if (!isCryptoSupported()) {
        throw new Error('Encryption not supported in this browser');
      }

      // Generate keypair
      const { publicKey, privateKey } = await generateKeyPair();

      // Encrypt private key with password
      const encryptedKey = await encryptPrivateKey(privateKey, password);

      // Register with server
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          displayName,
          email,
          password,
          publicKey
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const data = await response.json();
      const newToken = data.token;
      const serverUser = data.user;

      // Save to IndexedDB
      const db = await getDatabase();
      await db.saveUserProfile({
        id: serverUser.id,
        username: serverUser.username,
        displayName: serverUser.displayName,
        email: serverUser.email,
        avatar: serverUser.avatarUrl,
        privateKey: JSON.stringify(encryptedKey),
        publicKey,
        settings: {
          theme: 'dark',
          notifications: true,
          soundEnabled: true,
          readReceipts: true,
          lastSeen: true
        },
        createdAt: new Date(serverUser.createdAt)
      });

      // Save token and session key
      localStorage.setItem('chatwave_token', newToken);
      sessionStorage.setItem('chatwave_session_key', password);

      setUser({
        id: serverUser.id,
        username: serverUser.username,
        displayName: serverUser.displayName,
        email: serverUser.email,
        avatarUrl: serverUser.avatarUrl,
        publicKey,
        privateKey
      });

      setToken(newToken);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  async function login(username: string, password: string) {
    try {
      // Login with server
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          password
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      const newToken = data.token;
      const serverUser = data.user;

      // Load user profile from IndexedDB
      const db = await getDatabase();
      const profile = await db.getUserProfile(serverUser.id);

      if (!profile) {
        // First time login on this device - need to restore from backup
        throw new Error('Profile not found. Please restore from backup or re-register.');
      }

      // Decrypt private key
      const { encrypted, salt, iv } = JSON.parse(profile.privateKey);
      const decryptedPrivateKey = await decryptPrivateKey(
        encrypted,
        salt,
        iv,
        password
      );

      // Save token and session key
      localStorage.setItem('chatwave_token', newToken);
      sessionStorage.setItem('chatwave_session_key', password);

      setUser({
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        email: profile.email,
        avatarUrl: profile.avatar,
        publicKey: profile.publicKey,
        privateKey: decryptedPrivateKey
      });

      setToken(newToken);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async function logout() {
    try {
      // Clear local storage
      localStorage.removeItem('chatwave_token');
      sessionStorage.removeItem('chatwave_session_key');

      // Disconnect socket
      socketService.disconnect();

      // Clear state
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  async function updateProfile(updates: Partial<AuthUser>) {
    if (!user) throw new Error('Not authenticated');

    try {
      const db = await getDatabase();
      const profile = await db.getUserProfile(user.id);
      
      if (profile) {
        await db.saveUserProfile({
          ...profile,
          displayName: updates.displayName || profile.displayName,
          email: updates.email !== undefined ? updates.email : profile.email,
          avatar: updates.avatarUrl || profile.avatar
        });

        setUser({
          ...user,
          displayName: updates.displayName || user.displayName,
          email: updates.email !== undefined ? updates.email : user.email,
          avatarUrl: updates.avatarUrl || user.avatarUrl
        });
      }
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  }

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
