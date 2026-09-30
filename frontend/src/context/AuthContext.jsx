import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../firebase/config';
import { syncUser } from '../api/authApi';
import { getMe } from '../api/userApi';
import { clearCache } from '../api/client';

const AuthContext = createContext(null);

const FIREBASE_MESSAGES = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'No account exists with this email.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/popup-closed-by-user': 'The Google sign-in window was closed before finishing.',
  'auth/cancelled-popup-request': 'The Google sign-in window was closed before finishing.',
  'auth/popup-blocked': 'Your browser blocked the Google sign-in popup. Allow popups and try again.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled for this Firebase project.',
  'auth/unauthorized-domain': 'This domain is not authorized for sign-in in Firebase.',
};

export function authErrorMessage(error) {
  if (!error) return '';
  return FIREBASE_MESSAGES[error.code] || error.message || 'Authentication failed. Please try again.';
}

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [initializing, setInitializing] = useState(isFirebaseConfigured);
  const [syncError, setSyncError] = useState(null);
  const pendingName = useRef(null);

  const sync = useCallback(async (user) => {
    setSyncError(null);
    try {
      const result = await syncUser(pendingName.current || user.displayName || undefined);
      pendingName.current = null;
      setProfile(result.user);
      return result.user;
    } catch (error) {
      setSyncError(error);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;
    return onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await sync(user);
      } else {
        setProfile(null);
        setSyncError(null);
        clearCache();
      }
      setInitializing(false);
    });
  }, [sync]);

  useEffect(() => {
    const onUnauthorized = () => {
      if (auth?.currentUser) signOut(auth).catch(() => {});
    };
    window.addEventListener('smartlib:unauthorized', onUnauthorized);
    return () => window.removeEventListener('smartlib:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback((email, password) => signInWithEmailAndPassword(auth, email, password), []);

  const register = useCallback(async (name, email, password) => {
    pendingName.current = name;
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    return credential;
  }, []);

  const loginWithGoogle = useCallback(() => signInWithPopup(auth, googleProvider), []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const resetPassword = useCallback((email) => sendPasswordResetEmail(auth, email), []);

  const refreshProfile = useCallback(async () => {
    const me = await getMe();
    setProfile(me);
    return me;
  }, []);

  const retrySync = useCallback(() => (auth?.currentUser ? sync(auth.currentUser) : null), [sync]);

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      setProfile,
      initializing,
      syncError,
      isAuthenticated: Boolean(firebaseUser),
      isConfigured: isFirebaseConfigured,
      login,
      register,
      loginWithGoogle,
      logout,
      resetPassword,
      refreshProfile,
      retrySync,
    }),
    [firebaseUser, profile, initializing, syncError, login, register, loginWithGoogle, logout, resetPassword, refreshProfile, retrySync],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
