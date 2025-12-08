import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useProject } from "@/contexts/ProjectContext";
import { api } from "@/lib/api";
import { useWallet } from "@solana/wallet-adapter-react";
import { ArrowRight, Copy, Check, RefreshCw } from "lucide-react";

type ProjectDetails = {
  id: string;
  name: string;
  vault_public_key: string;
  vault_balance_sol: number;
  vault_balance_token: number;
  mint_address: string;
};

export function OnboardingModal() {
  const { currentProject } = useProject();
  const { publicKey } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [mintAddress, setMintAddress] = useState("");
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fix missing dependency warning by wrapping fetchProjectDetails in useEffect or useCallback
  useEffect(() => {
    const fetchDetails = async () => {
        if (!currentProject?.id) return;
        try {
          const details = await api.get<ProjectDetails>(`/projects/${currentProject.id}`);
          setProjectDetails(details);
          
          // Trigger modal if vault has no SOL or no mint address
          if (details.vault_balance_sol < 0.01 || !details.mint_address) {
            setIsOpen(true);
            // Jump to appropriate step
            if (details.vault_balance_sol < 0.01) setStep(1);
            else if (!details.mint_address) setStep(2);
          }
        } catch (err) {
          console.error("Failed to fetch project details:", err);
        }
      };

    if (currentProject?.id) {
      fetchDetails();
    }
  }, [currentProject?.id]); // removed fetchProjectDetails from dependencies as it is now inside

    // Re-define fetchProjectDetails for manual refresh if needed, or just move logic inside
  const fetchProjectDetails = async () => {
    if (!currentProject?.id) return;
    try {
      const details = await api.get<ProjectDetails>(`/projects/${currentProject.id}`);
      setProjectDetails(details);
    } catch (err) {
        console.error(err);
    }
  };


  const refreshBalance = async () => {
    setRefreshing(true);
    await fetchProjectDetails();
    setRefreshing(false);
  };

  const handleSaveMint = async () => {
    if (!currentProject?.id || !mintAddress) return;
    setLoading(true);
    try {
      await api.put(`/projects/${currentProject.id}`, {
        mint_address: mintAddress,
        adminWallet: publicKey?.toBase58() // For auth verification
      });
      await fetchProjectDetails();
      setStep(3);
    } catch (err) {
      console.error("Failed to update mint:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !projectDetails) return null;

  const vaultAddress = projectDetails.vault_public_key || "";

  return (
    <Modal open={isOpen} onClose={() => {}} title="Project Setup" widthClassName="max-w-xl">
      <div className="space-y-6 font-inter">
        
        {/* Progress Bar */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div 
              key={s} 
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-purple-500" : "bg-white/10"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-white">Fund Your Vault</h3>
              <p className="text-white/60 text-sm">
                To deploy contracts and pay for gas fees, your project vault needs SOL.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Vault Address</span>
                <span className="text-purple-400 font-mono text-xs bg-purple-500/10 px-2 py-0.5 rounded">
                  {vaultAddress ? `${vaultAddress.slice(0, 4)}...${vaultAddress.slice(-4)}` : "Generating..."}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-black/30 p-2 rounded text-xs font-mono text-white/80 truncate">
                  {vaultAddress || "Vault not generated yet"}
                </code>
                <button 
                  onClick={() => vaultAddress && handleCopy(vaultAddress)}
                  className="p-2 hover:bg-white/10 rounded transition-colors"
                  disabled={!vaultAddress}
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/60" />}
                </button>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg space-y-2">
              <p className="text-xs text-yellow-200">
                ⚠️ Minimum: <strong>0.002 SOL</strong> to complete setup.
              </p>
              <p className="text-xs text-yellow-300/80">
                💡 Recommended: <strong>0.01 SOL</strong> or more for gas fees to effectively setup everything (creating pools, processing claims, etc.)
              </p>
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-white/60">Current Balance:</span>
                <span className={`font-mono font-bold ${(projectDetails?.vault_balance_sol || 0) > 0 ? "text-green-400" : "text-white"}`}>
                  {(projectDetails?.vault_balance_sol || 0).toFixed(4)} SOL
                </span>
                <button onClick={refreshBalance} disabled={refreshing} className={`${refreshing ? "animate-spin" : ""}`}>
                  <RefreshCw className="w-3 h-3 text-white/40 hover:text-white" />
                </button>
              </div>
              <Button 
                size="sm" 
                disabled={(projectDetails?.vault_balance_sol || 0) < 0.01}
                onClick={() => setStep(2)}
              >
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-white">Token Configuration</h3>
              <p className="text-white/60 text-sm">
                Enter the Mint Address of the token you want to distribute.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Token Mint Address</label>
              <input
                type="text"
                value={mintAddress}
                onChange={(e) => setMintAddress(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-purple-500 outline-none"
                placeholder="Address (e.g. 7EYn...)"
              />
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
              <p className="text-xs text-blue-200">
                💡 Don&apos;t forget to send your project tokens to the vault address as well!
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>Back</Button>
              <Button size="sm" onClick={handleSaveMint} disabled={!mintAddress}>
                {loading ? "Saving..." : "Save & Continue"}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">You&apos;re All Set!</h3>
              <p className="text-white/60 text-sm max-w-xs mx-auto">
                Your project vault is funded and configured. You can now start creating vesting pools.
              </p>
            </div>
            <Button className="w-full" onClick={() => setIsOpen(false)}>
              Enter Dashboard
            </Button>
          </div>
        )}

      </div>
    </Modal>
  );
}
