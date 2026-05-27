import Link from "next/link"

const footerLinks = {
  "Government": [
    { label: "Governor", href: "#" },
    { label: "Legislature", href: "#" },
    { label: "Courts", href: "#" },
    { label: "State Agencies", href: "#" },
  ],
  "Resources": [
    { label: "Press Releases", href: "#" },
    { label: "Media Contact", href: "#" },
    { label: "Public Records", href: "#" },
    { label: "Data Portal", href: "#" },
  ],
  "Connect": [
    { label: "Contact Us", href: "#" },
    { label: "Newsletter", href: "#" },
    { label: "Accessibility", href: "#" },
    { label: "Privacy Policy", href: "#" },
  ],
}

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                <span className="text-foreground font-bold text-lg" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>CA</span>
              </div>
              <div>
                <p className="text-lg font-semibold leading-tight" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>CA Gov News</p>
                <p className="text-xs text-background/60">State of California</p>
              </div>
            </div>
            <p className="text-sm text-background/70 leading-relaxed">
              Official news and announcements from the State of California government.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-semibold text-sm uppercase tracking-wider mb-4">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-background/70 hover:text-background transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-background/10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-background/60">
              &copy; {new Date().getFullYear()} State of California. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="#" className="text-sm text-background/60 hover:text-background transition-colors">
                Terms
              </Link>
              <Link href="#" className="text-sm text-background/60 hover:text-background transition-colors">
                Privacy
              </Link>
              <Link href="#" className="text-sm text-background/60 hover:text-background transition-colors">
                Accessibility
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
