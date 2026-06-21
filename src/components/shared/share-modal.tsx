"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Check, Copy, Download, X, Sparkles, Eye, AlignLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Brand SVG icons ─────────────────────────────────────────
export const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

export const RedditIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M24 11.5c0-1.65-1.35-3-3-3-.96 0-1.86.48-2.42 1.24-1.64-1-3.85-1.64-6.29-1.72l1.21-3.8 3.82.82c.05 1.17 1.01 2.1 2.19 2.1 1.21 0 2.2-1 2.2-2.2S20.8 2.8 19.6 2.8c-.89 0-1.68.53-2.02 1.3l-4.23-.9c-.24-.05-.47.1-.53.34L11.5 7.82c-2.49.07-4.75.72-6.42 1.74-.56-.76-1.46-1.24-2.42-1.24-1.65 0-3 1.35-3 3 0 1.17.68 2.19 1.66 2.67-.06.31-.09.64-.09.97 0 3.67 4.9 6.66 10.85 6.66S23 16.14 23 12.47c0-.33-.03-.66-.09-.97.98-.48 1.66-1.5 1.66-2.67zm-18.25 1c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5zm11.5 5c-1.39 1.39-4.05 1.4-5.5 0-.2-.2-.2-.51 0-.7.2-.2.51-.2.71 0 1.06 1.06 3.02 1.06 4.08 0 .2-.2.51-.2.71 0 .2.2.2.51 0 .7zm-.75-3.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
  </svg>
);

// ── Theme definitions ────────────────────────────────────────
const THEMES = {
  indigo: {
    name: "Indigo Flow",
    accent: "#818cf8",
    glow1: "rgba(99,102,241,0.35)",
    glow2: "rgba(168,85,247,0.25)",
    dot: "#6366f1",
  },
  sunset: {
    name: "Sunset Glow",
    accent: "#f87171",
    glow1: "rgba(244,63,94,0.35)",
    glow2: "rgba(251,146,60,0.25)",
    dot: "#f43f5e",
  },
  emerald: {
    name: "Emerald Dusk",
    accent: "#34d399",
    glow1: "rgba(16,185,129,0.35)",
    glow2: "rgba(20,184,166,0.25)",
    dot: "#10b981",
  },
  cyberpunk: {
    name: "Cyber Nebula",
    accent: "#e879f9",
    glow1: "rgba(217,70,239,0.35)",
    glow2: "rgba(139,92,246,0.25)",
    dot: "#d946ef",
  },
};

type ThemeKey = keyof typeof THEMES;

// ── Canvas card renderer ─────────────────────────────────────
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 2): void {
  const words = text.split(" ");
  let line = "";
  let lines = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      if (lines === maxLines - 1) {
        // Last allowed line — truncate with ellipsis
        while (ctx.measureText(line + "...").width > maxWidth && line.length > 0) {
          line = line.slice(0, -1);
        }
        ctx.fillText(line.trim() + "...", x, y + lines * lineHeight);
        return;
      }
      ctx.fillText(line.trim(), x, y + lines * lineHeight);
      line = words[n] + " ";
      lines++;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, y + lines * lineHeight);
}

