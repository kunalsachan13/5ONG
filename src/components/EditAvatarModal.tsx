"use client";

import React, { useState, useRef, useEffect } from "react";
import { Camera, X, Upload, Trash2, Check, Sparkles, Image as ImageIcon } from "lucide-react";
import { useApp } from "@/components/AppProvider";

const PRESET_AVATARS = [
  "https://api.dicebear.com/7.x/bottts/svg?seed=Astra",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Cosmo",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Echo",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Nova",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Pixel",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Zephyr",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Blaze",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Luna",
];

export function EditAvatarModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { user, setUser, toast } = useApp();
  const [preview, setPreview] = useState<string | null>(user?.avatarUrl || null);
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPreview(user?.avatarUrl || null);
      setImageUrl("");
      setError(null);
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (PNG, JPG, WebP)");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("File is too large. Please select an image under 8MB.");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize and center crop in canvas for crisp, lightweight image
        const canvas = document.createElement("canvas");
        const size = 300;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
        setPreview(dataUrl);
        setImageUrl("");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) return;
    setPreview(imageUrl.trim());
  };

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: preview }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile picture");
      setUser(data.user);
      toast(preview ? "Profile picture updated!" : "Profile picture removed");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update profile picture");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setPreview(null);
    setImageUrl("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="card w-full max-w-md p-6 flex flex-col gap-5 shadow-2xl pop-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black flex items-center gap-2">
            <Camera size={20} className="text-lilac-deep" /> Profile Picture
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted hover:bg-lilac/30 hover:text-ink transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current / New Avatar Preview */}
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="relative group">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Avatar Preview"
                className="h-28 w-28 rounded-full object-cover shadow-lg border-4 border-white/80 dark:border-ink/20"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-lilac to-pink text-3xl font-black text-white shadow-lg border-4 border-white/80">
                {user.username[0]?.toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Upload new photo"
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition backdrop-blur-xs"
            >
              <Upload size={24} />
            </button>
          </div>
          <p className="text-xs font-bold text-muted">
            @{user.username}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-soft flex-1 !py-2.5 text-xs font-bold"
          >
            <Upload size={15} /> Upload photo
          </button>
          {preview && (
            <button
              type="button"
              onClick={handleRemove}
              className="btn btn-ghost !py-2.5 text-xs text-rose-500 hover:bg-rose-500/10"
              title="Remove profile picture"
            >
              <Trash2 size={15} /> Remove
            </button>
          )}
        </div>

        {/* Preset Gallery */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-extrabold text-muted flex items-center gap-1.5">
            <Sparkles size={14} className="text-lilac-deep" /> Or pick a preset avatar
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {PRESET_AVATARS.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPreview(url)}
                className={`relative rounded-xl overflow-hidden border-2 p-1 transition hover:scale-105 active:scale-95 ${
                  preview === url ? "border-lilac-deep shadow-md scale-105 bg-lilac/20" : "border-ink/10 hover:border-lilac/40"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Preset ${i}`} className="w-full h-auto aspect-square rounded-lg" />
                {preview === url && (
                  <span className="absolute top-0.5 right-0.5 grid h-4 w-4 place-items-center rounded-full bg-lilac-deep text-white shadow-xs">
                    <Check size={10} strokeWidth={3} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* URL Input */}
        <form onSubmit={handleApplyUrl} className="flex gap-2">
          <input
            className="input !py-2 text-xs flex-1"
            placeholder="Or paste an image URL..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <button
            type="submit"
            className="btn btn-soft !py-2 !px-3 text-xs"
            disabled={!imageUrl.trim()}
          >
            <ImageIcon size={14} /> Apply
          </button>
        </form>

        {error && (
          <p className="rounded-xl bg-pink/50 p-2.5 text-xs font-bold text-rose-700">
            {error}
          </p>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-ink/5">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost !py-2 text-xs font-bold"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary !py-2 text-xs font-bold"
            disabled={busy || preview === user.avatarUrl}
          >
            {busy ? "Saving..." : "Save Picture"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditAvatarModal;
