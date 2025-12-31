"use client";

import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useWallet } from "@solana/wallet-adapter-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/Button";
import { Shield, Loader2, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";

export default function AdminPage() {
  return (
    <AdminShell>
      <AdminContent />
    </AdminShell>
  );
}

function AdminContent() {
  const { connected } = useWallet();
  const adminAuth = useAdminAuth();
  
  // Step 1: Not connected - show wallet connection
  if (!connected) {
    return (
      <motion.div 
        className="flex flex-col items-center justify-center min-h-[80vh] gap-8 px-4 text-center"
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
      >
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight font-space bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            Admin Dashboard
          </h1>
          <p className="text-white/50 text-lg max-w-md mx-auto">
            Connect your authorized wallet to manage vesting pools and treasury.
          </p>
        </div>
        <WalletButton style={{ borderRadius: '999px', padding: '0 32px', height: '48px' }} />
      </motion.div>
    );
  }

  // Step 2: Connected but not authorized - show authorization step
  if (connected && !adminAuth.isAuthorized && !adminAuth.isAuthorizing) {
    return (
      <motion.div 
        className="flex flex-col items-center justify-center min-h-[80vh] gap-8 px-4 text-center"
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
      >
        <div className="space-y-6 max-w-lg">
          {/* Icon with pulsing effect */}
          <motion.div
            className="flex items-center justify-center mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.2 }}
          >
            <div className="relative">
              <motion.div
                className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <div className="relative bg-purple-500/10 p-6 rounded-full border border-purple-500/20">
                <Shield className="w-12 h-12 text-purple-400" />
              </div>
            </div>
          </motion.div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight font-space text-white">
              Authorization Required
            </h1>
            <p className="text-white/60 text-base leading-relaxed">
              To access the admin dashboard, please sign a message to verify your identity. 
              This authorization will be valid for your entire session.
            </p>
          </div>

          {/* Security info */}
          <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-4">
            <div className="flex items-start gap-3 text-left">
              <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-blue-300 text-sm font-medium">
                  Safe & Secure
                </p>
                <p className="text-blue-300/60 text-xs leading-relaxed">
                  You'll sign a message with your wallet to prove ownership. This doesn't cost any gas fees and doesn't expose your private keys.
                </p>
              </div>
            </div>
          </div>

          {/* Authorization button */}
          <Button
            onClick={adminAuth.authorize}
            className="w-full h-14 text-lg font-semibold bg-purple-500 hover:bg-purple-600 hover:scale-105 transition-all"
          >
            <Shield className="w-5 h-5 mr-2" />
            Sign to Authorize
          </Button>

          <p className="text-white/30 text-xs">
            This action is secure and doesn't cost any gas fees
          </p>
        </div>
      </motion.div>
    );
  }

  // Step 3: Authorizing - show loading state
  if (adminAuth.isAuthorizing) {
    return (
      <motion.div 
        className="flex flex-col items-center justify-center min-h-[80vh] gap-6 px-4 text-center"
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
      >
        <div className="relative">
          <motion.div
            className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <div className="relative bg-purple-500/10 p-6 rounded-full border border-purple-500/20">
            <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white font-space">
            Waiting for Signature...
          </h2>
          <p className="text-white/50 text-sm">
            Please check your wallet and sign the message
          </p>
        </div>
      </motion.div>
    );
  }

  // Step 4: Authorized - show dashboard
  return (
    <AdminLayout>
      <AdminDashboard />
    </AdminLayout>
  );
}
