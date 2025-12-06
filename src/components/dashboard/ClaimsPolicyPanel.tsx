"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Shield, DollarSign, Clock, AlertCircle } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";

type ClaimPolicy = {
  enableClaims: boolean;
  requireNFTOnClaim: boolean;
  claimFeeUSD: number;
  cooldownDays: number;
  gracePeriodDays: number;
};

export function ClaimsPolicyPanel() {
  const [policy, setPolicy] = useState<ClaimPolicy>({
    enableClaims: true,
    requireNFTOnClaim: true,
    claimFeeUSD: 10.0,
    cooldownDays: 1,
    gracePeriodDays: 14,
  });
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local edit state for inputs
  const [localFee, setLocalFee] = useState("10.00");
  const [localCooldown, setLocalCooldown] = useState("1");
  const [localGracePeriod, setLocalGracePeriod] = useState("14");

  useEffect(() => {
    async function fetchPolicy() {
      try {
        const data = await api.get<ClaimPolicy>("/config/claim-policy");
        setPolicy(data);
        setLocalFee(data.claimFeeUSD.toString());
        setLocalCooldown(data.cooldownDays.toString());
        setLocalGracePeriod(data.gracePeriodDays.toString());
      } catch (err) {
        console.error("Failed to fetch claim policy:", err);
      }
    }
    fetchPolicy();
  }, []);

  async function updatePolicy(updates: Partial<ClaimPolicy>) {
    if (!publicKey) {
      toast.error("Please connect your wallet to update policy");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.put("/config/claim-policy", {
        ...updates,
        adminWallet: publicKey.toBase58(),
      });
      setPolicy((prev) => ({ ...prev, ...updates }));
      toast.success("Policy updated successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update policy";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  // Debounced save for inputs
  const handleInputChange = async (field: keyof ClaimPolicy, value: string) => {
    let numValue = parseFloat(value);
    if (isNaN(numValue)) numValue = 0;

    // Update local state immediately
    if (field === 'claimFeeUSD') setLocalFee(value);
    if (field === 'cooldownDays') setLocalCooldown(value);
    if (field === 'gracePeriodDays') setLocalGracePeriod(value);

    // Trigger API update (could be debounced in a real app, simple await here)
    // For UX responsiveness, we don't await here but fire and forget, 
    // or use onBlur to save. Let's use onBlur for inputs to avoid spamming API.
  };

  const handleInputBlur = (field: keyof ClaimPolicy, value: string) => {
    let numValue = parseFloat(value);
    if (isNaN(numValue)) numValue = 0;
    updatePolicy({ [field]: numValue });
  };

  function toggleClaims() {
    updatePolicy({ enableClaims: !policy.enableClaims });
  }

  function toggleNFTRequirement() {
    updatePolicy({ requireNFTOnClaim: !policy.requireNFTOnClaim });
  }

  return (
    <div className="bg-slate-950 border border-white/10 rounded-xl overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/30">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-slate-900 border border-white/10 rounded-lg">
            <Shield className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <h2 className="font-medium text-white">Claim Policy</h2>
            <p className="text-xs text-slate-500">Global Restrictions & Fees</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1">
        <div className="space-y-6">
          {/* Enable Claims Toggle */}
          <SettingToggle
            label="Enable Claims"
            helper="Allow users to withdraw tokens globally"
            value={policy.enableClaims}
            onToggle={toggleClaims}
            disabled={loading}
          />

          {/* Claim Fee (Dependent on Enable Claims) */}
          <div className={`transition-opacity duration-200 ${policy.enableClaims ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <label className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-200">Claim Fee (USD)</span>
                <DollarSign className="w-4 h-4 text-slate-500" />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={localFee}
                  onChange={(e) => handleInputChange('claimFeeUSD', e.target.value)}
                  onBlur={(e) => handleInputBlur('claimFeeUSD', e.target.value)}
                  disabled={!policy.enableClaims || loading}
                  className="w-full rounded-lg border border-white/10 bg-slate-900 pl-7 pr-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-purple-500/50 focus:outline-none transition-colors disabled:cursor-not-allowed"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-slate-500">Fee charged per claim transaction.</p>
            </label>
          </div>

          <div className="h-px bg-white/5" />

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-200">Cooldown</span>
                <Clock className="w-4 h-4 text-slate-500" />
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={localCooldown}
                  onChange={(e) => handleInputChange('cooldownDays', e.target.value)}
                  onBlur={(e) => handleInputBlur('cooldownDays', e.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-purple-500/50 focus:outline-none transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">Days</span>
              </div>
            </label>

            <label className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-200">Grace Period</span>
                <AlertCircle className="w-4 h-4 text-slate-500" />
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={localGracePeriod}
                  onChange={(e) => handleInputChange('gracePeriodDays', e.target.value)}
                  onBlur={(e) => handleInputBlur('gracePeriodDays', e.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-purple-500/50 focus:outline-none transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">Days</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {error && (
        <div className="px-6 pb-6">
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded">{error}</p>
        </div>
      )}
    </div>
  );
}

type SettingToggleProps = {
  label: string;
  helper?: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
};

function SettingToggle({ label, helper, value, onToggle, disabled }: SettingToggleProps) {
  return (
    <div 
      className="flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.02] transition-colors cursor-pointer border border-transparent hover:border-white/5" 
      onClick={!disabled ? onToggle : undefined}
    >
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {helper && <p className="text-xs text-slate-500">{helper}</p>}
      </div>
      <div
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none border-2 border-transparent ${
          value ? "bg-purple-600" : "bg-slate-700"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
    </div>
  );
}
