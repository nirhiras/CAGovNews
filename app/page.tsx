import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { NewsCard } from "@/components/news-card"
import { FeaturedArticle } from "@/components/featured-article"
import { TopicCard } from "@/components/topic-card"
import { Leaf, Building2, GraduationCap, HeartPulse, Shield, Zap } from "lucide-react"

const latestNews = [
  {
    date: "May 10, 2026",
    title: "Governor Signs Historic Climate Investment Package into Law",
    source: "Office of the Governor",
    href: "#",
  },
  {
    date: "May 9, 2026",
    title: "California Expands Access to Affordable Housing Programs Statewide",
    source: "Department of Housing",
    href: "#",
  },
  {
    date: "May 8, 2026",
    title: "State Launches New Initiative to Support Small Business Recovery",
    source: "Economic Development",
    href: "#",
  },
  {
    date: "May 7, 2026",
    title: "California Schools Report Record-Breaking Graduation Rates",
    source: "Department of Education",
    href: "#",
  },
  {
    date: "May 6, 2026",
    title: "New Transportation Infrastructure Plan Announced for Northern California",
    source: "Caltrans",
    href: "#",
  },
  {
    date: "May 5, 2026",
    title: "State Releases Updated Water Conservation Guidelines",
    source: "Water Resources Board",
    href: "#",
  },
]

const topics = [
  {
    icon: Leaf,
    title: "Environment",
    description: "Climate action, conservation, and environmental protection initiatives.",
    href: "#",
  },
  {
    icon: Building2,
    title: "Housing",
    description: "Affordable housing programs and community development.",
    href: "#",
  },
  {
    icon: GraduationCap,
    title: "Education",
    description: "K-12 schools, higher education, and workforce training.",
    href: "#",
  },
  {
    icon: HeartPulse,
    title: "Health",
    description: "Public health services and healthcare access.",
    href: "#",
  },
  {
    icon: Shield,
    title: "Public Safety",
    description: "Emergency services and community safety programs.",
    href: "#",
  },
  {
    icon: Zap,
    title: "Energy",
    description: "Renewable energy and utilities modernization.",
    href: "#",
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-muted/50 to-background py-12 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <p className="text-sm font-medium tracking-wider text-primary uppercase mb-4">
                Official News
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
                California Government News
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                Stay informed with official news, press releases, and announcements from the State of California.
              </p>
            </div>
          </div>
        </section>

        {/* Featured & Latest News */}
        <section className="py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
              {/* Featured Article */}
              <div className="lg:col-span-1">
                <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-6">
                  Featured
                </h2>
                <FeaturedArticle
                  category="Climate"
                  date="May 10, 2026"
                  title="California Leads Nation in Clean Energy Transition"
                  excerpt="New legislation positions the state as a global leader in renewable energy adoption and climate innovation."
                  href="#"
                />
              </div>

              {/* Latest News List */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Latest News
                  </h2>
                  <a href="#" className="text-sm font-medium text-primary hover:underline">
                    View all
                  </a>
                </div>
                <div className="divide-y-0">
                  {latestNews.map((news, index) => (
                    <NewsCard
                      key={index}
                      date={news.date}
                      title={news.title}
                      source={news.source}
                      href={news.href}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Topics Section */}
        <section id="topics" className="py-12 lg:py-16 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">
                Browse by Topic
              </h2>
              <p className="text-2xl lg:text-3xl font-semibold text-foreground" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
                Explore news by category
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {topics.map((topic) => (
                <TopicCard
                  key={topic.title}
                  icon={topic.icon}
                  title={topic.title}
                  description={topic.description}
                  href={topic.href}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-primary rounded-xl p-8 lg:p-12 text-center">
              <h2 className="text-2xl lg:text-3xl font-semibold text-primary-foreground mb-4" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
                Stay Updated
              </h2>
              <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">
                Subscribe to receive the latest news and updates from the State of California directly in your inbox.
              </p>
              <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-lg bg-primary-foreground text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-accent text-accent-foreground font-medium rounded-lg hover:bg-accent/90 transition-colors"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
