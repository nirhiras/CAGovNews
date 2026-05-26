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
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
