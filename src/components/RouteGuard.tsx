'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// Public routes that don't require authentication
const publicRoutes = ['/login', '/register', '/'];

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const isPublicRoute = publicRoutes.includes(pathname);

    // If not authenticated and trying to access protected route
    if (!isAuthenticated && !isPublicRoute) {
      router.push('/login');
    }
    
    // If authenticated and trying to access login/register, redirect to dashboard
    if (isAuthenticated && isPublicRoute) {
      router.push('/deshboard');
    }
  }, [isAuthenticated, pathname, mounted, router]);

  // Don't render anything until mounted (prevents hydration mismatch)
  if (!mounted) {
    return null;
  }

  // If not authenticated and on a protected route, don't render children
  // (will redirect to login)
  if (!isAuthenticated && !publicRoutes.includes(pathname)) {
    return null;
  }

  // If authenticated and on login/register, don't render children
  // (will redirect to dashboard)
  if (isAuthenticated && publicRoutes.includes(pathname)) {
    return null;
  }

  return <>{children}</>;
}

