import Link from 'next/link'

import { SiteLogo } from '@/components/ui/SiteLogo'
import { footerColumns } from '@/data/navigation'
import { DISCORD_URL, GITHUB_URL, SITE_NAME } from '@/lib/constants'

const hasDiscord = DISCORD_URL.length > 0

const iconButton =
  'w-8 h-8 rounded-sm bg-[#1c160f] border border-[#332616] hover:border-[#f2ca50]/50 flex items-center justify-center text-[#d0c5af] hover:text-[#f2ca50] hover:-translate-y-0.5 transition-all duration-200'

const linkClass =
  'inline-block text-[#d0c5af] hover:text-[#f2ca50] hover:translate-x-1 transition-all'

export function Footer() {
  return (
    <footer className="w-full bg-[#0d0a07] border-t border-[#261e14] py-16 text-[#d0c5af]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#241c13]">
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="group inline-flex items-center gap-3">
              <SiteLogo
                variant="nav"
                className="h-9 w-[86px] transition-transform duration-300 group-hover:scale-105"
              />
              <span className="font-adventure text-lg font-bold uppercase tracking-wider text-[#f2ca50] transition-colors group-hover:text-[#ffe088]">
                {SITE_NAME}
              </span>
            </Link>
            <p className="max-w-md text-sm font-light leading-relaxed text-[#d0c5af]/80">
              A non-commercial archival and preservation project dedicated to maintaining the
              gameplay, combat balance, and social world of early 2000s browser MMORPGs.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={iconButton}
                aria-label="GitHub"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.17c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"
                  />
                </svg>
              </a>
              {hasDiscord && (
                <a
                  href={DISCORD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={iconButton}
                  aria-label="Discord"
                >
                  <svg 
                    className="w-[18px] h-[18px]" 
                    fill="currentColor" 
                    viewBox="0 0 24 24" 
                    aria-hidden="true"
                  >
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.298 12.298 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z"/>
                  </svg>
                </a>
              )}
            </div>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title}>
              <h4 className="mb-4 font-adventure text-xs font-semibold uppercase tracking-wider text-[#ece1d6]">
                {column.title}
              </h4>
              <ul className="space-y-2 font-adventure text-sm">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('/') ? (
                      <Link href={link.href} className={linkClass}>
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={linkClass}
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#d0c5af]/60 text-center md:text-left">
          <p className="max-w-2xl">
            RuneScape and RuneScape Classic are registered trademarks of Jagex Limited.{' '}
            {SITE_NAME} is an independent preservation initiative and is not endorsed by,
            sponsored by, or affiliated with Jagex Ltd.
          </p>
          <span className="font-adventure text-[11px] whitespace-nowrap">
            &copy; {new Date().getFullYear()} {SITE_NAME} Team
          </span>
        </div>
      </div>
    </footer>
  )
}
