"use client";

import { useState } from "react";
import { TreasuryWidget } from "@/components/dashboard/TreasuryWidget";
import { WithdrawModal } from "@/components/admin/modals/WithdrawModal";
import { CreateVestingModal } from "@/components/vesting/CreateVestingModal";
import { Button } from "@/components/ui/Button";
import { ArrowDownToLine, BookOpen, Plus } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { useQueryClient } from "@tanstack/react-query";

import { OnboardingModal } from "@/components/admin/OnboardingModal";

export function TreasuryView() {
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { currentProject, refreshData } = useProject();
  const queryClient = useQueryClient();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-space text-white">Treasury</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-purple-500 hover:bg-purple-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Pool
          </Button>
          <Button
            variant="outline"
            onClick={() => setOnboardingOpen(true)}
            className="border-white/10 hover:bg-white/5"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Setup Guide
          </Button>
          <Button
            onClick={() => setWithdrawModalOpen(true)}
            className="bg-gray-600 hover:bg-gray-700"
          >
            <ArrowDownToLine className="w-4 h-4 mr-2" />
            Withdraw Tokens
          </Button>
        </div>
      </div>

      <div className="w-full">
        <TreasuryWidget />
      </div>

      {currentProject && (
        <>
          <WithdrawModal
            open={withdrawModalOpen}
            onClose={() => setWithdrawModalOpen(false)}
            projectId={currentProject.id}
            onSuccess={() => {
              // Invalidate treasury queries to refetch data
              queryClient.invalidateQueries({ queryKey: ['admin', currentProject.id, 'treasury'] });
              refreshData();
            }}
          />
          <OnboardingModal
            isOpen={onboardingOpen}
            onClose={() => setOnboardingOpen(false)}
            autoShow={false}
          />
          <CreateVestingModal
            open={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            mode="snapshot"
            onModeChange={() => {}}
            onSuccess={() => {
              setCreateModalOpen(false);
              refreshData();
            }}
          />
        </>
      )}
    </div>
  );
}
