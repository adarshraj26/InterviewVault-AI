import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { Logo } from "@/components/shared/logo";

export function Footer() {
  return (
    <footer className="w-full bg-[#0a0a0b] text-white pt-16 pb-8 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Top Section: Newsletter */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-16 border-b border-white/10">
          <div className="max-w-md">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-2">
              Master Your Next Interview
            </h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Join our community receiving daily AI-curated engineering challenges, architecture breakdowns, and expert interview tips directly in their inbox.
            </p>
          </div>
          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-white/40" />
              </div>
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <button className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-black font-semibold text-sm rounded-xl hover:bg-white/90 transition-colors shadow-sm whitespace-nowrap">
              Subscribe <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Middle Section: Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 py-16 border-b border-white/10">
          {/* Brand Col */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Logo size="md" />
            <p className="text-sm text-white/60 leading-relaxed max-w-sm">
              The ultimate AI-powered technical interview preparation platform. Practice with lifelike mock interviews, receive instant feedback, and master the most difficult engineering concepts.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>

          {/* Links Col 1 */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-2">Topics</h4>
            <Link href="/technologies/react" className="text-sm text-white/60 hover:text-white transition-colors">React</Link>
            <Link href="/technologies/javascript" className="text-sm text-white/60 hover:text-white transition-colors">JavaScript</Link>
            <Link href="/technologies/node" className="text-sm text-white/60 hover:text-white transition-colors">Node.js</Link>
            <Link href="/technologies/databases" className="text-sm text-white/60 hover:text-white transition-colors">Databases</Link>
            <Link href="/technologies/system-design" className="text-sm text-white/60 hover:text-white transition-colors">System Design</Link>
          </div>

          {/* Links Col 2 */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-2">Features</h4>
            <Link href="/dashboard" className="text-sm text-white/60 hover:text-white transition-colors">AI Mock Interviews</Link>
            <Link href="/dashboard" className="text-sm text-white/60 hover:text-white transition-colors">Performance Analytics</Link>
            <Link href="/#features" className="text-sm text-white/60 hover:text-white transition-colors flex items-center gap-1.5 mt-2">
              View All Features <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Links Col 3 */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-2">Useful Info</h4>
            <Link href="/about" className="text-sm text-white/60 hover:text-white transition-colors">About Us</Link>
            <Link href="/dashboard" className="text-sm text-white/60 hover:text-white transition-colors">Dashboard</Link>
            <Link href="/contact" className="text-sm text-white/60 hover:text-white transition-colors">Contact</Link>
            <Link href="/privacy" className="text-sm text-white/60 hover:text-white transition-colors">Privacy Policy</Link>
          </div>
        </div>

        {/* Bottom Section: Copyright & Status */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span>© {new Date().getFullYear()} InterviewVault AI. All rights reserved.</span>
            <span className="hidden sm:inline">|</span>
            <span className="hidden sm:inline">Made with precision</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/60 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
