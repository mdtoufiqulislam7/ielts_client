'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { deleteCookie, getCookie } from '@/utils/cookies';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const [hasNotification, setHasNotification] = useState(false);
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check for chat notifications
  useEffect(() => {
    if (!isAuthenticated || !mounted) return;

    const checkNotifications = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL;
        if (!apiUrl) return;

        const token = getCookie('accessToken') || getCookie('refreshToken');
        if (!token) return;

        const response = await fetch(`${apiUrl}/api/chat/notification`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const responseData = await response.json();
          // Handle response structure: { message, data: { has_unread_chats: boolean } }
          const hasNotif = responseData.data?.has_unread_chats === true;
          console.log('Notification check:', responseData, 'has_unread_chats:', hasNotif);
          setHasNotification(hasNotif);
        }
      } catch (error) {
        console.error('Error checking notifications:', error);
      }
    };

    // Check immediately
    checkNotifications();

    // Poll every 5 seconds for new notifications
    const interval = setInterval(checkNotifications, 5000);

    return () => clearInterval(interval);
  }, [isAuthenticated, mounted]);

  // Debug: Log user data
  useEffect(() => {
    if (mounted) {
      console.log('Header - isAuthenticated:', isAuthenticated);
      console.log('Header - user:', user);
    }
  }, [mounted, isAuthenticated, user]);

  const handleLogout = () => {
    deleteCookie('accessToken');
    deleteCookie('refreshToken');
    deleteCookie('user');
    logout();
    router.push('/login');
    router.refresh();
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <header className="w-full bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
              MockMate
            </Link>
            <nav className="flex items-center space-x-6">
              <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Login
              </Link>
              <Link href="/register" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Register
              </Link>
            </nav>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="w-full bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Name - Left Side */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
              MockMate
            </Link>
          </div>

          {/* Navigation Links - Right Side */}
          <nav className="flex items-center space-x-6">
            {isAuthenticated && (
              <>
                <Link 
                  href="/deshboard" 
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/result" 
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Exam Marks
                </Link>
                <Link 
                  href="/create-exam" 
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Exams
                </Link>
                <Link 
                  href="/community" 
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Community
                </Link>
                <Link 
                  href="/profile" 
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Profile
                </Link>
                {/* Notification Indicator */}
                <div className="relative">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {hasNotification && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                  )}
                </div>
                {user && user.username && (
                  <span className="text-sm font-medium text-gray-600">
                    {user.username}
                  </span>
                )}
                {isAuthenticated && !user && (
                  <span className="text-sm font-medium text-gray-400">
                    Loading...
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Logout
                </button>
              </>
            )}
            {!isAuthenticated && (
              <>
                <Link 
                  href="/login" 
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Login
                </Link>
                <Link 
                  href="/register" 
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

