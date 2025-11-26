"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from '@/utils/cookies';
import { useAuth } from '@/contexts/AuthContext';
import ChatBox from '@/components/ChatBox';

interface User {
  id: string;
  username: string;
  email: string;
  avatar_url?: string | null;
  bio?: string | null;
  created_at?: string;
  is_following?: boolean;
  followers_count?: string;
  following_count?: string;
}

export default function Dashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [followingStatus, setFollowingStatus] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; avatar?: string | null } | null>(null);
  const [showLaunchingSoon, setShowLaunchingSoon] = useState(false);
  const router = useRouter();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    setMounted(true);
    fetchUsers();
  }, []);

  // Fetch users or search results
  useEffect(() => {
    if (mounted) {
      const timeoutId = setTimeout(() => {
        if (searchQuery.trim()) {
          searchUsers(searchQuery);
        } else {
          fetchUsers();
        }
      }, 300); // Debounce search

      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, mounted]);

  const getAuthHeaders = () => {
    const token = getCookie('accessToken') || getCookie('refreshToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL;
      if (!apiUrl) return;

      const response = await fetch(`${apiUrl}/api/users`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const responseData = await response.json();
        // Handle response structure: { message, data: { users: [], total } }
        const userList = responseData.data?.users || [];
        setUsers(Array.isArray(userList) ? userList : []);
        
        // Use is_following from API response
        const statuses: Record<string, boolean> = {};
        userList.forEach((user: User) => {
          if (user.id !== currentUser?.id) {
            statuses[user.id] = user.is_following || false;
          }
        });
        setFollowingStatus(statuses);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL;
      if (!apiUrl) return;

      const response = await fetch(`${apiUrl}/api/search?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const responseData = await response.json();
        // Handle response structure: { message, data: { users: [], total } }
        const userList = responseData.data?.users || [];
        setUsers(Array.isArray(userList) ? userList : []);
        
        // Use is_following from API response
        const statuses: Record<string, boolean> = {};
        userList.forEach((user: User) => {
          if (user.id !== currentUser?.id) {
            statuses[user.id] = user.is_following || false;
          }
        });
        setFollowingStatus(statuses);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh following status after follow/unfollow
  const refreshFollowingStatus = async (userId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL;
      if (!apiUrl) return;

      const response = await fetch(`${apiUrl}/api/follow/${userId}/check`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setFollowingStatus(prev => ({
          ...prev,
          [userId]: data.isFollowing || data.following || false,
        }));
      }
    } catch (error) {
      console.error(`Error checking follow status for ${userId}:`, error);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL;
      if (!apiUrl) return;

      const response = await fetch(`${apiUrl}/api/follow/${userId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setFollowingStatus(prev => ({ ...prev, [userId]: true }));
        // Refresh user list to get updated counts
        if (searchQuery.trim()) {
          await searchUsers(searchQuery);
        } else {
          await fetchUsers();
        }
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleUnfollow = async (userId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL;
      if (!apiUrl) return;

      const response = await fetch(`${apiUrl}/api/follow/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setFollowingStatus(prev => ({ ...prev, [userId]: false }));
        // Refresh user list to get updated counts
        if (searchQuery.trim()) {
          await searchUsers(searchQuery);
        } else {
          await fetchUsers();
        }
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-blue-50 p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Section - User List */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Users</h2>
          
          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* User List */}
          <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No users found</div>
            ) : (
              users
                .filter(user => user.id !== currentUser?.id) // Filter out current user
                .map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.username}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-gray-600 font-medium">
                              {user.username?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 truncate">
                          {user.username}
                        </h3>
                        <p className="text-sm text-gray-600 truncate">{user.email}</p>
                        {user.bio && (
                          <p className="text-xs text-gray-500 truncate mt-1">{user.bio}</p>
                        )}
                        <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                          <span>{user.followers_count || 0} followers</span>
                          <span>•</span>
                          <span>{user.following_count || 0} following</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {followingStatus[user.id] ? (
                        <button
                          onClick={() => handleUnfollow(user.id)}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
                        >
                          Unfollow
                        </button>
                      ) : (
                        <button
                          onClick={() => handleFollow(user.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          Follow
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedUser({
                            id: user.id,
                            name: user.username,
                            avatar: user.avatar_url,
                          });
                          setChatOpen(true);
                        }}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm font-medium"
                      >
                        Chat
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Right Section - IELTS Exam Modules */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Your IELTS Exam</h2>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Listening Module */}
            <div className="bg-blue-100 rounded-lg p-6 text-center hover:bg-blue-200 transition-colors cursor-pointer">
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-800 mb-3">Listening</h3>
              <button 
                onClick={() => setShowLaunchingSoon(true)}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Start
              </button>
            </div>

            {/* Reading Module */}
            <div className="bg-blue-100 rounded-lg p-6 text-center hover:bg-blue-200 transition-colors cursor-pointer">
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-800 mb-3">Reading</h3>
              <button 
                onClick={() => setShowLaunchingSoon(true)}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Start
              </button>
            </div>

            {/* Writing Module */}
            <div className="bg-blue-100 rounded-lg p-6 text-center hover:bg-blue-200 transition-colors cursor-pointer">
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-800 mb-3">Writing</h3>
              <button
                onClick={() => router.push('/community')}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Start
              </button>
            </div>

            {/* Speaking Module */}
            <div className="bg-blue-100 rounded-lg p-6 text-center hover:bg-blue-200 transition-colors cursor-pointer">
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-800 mb-3">Speaking</h3>
              <button 
                onClick={() => setShowLaunchingSoon(true)}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Start
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Box */}
      {selectedUser && (
        <ChatBox
          receiverId={selectedUser.id}
          receiverName={selectedUser.name}
          receiverAvatar={selectedUser.avatar}
          isOpen={chatOpen}
          onClose={() => {
            setChatOpen(false);
            setSelectedUser(null);
          }}
        />
      )}

      {/* Launching Soon Popup */}
      {showLaunchingSoon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
            <div className="text-center">
              <div className="mb-4">
                <svg className="w-20 h-20 mx-auto text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Launching Soon</h2>
              <p className="text-gray-600 mb-6">
                This feature is currently under development. We're working hard to bring it to you soon!
              </p>
              <button
                onClick={() => setShowLaunchingSoon(false)}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