function renderCardToCanvas(
  canvas: HTMLCanvasElement,
  title: string,
  snippet: string,
  technologyName: string,
  theme: ThemeKey,
  showSnippet: boolean
): void {
  const W = 1200;
  const H = 628;
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const t = THEMES[theme];

  // ── Background ──────────────────────────────────────────
  ctx.fillStyle = "#030712";
  ctx.fillRect(0, 0, W, H);

  // Radial glow top-left
  const glowTL = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.7);
  glowTL.addColorStop(0, t.glow1);
  glowTL.addColorStop(1, "transparent");
  ctx.fillStyle = glowTL;
  ctx.fillRect(0, 0, W, H);

  // Radial glow bottom-right
  const glowBR = ctx.createRadialGradient(W, H, 0, W, H, W * 0.7);
  glowBR.addColorStop(0, t.glow2);
  glowBR.addColorStop(1, "transparent");
  ctx.fillStyle = glowBR;
  ctx.fillRect(0, 0, W, H);

  // Subtle grid lines
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  const gridSpacing = 60;
  for (let x = 0; x < W; x += gridSpacing) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += gridSpacing) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  const pad = 64;

  // ── Pill: technology name (top right) ───────────────────
  const pillText = technologyName.toUpperCase();
  ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
  const pillW = ctx.measureText(pillText).width + 32;
  const pillH = 34;
  const pillX = W - pad - pillW;
  const pillY = pad - 8;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 17);
  ctx.fillStyle = `${t.accent}18`;
  ctx.fill();
  ctx.strokeStyle = `${t.accent}55`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = t.accent;
  ctx.textAlign = "center";
  ctx.fillText(pillText, pillX + pillW / 2, pillY + 22);

  // ── Logo / brand mark (top left) ────────────────────────
  const logoR = 18;
  const logoX = pad + logoR;
  const logoY = pad + logoR;

  ctx.save();
  const logoGrad = ctx.createLinearGradient(pad, pad, pad + logoR * 2, pad + logoR * 2);
  logoGrad.addColorStop(0, "#6366f1");
  logoGrad.addColorStop(1, "#9333ea");
  ctx.beginPath();
  ctx.roundRect(pad, pad, logoR * 2, logoR * 2, 8);
  ctx.fillStyle = logoGrad;
  ctx.fill();
  ctx.restore();

  // Sparkle star in logo box (simplified)
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("✦", logoX, logoY + 1);

  // Brand name
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
  ctx.fillText("InterviewVault AI", pad + logoR * 2 + 12, pad + logoR + 6);

  // ── Main question title ──────────────────────────────────
  const titleY = H / 2 - (showSnippet ? 60 : 24);
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 48px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  wrapText(ctx, title, pad, titleY, W - pad * 2, 60, 2);

  // ── Snippet text ─────────────────────────────────────────
  if (showSnippet && snippet) {
    const snippetY = titleY + 60 * Math.min(2, Math.ceil(ctx.measureText(title).width / (W - pad * 2))) + 20;
    ctx.fillStyle = "rgba(148,163,184,0.85)";
    ctx.font = "20px system-ui, -apple-system, sans-serif";
    wrapText(ctx, snippet, pad, snippetY + 20, W - pad * 2, 30, 3);
  }

  // ── Horizontal divider line ──────────────────────────────
  const footerY = H - 80;
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, footerY);
  ctx.lineTo(W - pad, footerY);
  ctx.stroke();

  // ── Footer left ──────────────────────────────────────────
  ctx.fillStyle = "rgba(100,116,139,0.9)";
  ctx.font = "17px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Prep smarter. Level up.", pad, footerY + 32);

  // ── Footer right ─────────────────────────────────────────
  ctx.fillStyle = t.accent;
  ctx.font = "bold 17px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("interviewvault.ai", W - pad, footerY + 32);
}

// ── ShareBar ─────────────────────────────────────────────────
interface ShareBarProps {
  questionTitle: string;
  technologyName: string;
  onOpenShareCard: () => void;
  className?: string;
}

export function ShareBar({ questionTitle, technologyName, onOpenShareCard, className }: ShareBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  return (
    <div className={cn("p-6 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden group", className)}>
      <div className="flex items-center gap-4 relative z-10">
        <div className="p-3.5 bg-primary/10 rounded-2xl border border-primary/20 text-primary group-hover:scale-110 transition-transform">
          <Share2 className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-base text-foreground">Share this Resource</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Help other developers level up by sharing this study guide.</p>
        </div>
      </div>
      <div className="flex items-center gap-3 relative z-10 self-end sm:self-center">
        <button
          onClick={handleCopyLink}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-xs font-semibold cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
            copied
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-black/20 border-border hover:bg-muted text-foreground"
          )}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? "Copied!" : "Copy Link"}</span>
        </button>

        <button
          onClick={onOpenShareCard}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-bg text-white hover:opacity-95 text-xs font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Generate Share Card</span>
        </button>
      </div>
      <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-primary/5 blur-xl group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}

