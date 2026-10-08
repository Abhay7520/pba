import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  createdAt: Date;
  points?: number;
  badges?: string[];
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signup: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<User>;

  login: (
    email: string,
    password: string
  ) => Promise<User>;

  loginWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Create role in separate collection for security
  const createUserRole = async (userId: string, role: 'user' | 'admin' = 'user') => {
    try {
      const roleRef = doc(db, 'user_roles', userId);
      await setDoc(roleRef, {
        userId,
        role,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error creating user role:', error);
    }
  };

  // Fetch role from separate collection
  const getUserRole = async (userId: string): Promise<'user' | 'admin'> => {
    try {
      const roleRef = doc(db, 'user_roles', userId);
      const snapshot = await getDoc(roleRef);

      if (snapshot.exists()) {
        return snapshot.data().role as 'user' | 'admin';
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
    return 'user'; // Default to user if role not found
  };

  const createUserProfile = async (user: User, additionalData?: any) => {
    const userRef = doc(db, 'users', user.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      const { email, displayName } = user;
      const createdAt = new Date();

      try {
        // Create user profile WITHOUT role
        await setDoc(userRef, {
          email,
          displayName: displayName || additionalData?.displayName || email?.split('@')[0],
          createdAt,
          points: 0,
          badges: [],
          ...additionalData
        });

        // Create role in separate collection
        await createUserRole(user.uid, 'user');
      } catch (error) {
        console.error('Error creating user profile:', error);
      }
    }

    return getUserProfile(user.uid);
  };

  const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
      const userRef = doc(db, 'users', uid);
      const snapshot = await getDoc(userRef);

      if (snapshot.exists()) {
        // Fetch role from separate collection for security
        const role = await getUserRole(uid);

        return {
          id: snapshot.id,
          ...snapshot.data(),
          role // Add role from separate collection
        } as UserProfile;
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signup = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<User> => {
    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await updateProfile(user, { displayName });
      await createUserProfile(user, { displayName });

      toast({
        title: "Welcome to CivicLink!",
        description: "Your account has been created successfully.",
      });

      return user;
    } catch (error: any) {
      console.error("Signup error code:", error.code);

      toast({
        title: "Signup Failed",
        description: error.message,
        variant: "destructive",
      });

      throw error;
    }
  };

  const login = async (
    email: string,
    password: string
  ): Promise<User> => {
    try {
      const { user } = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      toast({
        title: "Welcome back!",
        description: "You've logged in successfully.",
      });

      return user;
    } catch (error: any) {
      console.error("Login error code:", error.code);

      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });

      throw error;
    }
  };

  const loginWithGoogle = async (): Promise<User> => {
    try {
      const provider = new GoogleAuthProvider();

      const { user } = await signInWithPopup(
        auth,
        provider
      );

      await createUserProfile(user);

      toast({
        title: "Welcome!",
        description: "You've logged in with Google.",
      });

      return user;
    } catch (error: any) {
      console.error("Google login error code:", error.code);

      toast({
        title: "Google Login Failed",
        description: error.message,
        variant: "destructive",
      });

      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logged out",
        description: "You've been logged out successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Logout Failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
