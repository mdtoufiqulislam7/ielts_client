'use client';

import Link from 'next/link';

export default function Header() {
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
          </nav>
        </div>
      </div>
    </header>
  );
}
