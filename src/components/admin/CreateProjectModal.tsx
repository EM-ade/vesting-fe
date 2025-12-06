"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";

type CreateProjectModalProps = {
  open: boolean;
  onClose: () => void;
};

export function CreateProjectModal({ open, onClose }: CreateProjectModalProps) {
  const { publicKey } = useWallet();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    logo_url: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.post<{ success: boolean; projectId: string }>("/projects", {
        ...formData,
        wallet_address: publicKey.toBase58(),
      });

      if (response.success) {
        // Save selection and redirect
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedProjectId', response.projectId);
        }
        
        onClose();
        router.push('/admin');
      }
    } catch (err) {
      console.error("Failed to create project:", err);
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create New Project">
      <form onSubmit={handleSubmit} className="space-y-4 font-inter">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">Project Name</label>
          <input
            required
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none"
            placeholder="My Awesome Protocol"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">Token Symbol</label>
          <input
            required
            type="text"
            value={formData.symbol}
            onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none"
            placeholder="MAP"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">Logo URL (Optional)</label>
          <input
            type="url"
            value={formData.logo_url}
            onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">Description (Optional)</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none h-24 resize-none"
            placeholder="Brief description of your project..."
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="default" loading={loading}>
            Create Project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
