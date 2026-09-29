import Link from 'next/link'

import { Container } from '@/components/ui/Container'
import { footerLinks } from '@/data/navigation'
import { GITHUB_URL, SITE_NAME } from '@/lib/constants'

export function Footer() {
  return (
    <footer className="bg-stone-900 border-t border-gold-500/20">
      <Container>
        <div className="py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-adventure text-2xl text-gold-500 mb-3">{SITE_NAME}</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              An open-source RuneScape Classic private server. Play in your browser, climb the
              hiscores, and relive 2003 with a community worth joining.
            </p>
          </div>

          <div>
            <h4 className="font-adventure text-lg text-gold-400 uppercase mb-3">Quick Links</h4>
            <ul className="space-y-2">
              {footerLinks.map((link) => {
                const isInternal = link.href.startsWith('/')
                return (
                  <li key={link.label}>
                    {isInternal ? (
                      <Link
                        href={link.href}
                        className="text-sm text-text-secondary hover:text-gold-400 transition-colors"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-text-secondary hover:text-gold-400 transition-colors"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>

          <div>
            <h4 className="font-adventure text-lg text-gold-400 uppercase mb-3">About</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>Built on the open-source 2003Scape stack.</li>
              <li>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gold-400 transition-colors"
                >
                  Source on GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-stone-800 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} {SITE_NAME}. RuneScape is a trademark of Jagex Ltd.
            This project is not affiliated with Jagex.
          </p>
        </div>
      </Container>
    </footer>
  )
}
