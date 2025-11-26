"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie, decodeToken } from '@/utils/cookies';
import { useAuth } from '@/contexts/AuthContext';

export default function Profile() {
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { user } = useAuth();

  // Reusable function to fetch profile data
  const fetchProfileData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL;
      if (!apiUrl) {
        return;
      }

      // Get token
      let token = getCookie('accessToken') || getCookie('refreshToken');
      if (!token) {
        return;
      }

      // Decode token to get userId
      const decodedToken = decodeToken(token);
      if (!decodedToken || !decodedToken.userId) {
        return;
      }

      const userId = decodedToken.userId;

      // Fetch profile data
      const response = await fetch(`${apiUrl}/api/profile/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const responseData = await response.json();
        
        // Handle response structure: { message, data: { id, bio, avatar_url, user_id } }
        if (responseData.data) {
          const profileData = responseData.data;
          
          // Populate bio field with fetched data
          if (profileData.bio) {
            setBio(profileData.bio);
          } else {
            setBio(''); // Clear if no bio
          }
          
          // Populate avatar field with fetched data
          if (profileData.avatar_url) {
            // Set existing avatar URL
            setExistingAvatarUrl(profileData.avatar_url);
            setAvatarPreview(profileData.avatar_url);
          } else {
            // Clear avatar if no image
            setExistingAvatarUrl(null);
            setAvatarPreview(null);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  // Fetch profile data on mount (when route is hit)
  useEffect(() => {
    const loadProfile = async () => {
      setMounted(true);
      setLoadingProfile(true);
      await fetchProfileData();
      setLoadingProfile(false);
    };

    loadProfile();
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }
      setAvatar(file);
      setError('');
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL;
      
      if (!apiUrl) {
        throw new Error('API backend URL is not configured');
      }

      // Try to get accessToken first
      let token = getCookie('accessToken');
      
      // If accessToken is not available, try refreshToken
      if (!token) {
        token = getCookie('refreshToken');
      }

      // Debug: Check if cookies are accessible
      if (!token) {
        console.log('Available cookies:', document.cookie);
        console.log('accessToken cookie:', getCookie('accessToken'));
        console.log('refreshToken cookie:', getCookie('refreshToken'));
        console.log('user cookie:', getCookie('user'));
        
        // If user is authenticated via context but no token, redirect to login
        if (!user) {
          throw new Error('You must be logged in to update your profile. Please login again.');
        } else {
          throw new Error('Session expired. Please login again.');
        }
      }

      // Decode token to get userId
      const decodedToken = decodeToken(token);
      if (!decodedToken || !decodedToken.userId) {
        throw new Error('Invalid token. Please login again.');
      }
      const userId = decodedToken.userId;

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('bio', bio);
      if (avatar) {
        formData.append('avatar', avatar);
      }

      const response = await fetch(`${apiUrl}/api/profile/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      setSuccess('Profile updated successfully!');
      
      // Refresh profile data after successful update
      await fetchProfileData();
      
      // Clear uploaded file after success
      setTimeout(() => {
        setSuccess('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setAvatar(null);
        // Keep preview if there's an existing avatar
        if (!existingAvatarUrl) {
          setAvatarPreview(null);
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating profile');
    } finally {
      setLoading(false);
    }
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  // Show message if not authenticated
  const token = getCookie('accessToken') || getCookie('refreshToken');
  if (!token && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">You must be logged in to access your profile.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
            <p className="mt-2 text-sm text-gray-600">Update your profile information</p>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Picture
              </label>
              <div className="flex items-center space-x-6">
                {/* Avatar Preview */}
                <div className="flex-shrink-0">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="h-24 w-24 rounded-full object-cover border-2 border-gray-300"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                      <svg
                        className="h-12 w-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <svg
                      className="mr-2 h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    {avatar ? 'Change Image' : 'Upload Image'}
                  </label>
                  <p className="mt-2 text-xs text-gray-500">
                    PNG, JPG, GIF up to 5MB
                  </p>
                </div>
              </div>
            </div>

            {/* Bio Field */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              {loadingProfile ? (
                <div className="w-full h-24 bg-gray-200 rounded-lg animate-pulse"></div>
              ) : (
                <>
                  <textarea
                    id="bio"
                    name="bio"
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Tell us about yourself..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {bio.length} characters
                  </p>
                </>
              )}
            </div>

            {/* User Info Display */}
            {user && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Account Information</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">Username:</span> {user.username}</p>
                  <p><span className="font-medium">Email:</span> {user.email}</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="rounded-md bg-green-50 p-4">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

