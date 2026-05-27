import Link from "next/link"
import { ArrowRight } from "lucide-react"

interface NewsCardProps {
  date: string
  title: string
  source: string
  href: string
  featured?: boolean
}

export function NewsCard({ date, title, source, href, featured = false }: NewsCardProps) {
  return (
    <Link href={href} className="group block">
      <article className={`border-t border-border py-6 ${featured ? 'lg:py-8' : ''}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <time className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              {date}
            </time>
            <h3 className={`mt-2 font-semibold text-foreground group-hover:text-primary transition-colors leading-snug ${featured ? 'text-xl lg:text-2xl' : 'text-lg'}`} style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
              {title}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground tracking-wide uppercase">
              {source}
            </p>
          </div>
          <div className="flex-shrink-0 mt-6">
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </article>
    </Link>
  )
}
