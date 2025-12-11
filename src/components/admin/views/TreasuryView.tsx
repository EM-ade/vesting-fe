"use client";

import { useState } from "react";
import { TreasuryWidget } from "@/components/dashboard/TreasuryWidget";
import { ClaimsPolicyPanel } from "@/components/dashboard/ClaimsPolicyPanel";
import { WithdrawModal } from "@/components/admin/modals/WithdrawModal";
import { Button } from "@/components/ui/Button";
import { ArrowDownToLine } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";

import { OnboardingModal } from "@/components/admin/OnboardingModal";
import { BookOpen } from "lucide-react";

export function TreasuryView() {
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const { currentProject } = useProject();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-space text-white">Treasury & Policies</h1>
        <div className="flex gap-2">
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
            className="bg-purple-500 hover:bg-purple-600"
          >
            <ArrowDownToLine className="w-4 h-4 mr-2" />
            Withdraw Tokens
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TreasuryWidget />
        <ClaimsPolicyPanel />
      </div>

      {currentProject && (
        <>
          <WithdrawModal
            open={withdrawModalOpen}
            onClose={() => setWithdrawModalOpen(false)}
            projectId={currentProject.id}
            onSuccess={() => {
              // Optionally refresh treasury widget
              window.location.reload();
            }}
          />
          <OnboardingModal
            isOpen={onboardingOpen}
            onClose={() => setOnboardingOpen(false)}
            autoShow={false}
          />
        </>
      )}
    </div>
  );
}
