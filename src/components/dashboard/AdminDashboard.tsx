"use client";

import React, { useEffect } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuthQuery } from "@/hooks/queries";
import { OverviewView } from "@/components/admin/views/OverviewView";
import { PoolsView } from "@/components/admin/views/PoolsView";
import { TreasuryView } from "@/components/admin/views/TreasuryView";
import { ClaimsManagementView } from "@/components/admin/views/ClaimsManagementView";
import { OnboardingModal } from "@/components/admin/OnboardingModal";
import { AnimatePresence, motion } from "framer-motion";
import { adminTabAnimations } from "@/lib/animations";

export function AdminDashboard() {
  const { currentProject, isLoading: projectLoading } = useProject();
  const pathname = usePathname();
  const router = useRouter();
  
  // Use TanStack Query for admin auth - auto-caches by project
  const { 
    data: authData, 
    isLoading: authLoading,
    isError: authError 
  } = useAdminAuthQuery(currentProject?.id || null);
  
  const isAdmin = authData?.isAdmin || false;
  const isLoading = authLoading;

  // Redirect non-admin users
  useEffect(() => {
    if (!isLoading && !authLoading && !isAdmin && authData?.success === true) {
      router.push('/user/vesting');
    }
  }, [isLoading, authLoading, isAdmin, authData, router]);

  // Determine current view from pathname
  const getCurrentView = () => {
    if (pathname === "/admin/pools") return "pools";
    if (pathname === "/admin/treasury") return "treasury";
    if (pathname === "/admin/claims") return "claims";
    return "overview";
  };

  const currentView = getCurrentView();

  // ANTI-FLICKER FIX: Only show loading if we have NO data at all
  // During navigation, currentProject stays populated from cache, so no flicker
  const showLoading = (isLoading || projectLoading || authLoading) && !currentProject && !authData;

  if (showLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        <div className="text-white/60">Loading dashboard...</div>
      </div>
    );
  }

  // If auth check failed or user is not admin, show error
  if (authError || (!isLoading && !authLoading && !isAdmin && authData?.success === true)) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 text-center">
        <div className="text-red-400 font-bold text-xl">Access Denied</div>
        <div className="text-white/60 max-w-md">
          You are not authorized as an admin for this project. Please switch wallets or contact the project owner.
        </div>
      </div>
    );
  }

  // ANTI-FLICKER FIX: Only show "no project" screen if we're truly done loading AND have no cached project
  // This prevents showing the welcome screen during tab navigation
  if (!currentProject && !projectLoading && !isLoading && !authLoading) {
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

  return (
    <>
      <OnboardingModal />
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          variants={adminTabAnimations[currentView as keyof typeof adminTabAnimations]}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {currentView === "pools" && <PoolsView />}
          {currentView === "treasury" && <TreasuryView />}
          {currentView === "claims" && <ClaimsManagementView />}
          {currentView === "overview" && <OverviewView />}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
