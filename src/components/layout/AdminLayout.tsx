"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { cn } from "@/lib/utils";
import { BackgroundGrid } from "@/components/ui/design-system/BackgroundGrid";
import { Menu } from "lucide-react";
import Image from "next/image";
import { useHybridPrefetch } from "@/hooks/queries/usePrefetchQueries";
import { useProject } from "@/contexts/ProjectContext";

type AdminLayoutProps = {
  children: React.ReactNode;
};

export function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentProject } = useProject();

  // HYBRID PREFETCH STRATEGY: Immediate + Delayed prefetching
  // Immediately prefetch Overview + Pools, then Claims + Treasury after 2s
  useHybridPrefetch(currentProject?.id || null, []);

  return (
    <div className="min-h-screen bg-slate-950 font-inter text-white overflow-hidden">
      <BackgroundGrid />

      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-slate-950/80 backdrop-blur-md border-b border-white/5 z-30 flex items-center justify-between px-4 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden shadow-lg shadow-purple-500/20">
            <Image 
              src="/lilgarg-logo.jpeg" 
              alt="LilGarg" 
              fill
              className="object-cover"
            />
          </div>
          <span className="font-space font-bold text-sm text-slate-200">
            LilGarg <span className="text-purple-500">Vesting</span>
          </span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 text-slate-400 hover:text-white"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Desktop Sidebar */}
      <AdminSidebar 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
        className="hidden lg:flex"
      />

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => setMobileMenuOpen(false)}
          />
          <AdminSidebar 
            collapsed={false} 
            setCollapsed={() => {}} 
            className="w-64 shadow-2xl animate-in slide-in-from-left duration-200"
            onMobileClose={() => setMobileMenuOpen(false)}
          />
        </div>
      )}

      <main 
        className={cn(
          "relative z-10 min-h-screen transition-all duration-300 p-4 pt-20 lg:p-10 lg:pt-10",
          collapsed ? "lg:ml-20" : "lg:ml-64"
        )}
      >
        <div className="max-w-[1600px] mx-auto space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
}
