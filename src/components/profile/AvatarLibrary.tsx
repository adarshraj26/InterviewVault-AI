"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2, Search } from "lucide-react";
import { AVATAR_CATEGORIES, getAvatarUrl, buildAvatarId } from "@/lib/profile-image";
import { selectAvatarLibraryImage } from "@/actions/user";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AvatarLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelected: (avatarId: string) => void;
  currentAvatarId?: string | null;
}

export function AvatarLibrary({ isOpen, onClose, onSelected, currentAvatarId }: AvatarLibraryProps) {
  const [activeCategory, setActiveCategory] = useState<typeof AVATAR_CATEGORIES[number]["id"]>(AVATAR_CATEGORIES[0].id);

  const [selectedId, setSelectedId]         = useState<string | null>(currentAvatarId ?? null);
  const [isPending, startTransition]        = useTransition();

  const category = AVATAR_CATEGORIES.find((c) => c.id === activeCategory)!;

  const handleSelect = (style: string, seed: string) => {
    const id = buildAvatarId(style, seed);
    setSelectedId(id);
  };

  const handleSave = () => {
    if (!selectedId) return;
    startTransition(async () => {
      const res = await selectAvatarLibraryImage(selectedId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Avatar updated!");
      onSelected(selectedId);
      onClose();
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[640px] sm:max-h-[80vh] bg-card border border-border rounded-2xl shadow-2xl z-[301] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0">
              <div>
                <h2 className="text-lg font-bold">Avatar Library</h2>
                <p className="text-xs text-muted-foreground">Choose from 10 categories</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Category tabs — horizontal scroll */}
            <div className="flex gap-2 px-6 py-3 overflow-x-auto border-b border-border/50 shrink-0 scrollbar-thin">
              {AVATAR_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all",
                    activeCategory === cat.id
                      ? "gradient-bg text-white shadow-md shadow-primary/20"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Avatar grid */}
            <div className="flex-1 overflow-y-auto p-6">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-4 sm:grid-cols-6 gap-3"
              >
                {category.seeds.map((seed) => {
                  const compositeId = buildAvatarId(category.style, seed);
                  const url = getAvatarUrl(compositeId);
                  const isSelected = selectedId === compositeId;

                  return (
                    <button
                      key={seed}
                      onClick={() => handleSelect(category.style, seed)}
                      className={cn(
                        "relative rounded-2xl overflow-hidden aspect-square border-2 transition-all group",
                        isSelected
                          ? "border-primary shadow-lg shadow-primary/30 scale-105"
                          : "border-border hover:border-primary/50 hover:scale-105"
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Avatar ${seed}`}
                        className="w-full h-full object-cover bg-muted/30 p-1"
                        loading="lazy"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-3.5 w-3.5 text-white" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between shrink-0">
              {selectedId ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getAvatarUrl(selectedId)}
                    alt="Selected avatar preview"
                    className="h-10 w-10 rounded-xl border border-border bg-muted/30 p-0.5"
                  />
                  <div>
                    <p className="text-xs font-semibold">Selected Avatar</p>
                    <p className="text-[11px] text-muted-foreground">Click Save to apply</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Select an avatar above</p>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-muted hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!selectedId || isPending}
                  className="px-5 py-2 rounded-xl text-sm font-semibold gradient-bg text-white shadow-lg shadow-primary/25 hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Avatar
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
