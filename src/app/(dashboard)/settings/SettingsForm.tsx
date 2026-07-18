"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, User, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/shared";
import { ProfilePhotoManager } from "@/components/profile/ProfilePhotoManager";
import { updateProfile, updatePassword } from "@/actions/user";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const fadeInUp = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

interface SettingsFormProps {
  user: {
    name: string | null;
    email: string;
    image: string | null;
    profileImageUrl: string | null;
    googleImageUrl: string | null;
    selectedAvatarId: string | null;
    avatarType: string | null;
    hasPassword?: boolean;
  };
  activeResume?: {
    id: string;
    fileName: string;
    fileSize: number;
    parsedAt: Date | null;
    createdAt: Date;
    skills: { name: string }[];
    rawText: string | null;
  } | null;
}

export default function SettingsForm({ user }: SettingsFormProps) {
  const router = useRouter();
  const { update } = useSession();
  const [name, setName] = useState(user.name || "");
  const [profileLoading, setProfileLoading] = useState(false);

  // Security password state
  const [hasPassword, setHasPassword] = useState(!!user.hasPassword);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Handle Profile Save (name only — photo managed by ProfilePhotoManager)
  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error("Full name cannot be empty");
      return;
    }
    setProfileLoading(true);
    try {
      const res = await updateProfile(name);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Profile updated successfully!");
      await update();
      router.refresh();
    } catch (e) {
      toast.error("Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle Password Save
  const handleUpdatePassword = async () => {
    if (hasPassword && !currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (!newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await updatePassword(hasPassword ? currentPassword : "", newPassword);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(hasPassword ? "Password updated successfully!" : "Password set successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setHasPassword(true);
    } catch (e) {
      toast.error("Failed to update password");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Profile Photo Section */}
      <motion.div variants={fadeInUp}>
        <GlassCard>
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profile Photo
          </h2>
          <ProfilePhotoManager user={user} />
        </GlassCard>
      </motion.div>

      {/* Profile Info Section */}
      <motion.div variants={fadeInUp}>
        <GlassCard>
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profile
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-border bg-black/20 px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full rounded-xl border border-border bg-white/5 px-4 py-3 text-sm text-foreground/60 cursor-not-allowed"
              />
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={profileLoading}
              className="gradient-bg text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/25 flex items-center gap-2 disabled:opacity-50"
            >
              {profileLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </GlassCard>
      </motion.div>

      {/* Security */}
      <motion.div variants={fadeInUp}>
        <GlassCard>
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Security
          </h2>
          <div className="space-y-4">
            {hasPassword ? (
              <div>
                <label className="block text-sm font-medium mb-1.5">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border bg-black/20 px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground flex items-center justify-between">
                <span>You signed in using Google OAuth. Set a password below to enable credentials login.</span>
                <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-[10px] font-semibold uppercase">Google OAuth</span>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-black/20 px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
            <button
              onClick={handleUpdatePassword}
              disabled={passwordLoading}
              className="bg-muted hover:bg-muted/80 text-foreground px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {passwordLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {hasPassword ? "Update Password" : "Set Password"}
            </button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
