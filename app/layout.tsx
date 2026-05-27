import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CAGovNews — California Government News',
  description: 'Official California government news aggregator. Daily press releases from 40+ CA.gov agencies.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
        <style>{`
          /* Article rich content styles */
          .article-content { font-family: 'Source Serif 4', Georgia, serif; }
          .article-content p  { margin: 0 0 14px; line-height: 1.8; }
          .article-content h1 { font-size: 22px; font-weight: 700; margin: 0 0 16px; color: #111; }
          .article-content h2 { font-size: 18px; font-weight: 700; margin: 22px 0 10px; color: #1b3a6b; }
          .article-content h3 { font-size: 16px; font-weight: 600; margin: 18px 0 8px; color: #1b3a6b; }
          .article-content h4 { font-size: 14px; font-weight: 600; margin: 14px 0 6px; }
          .article-content ul, .article-content ol { padding-left: 22px; margin: 0 0 14px; }
          .article-content li { margin-bottom: 6px; line-height: 1.7; }
          .article-content strong, .article-content b { font-weight: 700; }
          .article-content em, .article-content i { font-style: italic; }
          .article-content u { text-decoration: underline; }
          .article-content a { color: #1b3a6b; text-decoration: underline; }
          .article-content a:hover { color: #2563eb; }
          .article-content blockquote { border-left: 3px solid #1b3a6b; padding: 4px 0 4px 16px; margin: 16px 0; color: #555; font-style: italic; }
          .article-content table { border-collapse: collapse; width: 100%; font-family: 'DM Sans', sans-serif; font-size: 13px; margin: 16px 0; }
          .article-content td, .article-content th { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
          .article-content th { background: #f8fafc; font-weight: 600; }
          .article-content img { max-width: 100%; height: auto; border-radius: 6px; margin: 10px 0; }
          .article-content hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
          .article-content pre { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; overflow-x: auto; font-size: 13px; }
          .article-content code { background: #f1f5f9; padding: 2px 5px; border-radius: 3px; font-size: 13px; }
          /* Strip source-site navigation/chrome that may leak through */
          .article-content nav, .article-content header, .article-content footer,
          .article-content .breadcrumb, .article-content .site-nav { display: none !important; }
        `}</style>
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
