"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Database,
  Wallet,
  LogOut,
  ChevronLeft,
  ChevronRight,
  PauseCircle,
  AlertOctagon,
  X,
  PlayCircle,
  FileText,
  Copy,
  Check
} from "lucide-react";
import ProjectSelector from "../ProjectSelector";
import Image from "next/image";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useProject } from "@/contexts/ProjectContext";

type AdminSidebarProps = {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  className?: string;
  onMobileClose?: () => void;
};

export function AdminSidebar({ collapsed, setCollapsed, className, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { disconnect, publicKey, signMessage } = useWallet();
  const { currentProject } = useProject();
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const signAndCall = async (endpoint: string, successMessage: string) => {
    if (!publicKey || !signMessage) {
      toast.error("Please connect your admin wallet first");
      return;
    }

    try {
      setLoading(true);
      const timestamp = Date.now();
      const messageObj = { timestamp };
      const messageStr = JSON.stringify(messageObj);
      const messageBytes = new TextEncoder().encode(messageStr);

      const signatureBytes = await signMessage(messageBytes);
      
      // Convert signature to base64
      // Helper function to safely convert Uint8Array to Base64 in browser
      const signature = btoa(String.fromCharCode(...Array.from(signatureBytes)));

      await api.post(endpoint, {
        adminWallet: publicKey.toBase58(),
        signature,
        message: messageStr
      });

      toast.success(successMessage);
      return true;
    } catch (err) {
      console.error("Action failed:", err);
      toast.error(err instanceof Error ? err.message : "Action failed");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handlePauseResume = async () => {
    const endpoint = isPaused ? "/stream/resume-all" : "/stream/pause-all";
    const message = isPaused ? "Streams resumed successfully" : "All streams paused successfully";
    
    const success = await signAndCall(endpoint, message);
    if (success) {
      setIsPaused(!isPaused);
    }
  };

  const handleEmergencyStop = async () => {
    if (!confirm("CRITICAL WARNING: This will permanently stop ALL vesting streams. This action is irreversible. Are you sure?")) return;
    
    await signAndCall("/stream/emergency-stop", "Emergency stop executed. All streams cancelled.");
  };

  const handleCopyTreasuryKey = async () => {
    if (!currentProject?.vault_public_key) {
      toast.error("No treasury key available");
      return;
    }

    try {
      await navigator.clipboard.writeText(currentProject.vault_public_key);
      setCopied(true);
      toast.success("Treasury key copied to clipboard");
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy treasury key");
    }
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/admin" },
    { icon: Database, label: "Pools", href: "/admin/pools" },
    { icon: Wallet, label: "Treasury", href: "/admin/treasury" },
    { icon: FileText, label: "Claims", href: "/admin/claims" },
  ];

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-white/5 bg-slate-950 transition-all duration-300 flex flex-col",
        collapsed ? "w-20" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div className="flex h-20 items-center justify-between px-5 border-b border-white/5">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden shadow-lg shadow-purple-500/20">
              <Image 
                src="/lilgarg-logo.jpeg" 
                alt="LilGarg" 
                fill
                className="object-cover"
              />
            </div>
            <span className="font-space font-bold text-sm text-slate-200 tracking-tight leading-tight">
              LilGarg<br/><span className="text-purple-500">Vesting</span>
            </span>
          </div>
        )}
        {collapsed && (
           <div className="relative w-10 h-10 rounded-lg overflow-hidden shadow-lg shadow-purple-500/20 mx-auto">
             <Image 
                src="/lilgarg-logo.jpeg" 
                alt="LilGarg" 
                fill
                className="object-cover"
              />
           </div>
        )}
        
        {onMobileClose ? (
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors hidden lg:block",
              collapsed && "hidden"
            )}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Project Selector */}
      <div className={cn("p-4", collapsed && "px-3")}>
        {!collapsed ? (
           <>
             <ProjectSelector />
             
             {/* Treasury Public Key */}
             {currentProject?.vault_public_key && (
               <button
                 onClick={handleCopyTreasuryKey}
                 className="mt-3 w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-white/5 hover:border-purple-500/30 hover:bg-slate-900 transition-all group"
               >
                 <div className="flex items-center justify-between gap-2">
                   <div className="flex-1 min-w-0">
                     <div className="text-xs text-slate-400 mb-1">Treasury Key</div>
                     <div className="text-xs font-mono text-slate-300 truncate">
                       {currentProject.vault_public_key.slice(0, 8)}...{currentProject.vault_public_key.slice(-8)}
                     </div>
                   </div>
                   <div className="flex-shrink-0">
                     {copied ? (
                       <Check className="w-4 h-4 text-green-400" />
                     ) : (
                       <Copy className="w-4 h-4 text-slate-400 group-hover:text-purple-400 transition-colors" />
                     )}
                   </div>
                 </div>
               </button>
             )}
           </>
        ) : (
           <div className="w-10 h-10 rounded-xl bg-slate-900 mx-auto flex items-center justify-center text-xs font-bold text-slate-400 border border-white/5 cursor-pointer hover:border-purple-500/50 hover:text-purple-400 transition-all">
             PRJ
           </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative overflow-hidden",
                isActive 
                  ? "bg-white/5 text-white font-medium border border-white/5" 
                  : "text-slate-500 hover:bg-white/[0.02] hover:text-slate-300 border border-transparent"
              )}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-50" />
              )}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 rounded-l-xl" />
              )}
              
              <item.icon className={cn("w-5 h-5 flex-shrink-0 relative z-10", isActive ? "text-purple-400" : "text-slate-500 group-hover:text-slate-300")} />
              
              {!collapsed && <span className="relative z-10">{item.label}</span>}
              
              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs font-medium text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Emergency Controls */}
      {!collapsed && (
        <div className="px-4 py-4 space-y-2 border-t border-white/5">
          <div className="text-[10px] uppercase tracking-wider text-slate-600 font-semibold mb-2 pl-2">Emergency Controls</div>
          <button 
            onClick={handlePauseResume}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-xs font-medium",
              isPaused 
                ? "bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20"
                : "bg-yellow-500/10 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20"
            )}
          >
            {isPaused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
            {isPaused ? "Resume All Streams" : "Pause All Streams"}
          </button>
          <button 
            onClick={handleEmergencyStop}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-colors text-xs font-medium"
          >
            <AlertOctagon className="w-4 h-4" />
            Emergency Stop
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-white/5 bg-slate-950">
        <button
          onClick={disconnect}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-3 rounded-xl text-red-400/70 hover:bg-red-500/5 hover:text-red-400 hover:border-red-500/10 border border-transparent transition-all",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">Disconnect</span>}
        </button>
      </div>
      
      {/* Toggle button when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="absolute -right-3 top-24 bg-slate-900 border border-white/10 rounded-full p-1 text-slate-400 hover:text-white hover:border-purple-500/50 transition-all z-50 shadow-lg"
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </aside>
  );
}
