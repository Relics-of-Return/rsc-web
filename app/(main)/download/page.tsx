import Link from 'next/link'
import {
  Download,
  Monitor,
  Terminal,
  Laptop,
  FolderArchive,
  Play,
  FileCode,
  ExternalLink,
  HelpCircle,
  Shield
} from 'lucide-react'

import { GITHUB_URL } from '@/lib/constants'
import { landingFontVariables } from '@/lib/fonts'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Download — Relics of Return',
  description:
    'Download the official desktop client for Relics of Return. Available for Windows, macOS, and Linux, with cross-platform launcher options.',
}

const DOWNLOAD_LINKS = [
  {
    id: 'windows',
    title: 'Windows Client',
    os: 'Windows 10 / 11 (64-bit)',
    filename: 'RelicsOfReturn-Setup-2.4.1.exe',
    size: '48.2 MB',
    format: 'Installer (.exe)',
    recommended: true,
    released: true,
    icon: Monitor,
    badge: 'Recommended',
    badgeStyle: 'border-amber-500/40 bg-amber-500/15 text-[#f2ca50]',
    downloadUrl: '#download-win',
    secondaryUrl: '#win-portable',
    secondaryLabel: 'Portable .zip version',
  },
  {
    id: 'macos',
    title: 'macOS Client',
    os: 'macOS 11+ (Apple Silicon & Intel)',
    filename: 'RelicsOfReturn-2.4.1.dmg',
    size: '52.6 MB',
    format: 'Disk Image (.dmg)',
    recommended: false,
    released: false,
    icon: Laptop,
    badge: 'Universal',
    badgeStyle: 'border-sky-400/40 bg-sky-500/15 text-sky-300',
    downloadUrl: '#',
    secondaryUrl: '#',
    secondaryLabel: 'Standalone App Bundle',
  },
  {
    id: 'linux',
    title: 'Linux Client',
    os: 'Ubuntu, Fedora, Arch & General Linux',
    filename: 'RelicsOfReturn-2.4.1.AppImage',
    size: '46.8 MB',
    format: 'AppImage / Tarball',
    recommended: false,
    released: false,
    icon: Terminal,
    badge: 'Cross-Platform',
    badgeStyle: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300',
    downloadUrl: '#',
    secondaryUrl: '#',
    secondaryLabel: '.tar.gz package',
  },
  {
    id: 'java-jar',
    title: 'Universal JAR',
    os: 'Any OS with Java 17+ installed',
    filename: 'RelicsOfReturn-Launcher.jar',
    size: '18.4 MB',
    format: 'Executable Java Archive',
    recommended: false,
    released: false,
    icon: FileCode,
    badge: 'Lightweight',
    badgeStyle: 'border-[#3c3021] bg-[#201a14] text-[#d0c5af]',
    downloadUrl: '#',
    secondaryUrl: GITHUB_URL,
    secondaryLabel: 'Source Code (GitHub)',
  },
]

