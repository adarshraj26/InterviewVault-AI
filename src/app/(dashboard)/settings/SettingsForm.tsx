"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, Shield, Upload, User, Loader2, FileText, Check, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/shared";
import { updateProfile, updatePassword } from "@/actions/user";
import { parseResumeAndSetupWorkspaces, extractTextFromPdfAction, deleteResume } from "@/actions/resume";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const fadeInUp = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

interface SettingsFormProps {
  user: {
    name: string | null;
    email: string;
    image: string | null;
  };
  activeResume: {
    id: string;
    fileName: string;
    fileSize: number;
    parsedAt: Date | null;
    createdAt: Date;
    skills: { name: string }[];
    rawText: string | null;
  } | null;
}

export default function SettingsForm({ user, activeResume }: SettingsFormProps) {
  const router = useRouter();
  const { update } = useSession();
  const [name, setName] = useState(user.name || "");
  const [avatarUrl, setAvatarUrl] = useState(user.image || "");
  const [profileLoading, setProfileLoading] = useState(false);

  // Security password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Resume state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState(activeResume?.rawText || "");
  const [showTextPaste, setShowTextPaste] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeRecord, setResumeRecord] = useState(activeResume);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
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

        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setAvatarUrl(dataUrl);
        toast.success("Avatar loaded and compressed. Click Save Changes to apply!");
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

  // Handle Resume File Picker Trigger
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  // Handle Resume File Selected
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeFile(file);
    const fileNameLower = file.name.toLowerCase();

    // Auto-read if it is a text-like file
    if (file.type === "text/plain" || fileNameLower.endsWith(".txt") || fileNameLower.endsWith(".md")) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string || "";
        setResumeText(text);
        
        // Auto parse
        toast.loading("Parsing resume skills and creating workspaces...", { id: "parse-progress" });
        try {
          const res = await parseResumeAndSetupWorkspaces("local-upload", file.name, file.size, text);
          if (res.error) {
            toast.error(res.error, { id: "parse-progress" });
            return;
          }
          toast.success(`Successfully parsed skills and created ${res.workspacesCreated} workspaces!`, { id: "parse-progress" });
          setResumeRecord({
            id: "new-resume",
            fileName: file.name,
            fileSize: file.size,
            parsedAt: new Date(),
            createdAt: new Date(),
            skills: [],
            rawText: text
          });
        } catch (err) {
          toast.error("Failed to parse resume content", { id: "parse-progress" });
        }
      };
      reader.readAsText(file);
    } else if (file.type === "application/pdf" || fileNameLower.endsWith(".pdf")) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(",")[1];
        toast.loading("Extracting text from PDF resume...", { id: "pdf-extract" });
        try {
          const res = await extractTextFromPdfAction(base64);
          if (res.error) {
            toast.error(res.error, { id: "pdf-extract" });
            setShowTextPaste(true); // Fallback to paste box if parsing fails
            return;
          }
          toast.success("Successfully extracted PDF text!", { id: "pdf-extract" });
          setResumeText(res.text || "");

          // Auto parse
          toast.loading("Parsing resume skills and creating workspaces...", { id: "parse-progress" });
          const parseRes = await parseResumeAndSetupWorkspaces("local-upload", file.name, file.size, res.text || "");
          if (parseRes.error) {
            toast.error(parseRes.error, { id: "parse-progress" });
            return;
          }
          toast.success(`Successfully parsed skills and created ${parseRes.workspacesCreated} workspaces!`, { id: "parse-progress" });
          setResumeRecord({
            id: "new-resume",
            fileName: file.name,
            fileSize: file.size,
            parsedAt: new Date(),
            createdAt: new Date(),
            skills: [],
            rawText: res.text || ""
          });
        } catch (err) {
          toast.error("Failed to process PDF file", { id: "pdf-extract" });
          setShowTextPaste(true);
        }
      };
      reader.readAsDataURL(file);
    } else {
      // Fallback for DOCX or other formats to use manual paste
      setShowTextPaste(true);
      toast.info("Please paste the plain text of your resume in the textarea below to parse with Gemini.");
    }
  };

  // Parse Resume text using server action
  const handleParseResume = async () => {
    const fileName = resumeFile ? resumeFile.name : (resumeRecord?.fileName || "resume.txt");
    const fileSize = resumeFile ? resumeFile.size : (resumeRecord?.fileSize || 1024);

    if (!resumeText.trim()) {
      toast.error("Please paste or load your resume text before parsing");
      return;
    }

    setResumeLoading(true);
    try {
      const res = await parseResumeAndSetupWorkspaces(
        "local-upload", // URL placeholder
        fileName,
        fileSize,
        resumeText
      );

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(`Successfully parsed skills and created ${res.workspacesCreated} workspaces!`);
      setShowTextPaste(false);
      
      // Update local record to simulate update
      setResumeRecord({
        id: "new-resume",
        fileName,
        fileSize,
        parsedAt: new Date(),
        createdAt: new Date(),
        skills: [], // list is refreshed on page reload
        rawText: resumeText
      });
    } catch (e) {
      toast.error("Failed to parse resume");
    } finally {
      setResumeLoading(false);
    }
  };

  // Delete resume
  const handleDeleteResume = async () => {
    if (!resumeRecord) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleteLoading(true);
    try {
      const res = await deleteResume(resumeRecord.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Resume deleted. You can now upload a new one.");
      setResumeRecord(null);
      setResumeText("");
      setResumeFile(null);
    } catch {
      toast.error("Failed to delete resume");
    } finally {
      setDeleteLoading(false);
      setConfirmDelete(false);
    }
  };

  // Re-parse existing resume
  const handleReParse = async () => {
    if (!resumeRecord) return;
    
    const textToParse = resumeText || resumeRecord.rawText || "";
    if (!textToParse.trim()) {
      setShowTextPaste(true);
      toast.info("Please paste or review your resume text below and click Parse.");
      return;
    }

    setResumeLoading(true);
    toast.loading("Re-parsing resume and updating workspaces...", { id: "reparse-progress" });
    try {
      const res = await parseResumeAndSetupWorkspaces(
        "local-upload",
        resumeRecord.fileName,
        resumeRecord.fileSize,
        textToParse
      );

      if (res.error) {
        toast.error(res.error, { id: "reparse-progress" });
        return;
      }

      toast.success(`Successfully re-parsed resume! Created ${res.workspacesCreated} workspaces.`, { id: "reparse-progress" });
      setShowTextPaste(false);
      
      setResumeRecord(prev => prev ? {
        ...prev,
        parsedAt: new Date(),
      } : null);
    } catch (e) {
      toast.error("Failed to re-parse resume", { id: "reparse-progress" });
    } finally {
      setResumeLoading(false);
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

      {/* Resume Upload */}
      <motion.div variants={fadeInUp}>
        <GlassCard>
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Resume
          </h2>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".pdf,.docx,.txt,.md" 
            className="hidden" 
          />

          <div 
            onClick={handleBrowseClick}
            className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
          >
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">Drag and drop your resume here</p>
            <p className="text-xs text-muted-foreground mb-4">Supports PDF, DOCX, TXT (max 10MB)</p>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleBrowseClick();
              }}
              className="gradient-bg text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/25"
            >
              Browse Files
            </button>
          </div>

          {/* Show text pasting area when a file is selected or Re-parse is clicked */}
          {showTextPaste && (
            <div className="mt-6 space-y-3 bg-muted/20 p-4 rounded-xl border border-border">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-primary block">
                  {resumeFile ? `Resume Text (${resumeFile.name})` : "Paste Resume Text"}
                </label>
                <button 
                  onClick={() => setShowTextPaste(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
              
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste the plain text content of your resume here to extract skills with Gemini AI..."
                className="w-full h-48 p-3 bg-black/30 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-sm resize-none font-mono"
              />
              
              <button
                onClick={handleParseResume}
                disabled={resumeLoading}
                className="w-full gradient-bg text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {resumeLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Parsing and Generating Workspaces...
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    Parse Resume
                  </>
                )}
              </button>
            </div>
          )}

          {resumeRecord && (
            <div className="mt-4 glass rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{resumeRecord.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {formatDistanceToNow(new Date(resumeRecord.createdAt), { addSuffix: true })}
                      {resumeRecord.skills && resumeRecord.skills.length > 0 && ` · ${resumeRecord.skills.length} skills detected`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <button
                    onClick={handleReParse}
                    disabled={resumeLoading || deleteLoading}
                    className="text-xs text-primary hover:text-primary/80 transition-colors font-semibold disabled:opacity-50"
                  >
                    Re-parse
                  </button>
                  {confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDeleteResume}
                        disabled={deleteLoading}
                        className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        {deleteLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      disabled={resumeLoading || deleteLoading}
                      title="Delete this resume"
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors font-semibold disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
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
