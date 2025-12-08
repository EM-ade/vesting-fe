"use client";

import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useProject } from "@/contexts/ProjectContext";
import { usePathname } from "next/navigation";
import { OverviewView } from "@/components/admin/views/OverviewView";
import { PoolsView } from "@/components/admin/views/PoolsView";
import { TreasuryView } from "@/components/admin/views/TreasuryView";
import { ClaimsManagementView } from "@/components/admin/views/ClaimsManagementView";
import { OnboardingModal } from "@/components/admin/OnboardingModal";

export function AdminDashboard() {
  const { isAdmin, isLoading } = useAdminAuth();
  const { currentProject } = useProject();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        <div className="text-white/60">Verifying access...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 text-center">
        <div className="text-red-400 font-bold text-xl">Access Denied</div>
        <div className="text-white/60 max-w-md">
          You are not authorized as an admin for this project. Please switch wallets or contact the project owner.
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 text-center px-4">
        <div className="space-y-3">
          <div className="text-white text-2xl font-bold">Welcome to the Admin Dashboard!</div>
          <div className="text-white/60 max-w-md">
            You don't have any projects yet. Create your first project to start managing vesting pools and treasury.
          </div>
        </div>
        <div className="text-sm text-white/40">
          Use the project selector in the sidebar to create a new project
        </div>
      </div>
    );
  }

  // Route-based view switching
  // Default to Overview
  let content = <OverviewView />;
  
  if (pathname === "/admin/pools") {
    content = <PoolsView />;
  } else if (pathname === "/admin/treasury") {
    content = <TreasuryView />;
  } else if (pathname === "/admin/claims") {
    content = <ClaimsManagementView />;
  }

  return (
    <>
      <OnboardingModal />
      {content}
    </>
  );
}
