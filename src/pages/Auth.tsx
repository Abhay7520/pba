import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MapPin } from 'lucide-react';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
});

const Auth = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const { login, signup, loginWithGoogle, currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const validateForm = () => {
    try {
      authSchema.parse({
        email,
        password,
        ...(mode === 'signup' && { displayName })
      });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  // Sync currentUser to localStorage for UserProfile
  const syncUserToLocalStorage = (user: any) => {
    if (user) {
      const userProfile = {
        id: user.uid || user.id,
        email: user.email,
        displayName: user.displayName || displayName || 'Anonymous User',
        createdAt: user.metadata?.creationTime || new Date().toISOString(),
        photoURL: user.photoURL || null
      };

      localStorage.setItem('currentUser', JSON.stringify(userProfile));

      // Dispatch custom event for real-time updates
      window.dispatchEvent(new CustomEvent('localStorageUpdated', {
        detail: { key: 'currentUser' }
      }));

      console.log('✅ User synced to localStorage:', userProfile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      let user;
      if (mode === 'signup') {
        user = await signup(email, password, displayName);
      } else {
        user = await login(email, password);
      }

      // Sync user to localStorage
      syncUserToLocalStorage(user);

      navigate('/');
    } catch (error: any) {
      console.error('Authentication error:', error);
      console.error('Error code:', error?.code);

      let message = 'Authentication failed. Please try again.';

      switch (error?.code) {
        case 'auth/email-already-in-use':
          message = 'This email is already registered. Try logging in or resetting your password.';
          break;

        case 'auth/invalid-credential':
          message = 'Invalid email or password. Please check your credentials.';
          break;

        case 'auth/wrong-password':
          message = 'Incorrect password.';
          break;

        case 'auth/user-not-found':
          message = 'No account found with this email.';
          break;

        case 'auth/operation-not-allowed':
          message = 'Email/password authentication is not enabled.';
          break;

        case 'auth/weak-password':
          message = 'Please choose a stronger password.';
          break;

        case 'auth/too-many-requests':
          message = 'Too many attempts. Please try again later.';
          break;
      }

      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const user = await loginWithGoogle();

      // Sync user to localStorage
      syncUserToLocalStorage(user);

      navigate('/');
    } catch (error) {
      console.error('Google auth error:', error);
      setErrors({ general: 'Google authentication failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="civic-page min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <MapPin className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </CardTitle>
          <CardDescription>
            {mode === 'signup'
              ? 'Start reporting and tracking civic issues'
              : 'Login to continue making a difference'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {errors.general && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive text-center">{errors.general}</p>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              OR
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Full Name</Label>
                <Input
                  id="displayName"
                  placeholder="John Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={loading}
                  className={errors.displayName ? 'border-destructive' : ''}
                />
                {errors.displayName && (
                  <p className="text-sm text-destructive">{errors.displayName}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className={errors.password ? 'border-destructive' : ''}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'signup' ? 'Sign Up' : 'Login'}
            </Button>
          </form>

          <div className="text-center text-sm">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signup' ? 'login' : 'signup');
                setErrors({});
              }}
              className="text-primary hover:underline"
              disabled={loading}
            >
              {mode === 'signup'
                ? 'Already have an account? Login'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;