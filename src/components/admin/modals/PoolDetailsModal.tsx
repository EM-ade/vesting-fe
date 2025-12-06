"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatTokenAmount } from "@/lib/formatters";
import { Button } from "@/components/ui/Button";
import { Calendar, Coins, ExternalLink, ShieldCheck, Users, Activity, Edit2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface PoolData {
  id: string;
  name: string;
  totalAmount: number;
  streamflowId?: string;
  streamflow?: {
    vestedPercentage: number;
  };
  state?: string;
  vestingMode: string;
  startTime: string;
  endTime: string;
  vestingDuration: number;
  cliffDuration: number;
  stats?: {
    userCount: number;
  };
}

interface PoolDetailsModalProps {
  open: boolean;
  onClose: () => void;
  pool: PoolData | null; // Allow null for when modal is closed
  onUpdate?: () => void;
}

export function PoolDetailsModal({ open, onClose, pool, onUpdate }: PoolDetailsModalProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  // Early return if no pool
  if (!pool) {
    return null;
  }

  if (!pool) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString();
  };

  const percentage = pool.streamflow?.vestedPercentage || 0;

  const handleStartEdit = () => {
    setNewName(pool.name);
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!newName.trim() || newName === pool.name) {
      setIsEditingName(false);
      return;
    }

    setSaving(true);
    try {
      await api.put(`/pools/${pool.id}`, { name: newName });
      if (onUpdate) onUpdate();
      pool.name = newName; // Optimistic update
      setIsEditingName(false);
    } catch (error) {
      console.error("Failed to update pool name:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Pool Details" widthClassName="max-w-2xl" footer={
      <Button variant="ghost" onClick={onClose}>Close</Button>
    }>
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-slate-900/50 border border-white/10 rounded-xl">
            <div className="text-slate-500 text-xs mb-1 flex items-center gap-2">
              <Coins className="w-3 h-3" /> Total Size
            </div>
            <div className="text-xl font-mono font-medium text-white">
              {formatTokenAmount(pool.totalAmount)}
            </div>
          </div>
          
          <div className="p-4 bg-slate-900/50 border border-white/10 rounded-xl">
            <div className="text-slate-500 text-xs mb-1 flex items-center gap-2">
              <Users className="w-3 h-3" /> Recipients
            </div>
            <div className="text-xl font-mono font-medium text-white">
              {pool.stats?.userCount || 0}
            </div>
          </div>

          <div className="p-4 bg-slate-900/50 border border-white/10 rounded-xl">
             <div className="text-slate-500 text-xs mb-1 flex items-center gap-2">
              <Activity className="w-3 h-3" /> Status
            </div>
            <div className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide",
              pool.state === 'active' ? "text-green-400" : "text-yellow-400"
            )}>
              <span className={cn("w-1.5 h-1.5 rounded-full", pool.state === 'active' ? "bg-green-400" : "bg-yellow-400")}></span>
              {pool.state || 'Active'}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Vesting Progress</span>
            <span className="text-white font-mono">{percentage.toFixed(2)}%</span>
          </div>
          <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full bg-purple-500 transition-all duration-500" 
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Configuration Details */}
        <div className="bg-slate-950 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-900/50 border-b border-white/5 text-sm font-medium text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-400" /> Configuration
          </div>
          <div className="p-4 grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
            <div>
              <div className="text-slate-500 text-xs mb-1">Pool Name</div>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="bg-slate-900 border border-white/20 rounded px-2 py-1 text-white text-sm w-full focus:outline-none focus:border-purple-500"
                    autoFocus
                  />
                  <button onClick={handleSaveName} disabled={saving} className="p-1 text-green-400 hover:bg-green-400/10 rounded">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setIsEditingName(false)} className="p-1 text-red-400 hover:bg-red-400/10 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <div className="text-white">{pool.name}</div>
                  <button onClick={handleStartEdit} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white transition-opacity">
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            <div>
              <div className="text-slate-500 text-xs mb-1">Pool ID</div>
              <div className="text-white font-mono text-xs">{pool.id}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs mb-1">Vesting Mode</div>
              <div className="text-white capitalize">{pool.vestingMode}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs mb-1">Streamflow ID</div>
              <div className="text-white font-mono text-xs flex items-center gap-2">
                {pool.streamflowId ? (
                  <>
                    {pool.streamflowId.slice(0, 8)}...{pool.streamflowId.slice(-8)}
                    <a 
                      href={`https://app.streamflow.finance/contract/solana/mainnet/${pool.streamflowId}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-purple-400 hover:text-purple-300"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </>
                ) : (
                  <span className="text-slate-600">Not Deployed</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-slate-950 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-900/50 border-b border-white/5 text-sm font-medium text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-400" /> Schedule
          </div>
          <div className="p-4 grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
            <div>
              <div className="text-slate-500 text-xs mb-1">Start Date</div>
              <div className="text-white font-mono">{formatDate(pool.startTime)}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs mb-1">End Date</div>
              <div className="text-white font-mono">{formatDate(pool.endTime)}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs mb-1">Duration</div>
              <div className="text-white">{pool.vestingDuration?.toFixed(2)} days</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs mb-1">Cliff</div>
              <div className="text-white">{pool.cliffDuration ? `${pool.cliffDuration.toFixed(2)} days` : "None"}</div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
