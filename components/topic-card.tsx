import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface TopicCardProps {
  icon: LucideIcon
  title: string
  description: string
  href: string
}

export function TopicCard({ icon: Icon, title, description, href }: TopicCardProps) {
  return (
    <Link href={href} className="group block">
      <article className="p-6 bg-card border border-border rounded-lg hover:border-primary/30 hover:shadow-sm transition-all h-full">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {description}
        </p>
        <div className="flex items-center gap-2 text-primary text-sm font-medium">
          <span>Explore</span>
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </article>
    </Link>
  )
}
