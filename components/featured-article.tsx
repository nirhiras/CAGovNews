import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface FeaturedArticleProps {
  category: string
  date: string
  title: string
  excerpt: string
  href: string
  imageUrl?: string
}

export function FeaturedArticle({ category, date, title, excerpt, href }: FeaturedArticleProps) {
  return (
    <Link href={href} className="group block">
      <article className="relative bg-card rounded-lg overflow-hidden border border-border hover:border-primary/30 transition-colors">
        <div className="aspect-[16/9] bg-gradient-to-br from-primary/10 via-secondary/20 to-accent/30 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-primary" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>CA</span>
            </div>
            <p className="text-sm text-muted-foreground">Featured Story</p>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <Badge variant="secondary" className="text-xs font-medium uppercase tracking-wider">
              {category}
            </Badge>
            <time className="text-xs text-muted-foreground">{date}</time>
          </div>
          <h2 className="text-xl lg:text-2xl font-semibold text-foreground group-hover:text-primary transition-colors leading-tight mb-3" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
            {title}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
            {excerpt}
          </p>
          <div className="mt-4 flex items-center gap-2 text-primary text-sm font-medium">
            <span>Read more</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </article>
    </Link>
  )
}