export default function DownloadSection() {
  return (
    <div className={cn(landingFontVariables, 'bg-[#17130d] font-sans-body text-[#ece1d6] min-h-screen py-16 lg:py-20 flex items-center justify-center')}>
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="font-adventure text-2xl sm:text-3xl font-bold text-[#f5ebd9] uppercase tracking-wide mb-3">
            Select Your Operating System
          </h1>
          <p className="text-sm text-[#d0c5af] leading-relaxed">
            Bundled packages include custom Java runtime binaries for effortless one-click setups.
          </p>
        </div>

        {/* 4-Card OS Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {DOWNLOAD_LINKS.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.id}
                className={cn(
                  'relative flex flex-col justify-between overflow-hidden rounded-sm bg-[#1b150e] p-6 shadow-xl transition-all duration-300',
                  item.recommended
                    ? 'border-2 border-[#d4af37] shadow-[0_0_25px_rgba(212,175,55,0.25)]'
                    : 'border border-[#3d3121]',
                  !item.released && 'select-none'
                )}
              >
                {/* Diagonal Top-Right "SOON" Ribbon */}
                {!item.released && (
                  <div className="absolute top-3 -right-8 z-20 w-32 rotate-45 border-y border-[#f2ca50]/40 bg-[#16110a]/95 py-0.5 text-center font-adventure text-[10px] font-bold uppercase tracking-widest text-[#f2ca50] shadow-lg backdrop-blur-sm pointer-events-none">
                    SOON
                  </div>
                )}

                {/* Top-Right Badge: BEST CHOICE */}
                {item.recommended && item.released && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-[#d4af37] to-[#a88219] text-[#3c2f00] px-3 py-0.5 text-[10px] font-bold font-adventure tracking-wider uppercase rounded-bl-sm shadow-md">
                    BEST CHOICE
                  </div>
                )}

                {/* Card Content Container */}
                <div className={cn('flex flex-col justify-between h-full transition-all', !item.released && 'filter blur-[2.5px] opacity-35')}>
                  <div>
                    {/* Icon & Badge Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="border border-[#3c3021] bg-[#241c13] text-[#f2ca50] w-12 h-12 flex items-center justify-center rounded-sm shadow-inner">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className={cn('text-[10px] uppercase font-adventure px-2 py-0.5 rounded-sm tracking-wider border', item.badgeStyle)}>
                        {item.badge}
                      </span>
                    </div>

                    {/* Title & OS Subtitle */}
                    <h3 className="font-adventure text-xl font-bold text-[#f5ebd9] mb-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-[#a69986] mb-5">{item.os}</p>

                    {/* Details Box */}
                    <div className="border border-[#2a2015] bg-[#120e0a] p-3 text-xs font-mono text-[#d0c5af] space-y-2 rounded-sm mb-6">
                      <div className="flex items-center justify-between">
                        <span className="text-[#8e8270]">Format:</span>
                        <span className="font-semibold text-[#f5ebd9]">{item.format}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-[#221910] pt-1.5">
                        <span className="text-[#8e8270]">File Size:</span>
                        <span className="text-[#f2ca50]">{item.size}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                    {item.released ? (
                      <a
                        href={item.downloadUrl}
                        className="fx-shimmer flex w-full items-center justify-center gap-2 rounded-sm px-4 py-2.5 font-adventure text-sm font-bold uppercase tracking-wide border border-[#f2ca50]/50 bg-gradient-to-b from-[#f2ca50] via-[#d4af37] to-[#b38e22] text-[#241a00] shadow-[0_0_18px_rgba(242,202,80,0.35)] hover:from-[#ffe088] hover:to-[#c49a20] hover:shadow-[0_0_28px_rgba(242,202,80,0.6)] transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4 shrink-0" />
                        <span>Download</span>
                      </a>
                    ) : (
                      <button
                        disabled
                        className="flex w-full items-center justify-center gap-2 rounded-sm px-4 py-2.5 font-adventure text-sm font-bold uppercase tracking-wide border border-[#4a3c28] bg-gradient-to-b from-[#2e2417] to-[#1c150c] text-[#f5ebd9] cursor-not-allowed"
                      >
                        <Download className="w-4 h-4 shrink-0" />
                        <span>Download</span>
                      </button>
                    )}

                    <div className="flex items-center justify-center">
                      {item.released ? (
                        <a
                          href={item.secondaryUrl}
                          className="flex items-center gap-1.5 text-[11px] font-adventure text-[#a69986] hover:text-[#f2ca50] transition-colors"
                        >
                          <FolderArchive className="w-3.5 h-3.5" />
                          <span>{item.secondaryLabel}</span>
                        </a>
                      ) : (
                        <span className="text-[11px] font-adventure text-[#8e8270]">
                          {item.secondaryLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Browser Play Banner */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 rounded-sm border border-[#3c3021] bg-gradient-to-r from-[#1c160f] via-[#241c13] to-[#1c160f] p-6 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-sm border border-[#d4af37]/40 bg-[#120e0a] text-[#f2ca50] flex items-center justify-center shrink-0 shadow-inner">
              <Play className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h4 className="font-adventure text-lg font-bold text-[#f5ebd9] mb-0.5">
                Don't want to install anything?
              </h4>
              <p className="text-xs text-[#d0c5af]">
                Launch Relics of Return right in your WebGL browser client. No plugins or Java setup needed.
              </p>
            </div>
          </div>
          <Link
            href="/play"
            className="shrink-0 rounded-sm border border-[#f2ca50]/40 bg-[#2d2316] px-6 py-2.5 font-adventure text-xs font-bold uppercase tracking-wider text-[#f2ca50] hover:bg-[#3d301f] hover:text-[#ffe088] transition-colors flex items-center gap-2 shadow-md"
          >
            <span>Play Web Client Now</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Installation & Troubleshooting FAQ */}
        <div className="mt-16 max-w-3xl mx-auto">
          <div className="mb-6 text-center">
            <h2 className="font-adventure text-2xl font-bold text-[#ece1d6]">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-[#2d2417] bg-[#1a140d] p-5 rounded-sm shadow-md flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[#f2ca50] font-adventure text-base font-bold">
                <HelpCircle className="w-5 h-5 text-[#f2ca50]" />
                <h4>Do I need to install Java?</h4>
              </div>
              <p className="text-xs text-[#d0c5af] leading-relaxed">
                No extra installation needed. The Windows package is self-contained with custom Java runtime binaries bundled to launch instantly.
              </p>
            </div>

            <div className="border border-[#2d2417] bg-[#1a140d] p-5 rounded-sm shadow-md flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[#f2ca50] font-adventure text-base font-bold">
                <Shield className="w-5 h-5 text-[#f2ca50]" />
                <h4>Windows SmartScreen notice?</h4>
              </div>
              <p className="text-xs text-[#d0c5af] leading-relaxed">
                As an open-source community preservation project without a paid corporate certificate, simply click <strong className="text-[#ece1d6]">More info</strong> then <strong className="text-[#f2ca50]">Run anyway</strong>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}