// ── ShareModal ───────────────────────────────────────────────
interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: {
    title: string;
    answer?: string | null;
  };
  technologyName: string;
}

export function ShareModal({ isOpen, onClose, question, technologyName }: ShareModalProps) {
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>("indigo");
  const [showSnippet, setShowSnippet] = useState(true);
  const [copiedCard, setCopiedCard] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const cleanText = (raw: string) =>
    raw
      .replace(/<[^>]*>/g, "")
      .replace(/#+\s*/g, "")
      .replace(/\*{1,2}/g, "")
      .replace(/`+/g, "")
      .replace(/>\s*/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const snippet = cleanText(question.answer || "");

  // Render card to hidden canvas and return data URL
  const generateCardDataUrl = useCallback((): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    renderCardToCanvas(canvas, question.title, snippet, technologyName, selectedTheme, showSnippet);
    return canvas.toDataURL("image/png");
  }, [question.title, snippet, technologyName, selectedTheme, showSnippet]);

  const handleDownload = async () => {
    setIsGenerating(true);
    const toastId = toast.loading("Generating share card...");
    try {
      await new Promise((r) => setTimeout(r, 30));
      const dataUrl = generateCardDataUrl();
      if (!dataUrl) throw new Error("Canvas not ready");
      const link = document.createElement("a");
      link.download = `${question.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-share-card.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Share card downloaded!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate card.", { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCard = async () => {
    setIsGenerating(true);
    const toastId = toast.loading("Copying image to clipboard...");
    try {
      await new Promise((r) => setTimeout(r, 30));
      const dataUrl = generateCardDataUrl();
      if (!dataUrl) throw new Error("Canvas not ready");

      const blob = await (await fetch(dataUrl)).blob();
      if (typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopiedCard(true);
        toast.success("Card image copied! Paste on Twitter, LinkedIn, etc.", { id: toastId });
        setTimeout(() => setCopiedCard(false), 2500);
      } else {
        throw new Error("ClipboardItem API not available");
      }
    } catch {
      toast.error("Clipboard not supported — please use 'Download PNG Card' instead.", { id: toastId, duration: 6000 });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSocialIntent = (platform: "twitter" | "linkedin" | "reddit") => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const text = `Check out this interview question: "${question.title}" on InterviewVault AI! 🚀`;
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      reddit: `https://reddit.com/submit?title=${encodeURIComponent(`Interview: ${question.title}`)}&url=${encodeURIComponent(url)}`,
    };
    window.open(urls[platform], "_blank", "noopener,noreferrer");
  };

  const activeTheme = THEMES[selectedTheme];

  return (
    <>
      {/* Hidden canvas — used only for rendering, never visible */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="w-full max-w-xl rounded-2xl bg-card border border-border p-6 shadow-2xl relative z-10 flex flex-col gap-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <h3 className="font-bold text-base flex items-center gap-2 text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Customize Share Card
                </h3>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Live Preview — mirrors exactly what gets drawn on the canvas */}
              <div
                className="w-full rounded-xl border border-border/50 overflow-hidden relative select-none"
                style={{ aspectRatio: "1200/628", background: "#030712" }}
              >
                {/* Glow layers */}
                <div
                  className="absolute inset-0 pointer-events-none transition-all duration-500"
                  style={{
                    background: `radial-gradient(ellipse at 0% 0%, ${activeTheme.glow1} 0%, transparent 60%), radial-gradient(ellipse at 100% 100%, ${activeTheme.glow2} 0%, transparent 60%)`,
                  }}
                />
                {/* Grid */}
                <svg className="absolute inset-0 w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>

                <div className="relative z-10 flex flex-col justify-between h-full p-5 sm:p-7">
                  {/* Top row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow">
                        <Sparkles className="h-3 w-3 text-white" />
                      </div>
                      <span className="font-extrabold text-[10px] tracking-widest uppercase text-white/80">
                        InterviewVault AI
                      </span>
                    </div>
                    <span
                      className="text-[9px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full border transition-all duration-500"
                      style={{ borderColor: `${activeTheme.accent}50`, color: activeTheme.accent, background: `${activeTheme.accent}12` }}
                    >
                      {technologyName}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="flex-1 flex flex-col justify-center py-2">
                    <h4 className="font-black text-white leading-tight text-sm sm:text-base line-clamp-2">
                      {question.title}
                    </h4>
                    {showSnippet && snippet && (
                      <p className="text-[10px] sm:text-[11px] text-slate-400 mt-2 leading-relaxed line-clamp-2">
                        {snippet}
                      </p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-2">
                    <span className="text-[9px] text-slate-500 font-semibold">Prep smarter. Level up.</span>
                    <span className="text-[9px] font-extrabold tracking-wider" style={{ color: activeTheme.accent }}>
                      interviewvault.ai
                    </span>
                  </div>
                </div>
              </div>

              {/* Customization controls */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border border-border/40 text-xs">
                <div className="flex flex-col gap-2">
                  <span className="font-bold text-muted-foreground flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> Background Theme
                  </span>
                  <div className="flex gap-2.5 mt-1">
                    {(Object.keys(THEMES) as ThemeKey[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => setSelectedTheme(key)}
                        title={THEMES[key].name}
                        className={cn(
                          "w-6 h-6 rounded-full border cursor-pointer hover:scale-110 active:scale-95 transition-all",
                          selectedTheme === key ? "border-white ring-2 ring-white/25" : "border-transparent"
                        )}
                        style={{
                          background: `linear-gradient(135deg, ${THEMES[key].glow1.replace("0.35", "1")}, ${THEMES[key].glow2.replace("0.25", "1")})`,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2 border-l border-border/40 pl-4">
                  <span className="font-bold text-muted-foreground flex items-center gap-1.5">
                    <AlignLeft className="h-3.5 w-3.5" /> Content Settings
                  </span>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer font-semibold text-foreground select-none">
                    <input
                      type="checkbox"
                      checked={showSnippet}
                      onChange={(e) => setShowSnippet(e.target.checked)}
                      className="accent-primary h-3.5 w-3.5 cursor-pointer"
                    />
                    <span>Show Answer Snippet</span>
                  </label>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleCopyCard}
                  disabled={isGenerating}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg disabled:opacity-60",
                    copiedCard
                      ? "bg-emerald-600 text-white"
                      : "gradient-bg text-white shadow-primary/20 hover:opacity-95"
                  )}
                >
                  {copiedCard ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedCard ? "Image Copied!" : "Copy Card Image"}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={isGenerating}
                  className="flex-1 flex items-center justify-center gap-2 bg-muted border border-border hover:bg-muted/80 text-foreground px-5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  Download PNG Card
                </button>
              </div>

              {/* Direct platform links */}
              <div className="flex items-center justify-between border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
                <span>Or share page link directly:</span>
                <div className="flex gap-4">
                  {(["twitter", "linkedin", "reddit"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => handleSocialIntent(p)}
                      className="hover:text-foreground cursor-pointer flex items-center gap-1 font-semibold capitalize transition-colors"
                    >
                      {p === "twitter" && <TwitterIcon className="h-3 w-3" />}
                      {p === "linkedin" && <LinkedinIcon className="h-3 w-3" />}
                      {p === "reddit" && <RedditIcon className="h-3 w-3" />}
                      {p === "twitter" ? "X / Twitter" : p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
