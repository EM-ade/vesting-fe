/**
 * Admin Authentication Context
 * Manages session-based admin authentication
 * Users sign once per session, valid until browser closes
 */

"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { signAdminMessage, AdminAuthPayload } from "@/lib/adminAuth";

interface AdminAuthContextType {
  // Auth state
  isAuthorized: boolean;
  isAuthorizing: boolean;
  authPayload: AdminAuthPayload | null;
  
  // Methods
  authorize: () => Promise<void>;
  clearAuth: () => void;
  
  // Helper to get auth payload (returns cached or prompts for new)
  getAuthPayload: () => Promise<AdminAuthPayload>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

interface AdminAuthProviderProps {
  children: ReactNode;
}

const SESSION_STORAGE_KEY = "admin_auth_session";
const SIGNATURE_EXPIRY_MS = 25 * 60 * 1000; // 25 minutes (backend validates signatures for 30 minutes, we refresh at 25)
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours (cache lasts until tab closes via sessionStorage)

interface CachedAuth extends AdminAuthPayload {
  expiresAt: number;
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const wallet = useWallet();
  const [authPayload, setAuthPayload] = useState<AdminAuthPayload | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load cached auth on mount and when wallet changes
  useEffect(() => {
    console.log("🔍 Auth check:", { 
      connected: wallet.connected, 
      hasPublicKey: !!wallet.publicKey,
      hasAuthPayload: !!authPayload 
    });

    if (!wallet.connected || !wallet.publicKey) {
      // Wallet disconnected, clear auth immediately
      if (authPayload) {
        console.log("🔓 Wallet disconnected, clearing admin authorization");
        clearAuth();
      }
      setIsLoading(false);
      return;
    }

    // Wallet is connected, try to load cached auth only if we don't have one
    if (!authPayload) {
      console.log("🔄 Loading cached auth...");
      loadCachedAuth();
    } else {
      console.log("✅ Already have auth payload in state");
    }
    setIsLoading(false);
  }, [wallet.connected, wallet.publicKey?.toBase58()]);

  // Load cached auth from sessionStorage
  const loadCachedAuth = () => {
    try {
      const cached = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!cached) {
        console.log("📭 No cached auth found in sessionStorage");
        return;
      }

      console.log("📦 Found cached auth in sessionStorage");
      const parsed: CachedAuth = JSON.parse(cached);
      
      // Check if expired
      if (Date.now() > parsed.expiresAt) {
        console.log("📝 Cached admin auth expired, clearing...");
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return;
      }

      // Check if wallet matches
      if (wallet.publicKey?.toBase58() !== parsed.adminWallet) {
        console.log("📝 Wallet changed, clearing cached auth...");
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return;
      }

      // Valid cached auth found
      console.log("✅ Loaded cached admin auth from session");
      setAuthPayload(parsed);
    } catch (err) {
      console.error("Failed to load cached auth:", err);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  };

  // Cache auth to sessionStorage
  const cacheAuth = (auth: AdminAuthPayload) => {
    try {
      const cached: CachedAuth = {
        ...auth,
        expiresAt: Date.now() + CACHE_EXPIRY_MS, // Cache expires in 24 hours (or when tab closes)
      };
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(cached));
      console.log("💾 Cached admin auth to session");
    } catch (err) {
      console.error("Failed to cache auth:", err);
    }
  };

  // Authorize (sign message) - for initial login UI
  const authorize = async () => {
    if (!wallet.signMessage) {
      throw new Error("Wallet does not support message signing");
    }

    setIsAuthorizing(true);
    try {
      const auth = await signAdminMessage(wallet);
      setAuthPayload(auth);
      cacheAuth(auth);
      console.log("✅ Admin authorization successful");
    } catch (err) {
      console.error("Authorization failed:", err);
      throw err;
    } finally {
      setIsAuthorizing(false);
    }
  };

  // Silent re-authorize (for expired signatures) - doesn't show loading UI
  const silentReauthorize = async (): Promise<AdminAuthPayload> => {
    if (!wallet.signMessage) {
      throw new Error("Wallet does not support message signing");
    }

    try {
      console.log("🔄 Silently re-authorizing (signature expired)...");
      const auth = await signAdminMessage(wallet);
      setAuthPayload(auth);
      cacheAuth(auth);
      console.log("✅ Silent re-authorization successful");
      return auth;
    } catch (err) {
      console.error("Silent re-authorization failed:", err);
      throw err;
    }
  };

  // Clear auth (logout or wallet disconnect)
  const clearAuth = () => {
    setAuthPayload(null);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    console.log("🔒 Admin auth cleared");
  };

  // Check if current signature is expired (backend validates 5 min, we check at 4 min)
  const isAuthExpired = (): boolean => {
    if (!authPayload) return true;
    
    const age = Date.now() - authPayload.timestamp;
    const isExpired = age > SIGNATURE_EXPIRY_MS; // Check signature age, not cache age
    
    if (isExpired) {
      console.log("⏰ Auth signature expired (backend has 5 min limit), need new signature");
    }
    
    return isExpired;
  };

  // Get auth payload (returns cached or silently refreshes if expired)
  const getAuthPayload = async (): Promise<AdminAuthPayload> => {
    // If we have cached auth and it's not expired, return it
    if (authPayload && !isAuthExpired()) {
      const ageMinutes = Math.floor((Date.now() - authPayload.timestamp) / 60000);
      console.log(`✅ Using cached admin auth (${ageMinutes} min old)`);
      return authPayload;
    }

    // Auth is expired - silently re-authorize without showing loading UI
    if (authPayload && isAuthExpired()) {
      const newAuth = await silentReauthorize();
      return newAuth;
    }

    // No auth at all - shouldn't happen since user authorized at login
    // But if it does, throw error
    throw new Error("No authorization found. Please refresh and sign in again.");
  };

  const value: AdminAuthContextType = {
    isAuthorized: !!authPayload && !isLoading,
    isAuthorizing,
    authPayload,
    authorize,
    clearAuth,
    getAuthPayload,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

// Hook to use admin auth
export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}
