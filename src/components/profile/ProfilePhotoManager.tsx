"use client";

import { useState, useTransition, useEffect } from "react";
import { motion } from "framer-motion";
import { Camera, Palette, Trash2, RotateCcw, Loader2 } from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { AvatarLibrary } from "@/components/profile/AvatarLibrary";
import { PhotoUploadCrop } from "@/components/profile/PhotoUploadCrop";
import { removeProfileImage, restoreDefaultAvatar } from "@/actions/user";
import { resolveProfileImage } from "@/lib/profile-image";

import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

interface ProfilePhotoManagerProps {
  user: {
    name: string | null;
    email: string;
    image: string | null;
    profileImageUrl: string | null;
    googleImageUrl: string | null;
    selectedAvatarId: string | null;
    avatarType: string | null;
  };
}

export function ProfilePhotoManager({ user: initialUser }: ProfilePhotoManagerProps) {
  const { update } = useSession();

  const [user, setUser] = useState(initialUser);
  const [showUpload, setShowUpload]       = useState(false);
  const [showAvatarLib, setShowAvatarLib] = useState(false);
  const [isPending, startTransition]      = useTransition();

  // On mount: if DB has a googleImageUrl/avatarType that the session token
  // doesn't know about yet (e.g. first load after backfill, or stale JWT),
  // push a session.update() so navbar/sidebar reflect the correct picture.
  useEffect(() => {
    if (initialUser.googleImageUrl || initialUser.profileImageUrl || initialUser.selectedAvatarId) {
      update({
        googleImageUrl:   initialUser.googleImageUrl,
        profileImageUrl:  initialUser.profileImageUrl,
        selectedAvatarId: initialUser.selectedAvatarId,
        avatarType:       initialUser.avatarType,
      }).catch(() => {/* non-critical */});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isCustomActive   = user.avatarType === "CUSTOM_UPLOAD";
  const isAvatarActive   = user.avatarType === "AVATAR_LIBRARY";
  const isDefaultActive  = user.avatarType === "DEFAULT" || !user.avatarType;

  // Refresh session token after any change so navbar/sidebar update immediately
  const refreshSession = async (partial: Partial<typeof user>) => {
    const next = { ...user, ...partial };
    setUser(next);
    await update({
      profileImageUrl:  next.profileImageUrl,
      googleImageUrl:   next.googleImageUrl,
      selectedAvatarId: next.selectedAvatarId,
      avatarType:       next.avatarType,
    });
  };

  const handleUploaded = async (url: string) => {
    await refreshSession({ profileImageUrl: url, avatarType: "CUSTOM_UPLOAD" });
  };

  const handleAvatarSelected = async (avatarId: string) => {
    await refreshSession({ selectedAvatarId: avatarId, avatarType: "AVATAR_LIBRARY" });
  };

  const handleRemove = () => {
    startTransition(async () => {
      const res = await removeProfileImage();
      if (res.error) { toast.error(res.error); return; }
      const fallback = (res as { fallback?: string }).fallback ?? "DEFAULT";
      await refreshSession({
        profileImageUrl:  null,
        selectedAvatarId: null,
        avatarType:       fallback,
      });
      toast.success("Profile photo removed");
    });
  };

  const handleRestoreDefault = () => {
    startTransition(async () => {
      const res = await restoreDefaultAvatar();
      if (res.error) { toast.error(res.error); return; }
      await refreshSession({ profileImageUrl: null, selectedAvatarId: null, avatarType: "DEFAULT" });
      toast.success("Restored to default avatar");
    });
  };


  return (
    <>
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Large avatar preview */}
        <div className="relative shrink-0">
          <UserAvatar user={user} size="2xl" ring className="shadow-xl shadow-primary/20" />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowUpload(true)}
            className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl gradient-bg shadow-lg shadow-primary/30 flex items-center justify-center text-white border-2 border-background"
          >
            <Camera className="h-4 w-4" />
          </motion.button>
        </div>

        {/* Actions column */}
        <div className="flex-1 space-y-3 w-full">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <ActionButton
              icon={<Camera className="h-4 w-4" />}
              label="Upload Photo"
              active={isCustomActive}
              onClick={() => setShowUpload(true)}
              disabled={isPending}
            />
            <ActionButton
              icon={<Palette className="h-4 w-4" />}
              label="Choose Avatar"
              active={isAvatarActive}
              onClick={() => setShowAvatarLib(true)}
              disabled={isPending}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Remove (only show if there's something to remove) */}
            {!isDefaultActive && (
              <ActionButton
                icon={isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                label="Remove Photo"
                variant="danger"
                onClick={handleRemove}
                disabled={isPending}
              />
            )}

            {/* Restore default */}
            {!isDefaultActive && (
              <ActionButton
                icon={<RotateCcw className="h-4 w-4" />}
                label="Reset to Default"
                onClick={handleRestoreDefault}
                disabled={isPending}
              />
            )}
          </div>
        </div>

      </div>

      {/* Modals */}
      <PhotoUploadCrop
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUploaded={handleUploaded}
      />
      <AvatarLibrary
        isOpen={showAvatarLib}
        onClose={() => setShowAvatarLib(false)}
        onSelected={handleAvatarSelected}
        currentAvatarId={user.selectedAvatarId}
      />
    </>
  );
}

// ── Small helper ────────────────────────────────────────────────
interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  variant?: "default" | "danger";
}
function ActionButton({ icon, label, onClick, active, disabled, variant = "default" }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border",
        active
          ? "gradient-bg text-white border-transparent shadow-md shadow-primary/20"
          : variant === "danger"
          ? "border-border bg-muted/30 text-red-500 hover:bg-red-500/10 hover:border-red-500/30"
          : "border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted",
        "disabled:opacity-50 disabled:cursor-not-allowed"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
