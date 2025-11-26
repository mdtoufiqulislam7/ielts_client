'use client';

import { useState, useEffect, useRef } from 'react';
import { getCookie, decodeToken } from '@/utils/cookies';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  is_read: boolean;
  sender?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  receiver?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

interface ChatBoxProps {
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatBox({ receiverId, receiverName, receiverAvatar, isOpen, onClose }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (isOpen && receiverId) {
      fetchMessages();
      // Mark messages as read when opening chat
      markAsRead();
      // Poll for new messages every 3 seconds
      const interval = setInterval(() => {
        fetchMessages();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, receiverId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getAuthHeaders = () => {
    const token = getCookie('accessToken') || getCookie('refreshToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL;
      if (!apiUrl) return;

      const response = await fetch(`${apiUrl}/api/chat/messages/${receiverId}?limit=50&offset=0`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        const messageList = data.data?.messages || data.messages || data || [];
        setMessages(Array.isArray(messageList) ? messageList : []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL;
      if (!apiUrl) return;

      const response = await fetch(`${apiUrl}/api/chat/message`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          receiver_id: receiverId,
          message: newMessage.trim(),
        }),
      });

      if (response.ok) {
        setNewMessage('');
        // Refresh messages to show the new one
        await fetchMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL;
      if (!apiUrl) return;

      await fetch(`${apiUrl}/api/chat/read/${receiverId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {receiverAvatar ? (
              <img
                src={receiverAvatar}
                alt={receiverName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-gray-600 font-medium">
                  {receiverName?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-800">{receiverName}</h3>
              <p className="text-xs text-gray-500">Online</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {loading && messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No messages yet. Start the conversation!</div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.sender_id === currentUser?.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      isOwnMessage
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-800 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm">{message.message}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

