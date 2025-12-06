"use client";

import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useWallet } from "@solana/wallet-adapter-react";
import { AdminShell } from "@/components/layout/AdminShell";

export default function AdminPage() {
  return (
    <AdminShell>
      <AdminContent />
    </AdminShell>
  );
}

function AdminContent() {
  const { connected } = useWallet();
  
  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 px-4 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight font-space bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            Admin Dashboard
          </h1>
          <p className="text-white/50 text-lg max-w-md mx-auto">
            Connect your authorized wallet to manage vesting pools and treasury.
          </p>
        </div>
        <WalletButton style={{ borderRadius: '999px', padding: '0 32px', height: '48px' }} />
      </div>
    );
  }

  return (
    <AdminLayout>
      <AdminDashboard />
    </AdminLayout>
  );
}
