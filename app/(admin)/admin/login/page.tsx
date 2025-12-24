'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth-context';
import { AdminCard, AdminCardContent } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

/**
 * Admin Login Page
 * Clean login form with admin-specific branding
 */
export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, canAccessAdmin, isInitialized } = useAdminAuth();

  // Check for error query params (e.g., suspended account)
  useEffect(() => {
    const errorParam = searchParams?.get('error');
    if (errorParam === 'suspended') {
      setError('Your account has been suspended. Please contact support.');
    }
  }, [searchParams]);

  // Redirect if already authenticated (only after initialization is complete)
  // This prevents redirect loops by ensuring we only redirect once auth is confirmed
  useEffect(() => {
    if (!isInitialized || isLoading) return; // Wait for initialization to complete
    
    // Only redirect if user can actually access admin
    if (canAccessAdmin) {
      router.replace('/admin/dashboard');
    }
  }, [isInitialized, isLoading, canAccessAdmin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn(email, password);
      
      if (!result.success) {
        setError(result.error || 'Login failed. Please try again.');
        setIsLoading(false);
        return;
      }

      // Success - redirect to dashboard (use replace to prevent back button issues)
      router.replace('/admin/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  // Show loading state while initializing
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMDI4M2EiIGZpbGwtb3BhY2l0eT0iMC40Ij48cGF0aCBkPSJNMzYgMzRjMC0yLTItNC00LTRzLTQgMi00IDQgMiA0IDQgNCA0LTIgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
      
      <div className="relative w-full max-w-md px-6">
        {/* Login Card */}
        <AdminCard className="shadow-2xl">
          <AdminCardContent className="p-8">
            {/* Logo & Title */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl mb-4">
                <svg 
                  className="w-8 h-8 text-emerald-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" 
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                SabiPrep Admin
              </h1>
              <p className="text-muted-foreground mt-2">
                Sign in to access the admin portal
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@sabiprep.com"
                  required
                  autoComplete="email"
                  disabled={isLoading}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="mt-2"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t">
              <p className="text-center text-sm text-muted-foreground">
                Not an admin?{' '}
                <a 
                  href="/login" 
                  className="text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Go to student login
                </a>
              </p>
            </div>
          </AdminCardContent>
        </AdminCard>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            <svg 
              className="w-4 h-4 inline-block mr-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
              />
            </svg>
            Secure admin area. All actions are logged.
          </p>
        </div>
      </div>
    </div>
  );
}
