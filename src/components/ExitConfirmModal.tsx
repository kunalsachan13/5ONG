"use client";

import { useEffect } from "react";
import { LogOut, Music2, X } from "lucide-react";
import { registerBackHandler } from "@/lib/backHandler";

interface Props {
  isOpen: boolean;
  onCancel: () => void;
  onConfirmExit: () => void;
}

export default function ExitConfirmModal({ isOpen, onCancel, onConfirmExit }: Props) {
  useEffect(() => {
    if (!isOpen) return;

    // If back button is pressed while Exit Modal is open, dismiss the modal safely
    return registerBackHandler(() => {
      onCancel();
      return true;
    });
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="card w-full max-w-xs p-5 flex flex-col gap-4 shadow-2xl border border-white/10 pop-in text-center"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Confirm Exit"
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-pink/20 text-pink-500 shadow-md">
          <Music2 size={28} />
        </div>

        <div>
          <h3 className="text-lg font-black text-ink dark:text-white">Exit 5ONG?</h3>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            Are you sure you want to close the app? Your playback position and queue will be saved.
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            className="btn btn-soft flex-1 !py-2.5 text-xs font-bold"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary flex-1 !py-2.5 text-xs font-bold !bg-rose-600 hover:!bg-rose-700 !text-white"
            onClick={onConfirmExit}
          >
            <LogOut size={14} /> Exit App
          </button>
        </div>
      </div>
    </div>
  );
}
