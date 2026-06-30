"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, Shield, User, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/shared";
import { updateProfile, updatePassword } from "@/actions/user";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRef } from "react";

const fadeInUp = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

interface SettingsFormProps {
  user: {
    name: string | null;
    email: string;
    image: string | null;
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
  const [avatarUrl, setAvatarUrl] = useState(user.image || "");
  const [profileLoading, setProfileLoading] = useState(false);

  // Security password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Handle Profile Save
  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error("Full name cannot be empty");
      return;
    }
    setProfileLoading(true);
    try {
      const res = await updateProfile(name, avatarUrl || undefined);
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

  // Handle Avatar Selection
  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 150;
        const MAX_HEIGHT = 150;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        setAvatarUrl(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Handle Password Save
  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error("Please fill in both password fields");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await updatePassword(currentPassword, newPassword);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (e) {
      toast.error("Failed to update password");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Get initials for avatar fallback
  const getInitials = (n: string) => {
    return n
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "AK";
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Profile Section */}
      <motion.div variants={fadeInUp}>
        <GlassCard>
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profile
          </h2>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar upload */}
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              <input 
                type="file" 
                ref={avatarInputRef} 
                onChange={handleAvatarChange} 
                accept="image/*" 
                className="hidden" 
              />
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Profile Avatar" 
                  className="w-24 h-24 rounded-2xl object-cover border border-border shadow-lg shadow-primary/10" 
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl gradient-bg flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary/25">
                  {getInitials(name)}
                </div>
              )}
              <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </div>

            {/* Form */}
            <div className="flex-1 space-y-4 w-full">
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
              Update Password
            </button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
