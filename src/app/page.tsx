"use client";

import Link from "next/link";
import Image from "next/image";
import { WalletButton } from "@/components/wallet/WalletButton";
import { Lock, Download, Settings, AtSign, Send, Share2 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
      {/* Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute -top-20 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] opacity-50"></div>
        <div className="absolute -bottom-20 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] opacity-50"></div>
      </div>

      <div className="layout-container flex h-full grow flex-col relative z-10">
        <div className="px-4 sm:px-8 md:px-20 lg:px-40 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-[960px] flex-1">

            {/* TopNavBar */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-white/10 px-6 sm:px-10 py-3 backdrop-blur-sm bg-[#030305]/50 rounded-xl mt-4">
              <div className="flex items-center gap-4 text-white">
                <div className="size-8 relative rounded-full overflow-hidden border border-white/10">
                  <Image
                    src="/lilgarg-logo.jpeg"
                    alt="LilGarg Logo"
                    fill
                    className="object-cover"
                  />
                </div>
                <h2 className="text-white text-lg font-bold leading-tight tracking-tight">Lilgargs Vesting</h2>
              </div>
              <div className="flex items-center">
                <WalletButton />
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow">

              {/* HeroSection */}
              <div className="relative overflow-hidden py-12 md:py-20">
                <div className="relative z-10 p-4">
                  <div className="flex flex-col gap-6 items-center justify-center text-center">
                    <div className="flex flex-col gap-4 max-w-3xl">
                      <h1 className="text-white text-5xl md:text-7xl font-black leading-tight tracking-tight drop-shadow-lg">
                        Streamlined <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Token Vesting</span>
                      </h1>
                      <h2 className="text-slate-400 text-lg md:text-xl font-medium leading-relaxed max-w-2xl mx-auto">
                        The Lilgargs protocol for token streaming provides a seamless and secure infrastructure for managing and claiming vested tokens over time.
                      </h2>
                    </div>

                    <div className="flex flex-wrap gap-4 justify-center mt-8">
                      <Link href="/claim">
                        <button className="flex min-w-[140px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-blue-600 hover:bg-blue-500 text-white text-base font-bold transition-all hover:scale-105 shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                          <span className="truncate">Claim Tokens</span>
                        </button>
                      </Link>
                      <Link href="/admin">
                        <button className="flex min-w-[140px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-[#1a1a2e] hover:bg-[#232342] border border-white/10 text-white text-base font-bold transition-all hover:scale-105">
                          <span className="truncate">Admin System</span>
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* FeatureSection */}
              <div className="flex flex-col gap-10 px-4 py-10">
                <div className="flex flex-col gap-4 text-center items-center">
                  <h1 className="text-white text-3xl md:text-4xl font-bold leading-tight max-w-[720px]">
                    Why Choose Lilgargs Vesting?
                  </h1>
                  <p className="text-slate-400 text-base font-normal leading-normal max-w-[720px]">
                    Our platform offers unparalleled security, flexibility, and ease of use for both token holders and administrators.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Feature 1 */}
                  <div className="flex flex-col gap-4 rounded-xl border border-white/5 bg-[#0a0a0f]/80 p-6 hover:border-blue-500/30 transition-colors duration-300 backdrop-blur-md">
                    <div className="text-blue-400 p-3 bg-blue-500/10 rounded-lg w-fit">
                      <Lock className="w-8 h-8" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <h2 className="text-white text-lg font-bold leading-tight">Secure Streaming</h2>
                      <p className="text-slate-400 text-sm leading-relaxed">Tokens are streamed securely on-chain, ensuring trust and transparency.</p>
                    </div>
                  </div>

                  {/* Feature 2 */}
                  <div className="flex flex-col gap-4 rounded-xl border border-white/5 bg-[#0a0a0f]/80 p-6 hover:border-purple-500/30 transition-colors duration-300 backdrop-blur-md">
                    <div className="text-purple-400 p-3 bg-purple-500/10 rounded-lg w-fit">
                      <Download className="w-8 h-8" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <h2 className="text-white text-lg font-bold leading-tight">Real-Time Claims</h2>
                      <p className="text-slate-400 text-sm leading-relaxed">Claim your vested tokens at any moment with a simple, intuitive interface.</p>
                    </div>
                  </div>

                  {/* Feature 3 */}
                  <div className="flex flex-col gap-4 rounded-xl border border-white/5 bg-[#0a0a0f]/80 p-6 hover:border-cyan-500/30 transition-colors duration-300 backdrop-blur-md">
                    <div className="text-cyan-400 p-3 bg-cyan-500/10 rounded-lg w-fit">
                      <Settings className="w-8 h-8" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <h2 className="text-white text-lg font-bold leading-tight">Admin Control</h2>
                      <p className="text-slate-400 text-sm leading-relaxed">Easily manage vesting schedules and permissions through our powerful admin system.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTASection */}
              <div className="py-20">
                <div className="flex flex-col items-center justify-center gap-8 px-4 text-center rounded-2xl bg-gradient-to-b from-blue-900/10 to-transparent border border-white/5 p-10">
                  <div className="flex flex-col gap-4 items-center">
                    <h1 className="text-white text-3xl md:text-4xl font-bold leading-tight max-w-[720px]">
                      Ready to get started?
                    </h1>
                    <p className="text-slate-400 text-base max-w-[600px]">
                      Connect your wallet to claim your tokens or access the admin dashboard.
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <WalletButton />
                  </div>
                </div>
              </div>

            </main>

            {/* Footer */}
            <footer className="flex flex-col gap-6 px-5 py-10 text-center border-t border-white/5 mt-10">
              <div className="flex flex-wrap items-center justify-center gap-8">
                <a className="text-slate-500 hover:text-white transition-colors text-sm font-medium" href="#">Documentation</a>
                <a className="text-slate-500 hover:text-white transition-colors text-sm font-medium" href="#">Terms of Service</a>
                <a className="text-slate-500 hover:text-white transition-colors text-sm font-medium" href="#">Privacy Policy</a>
              </div>
              <div className="flex flex-wrap justify-center gap-6">
                <a href="#" className="text-slate-600 hover:text-blue-400 transition-colors">
                  <AtSign className="w-5 h-5" />
                </a>
                <a href="#" className="text-slate-600 hover:text-purple-400 transition-colors">
                  <Send className="w-5 h-5" />
                </a>
                <a href="#" className="text-slate-600 hover:text-cyan-400 transition-colors">
                  <Share2 className="w-5 h-5" />
                </a>
              </div>
              <p className="text-slate-600 text-sm">© {new Date().getFullYear()} Lilgargs Vesting. All rights reserved.</p>
            </footer>

          </div>
        </div>
      </div>
    </div>
  );
}
