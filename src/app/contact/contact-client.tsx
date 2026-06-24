"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  MessageSquare,
  MapPin,
  Send,
  Sparkles,
  CheckCircle2,
  Cpu,
  Zap,
  Globe
} from "lucide-react";
import Link from "next/link";
import { Logo, ThemeToggle, Footer } from "@/components/shared";

// ── Animation Variants ─────────────────────────────────────
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function ContactClient() {
  const [formState, setFormState] = useState<"idle" | "submitting" | "success">("idle");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormState("submitting");
    // Simulate network request
    setTimeout(() => {
      setFormState("success");
      // Reset after a while
      setTimeout(() => setFormState("idle"), 5000);
    }, 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-white selection:bg-primary/30 relative overflow-hidden">
      {/* ── Dynamic Futuristic Background ─────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Hex Grid pattern */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20 [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />

        {/* Glowing Orbs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] mix-blend-screen"
        />
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[150px] mix-blend-screen"
        />
      </div>

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-black/40 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm font-medium text-white/60 hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/about" className="text-sm font-medium text-white/60 hover:text-white transition-colors">
              About
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────── */}
      <main className="flex-grow relative z-10 py-20 px-4 md:px-6 flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="max-w-6xl w-full mx-auto">

          {/* Header Title */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-6">
              <Cpu className="w-4 h-4 animate-pulse" /> Establish Connection
            </motion.div>
            <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
              Let's build the <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-primary animate-gradient-x">
                future together.
              </span>
            </motion.h1>
            <motion.p variants={fadeInUp} className="text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
              Have a question about our AI mock interviews, enterprise scaling, or just want to chat about system design? Initialize a handshake below.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

            {/* ── Contact Form (Glassmorphism) ── */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="lg:col-span-7 relative group"
            >
              {/* Animated Glow Border */}
              <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-b from-white/20 to-white/5 opacity-50 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />

              <div className="relative bg-[#0a0a0c]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl">
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name Input */}
                    <div className="flex flex-col gap-2">
                      <label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-white/50 pl-1">
                        Developer ID
                      </label>
                      <input
                        type="text"
                        id="name"
                        required
                        placeholder="e.g. Linus Torvalds"
                        className="bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all font-mono text-sm"
                      />
                    </div>
                    {/* Email Input */}
                    <div className="flex flex-col gap-2">
                      <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-white/50 pl-1">
                        Return Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        required
                        placeholder="hello@example.com"
                        className="bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all font-mono text-sm"
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="subject" className="text-xs font-bold uppercase tracking-wider text-white/50 pl-1">
                      Transmission Protocol
                    </label>
                    <select
                      id="subject"
                      className="bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all appearance-none font-mono text-sm"
                    >
                      <option value="general">General Query</option>
                      <option value="support">Technical Support</option>
                      <option value="enterprise">Enterprise Licensing</option>
                      <option value="feedback">Feature Request</option>
                    </select>
                  </div>

                  {/* Message Input */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="message" className="text-xs font-bold uppercase tracking-wider text-white/50 pl-1">
                      Payload
                    </label>
                    <textarea
                      id="message"
                      required
                      rows={5}
                      placeholder="Compile your thoughts here..."
                      className="bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all font-mono text-sm resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={formState !== "idle"}
                    className="relative mt-2 w-full group overflow-hidden rounded-xl bg-white text-black font-bold py-4 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-80 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-blue-500/20 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative flex items-center justify-center gap-2">
                      <AnimatePresence mode="wait">
                        {formState === "idle" && (
                          <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2">
                            Initialize Transfer <Send className="w-4 h-4 ml-1 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                          </motion.div>
                        )}
                        {formState === "submitting" && (
                          <motion.div key="submitting" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2 text-primary">
                            <Zap className="w-4 h-4 animate-bounce" /> Transmitting Packets...
                          </motion.div>
                        )}
                        {formState === "success" && (
                          <motion.div key="success" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2 text-emerald-600">
                            <CheckCircle2 className="w-5 h-5" /> Transmission Successful
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </button>
                </form>
              </div>
            </motion.div>

            {/* ── Contact Info Bento Cards ── */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4"
            >
              {/* Email Card */}
              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl hover:border-primary/30 transition-colors group">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Direct Channel</h3>
                <p className="text-sm text-white/50 mb-4">For press, partnerships, and direct support inquiries.</p>
                <a href="mailto:hello@interviewvault.ai" className="text-sm font-mono text-primary hover:underline underline-offset-4">
                  hello@interviewvault.ai
                </a>
              </div>

              {/* Discord Card */}
              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl hover:border-blue-500/30 transition-colors group">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all">
                  <MessageSquare className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Community Node</h3>
                <p className="text-sm text-white/50 mb-4">Join 5,000+ engineers discussing system design and career prep.</p>
                <a href="#" className="text-sm font-mono text-blue-400 hover:underline underline-offset-4">
                  Join Discord Server →
                </a>
              </div>

              {/* Location Card */}
              <div className="sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl relative overflow-hidden group">
                <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all duration-700">
                  <Globe className="w-48 h-48 -mr-10 -mb-10" />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
                    <MapPin className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Headquarters</h3>
                  <p className="text-sm text-white/50 mb-1 font-mono">127.0.0.1 (Localhost)</p>
                  <p className="text-sm text-white/50 font-mono">Powered by Wi-Fi & Coffee</p>
                </div>
              </div>

            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
