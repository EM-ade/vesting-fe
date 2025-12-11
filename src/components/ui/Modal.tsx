"use client";

import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  widthClassName?: string;
};

export function Modal({ open, title, description, children, footer, onClose, widthClassName }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (typeof window === "undefined") {
    return null;
  }

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        className={cn(
          "glass-panel relative max-h-[80vh] w-full overflow-hidden overflow-y-auto rounded-2xl p-6 text-white shadow-2xl bg-[#0c0b25] border border-white/10",
          widthClassName ?? "max-w-xl"
        )}
      >
        {/* X Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {(title || description) && (
          <header className="mb-4 space-y-1 pr-8">
            {title && <h2 className="text-xl font-semibold text-white">{title}</h2>}
            {description && <p className="text-sm text-white/60">{description}</p>}
            <div className="panel-divider" />
          </header>
        )}

        <div className="space-y-4 text-sm text-white/80">{children}</div>

        {footer && (
          <footer className="mt-6 flex flex-wrap justify-end gap-2">{footer}</footer>
        )}
      </div>
    </div>,
    document.body
  );
}
