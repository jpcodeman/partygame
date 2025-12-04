import './globals.css'

export const metadata = {
  title: 'Party Game',
  description: 'Get-to-know-you party game',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
