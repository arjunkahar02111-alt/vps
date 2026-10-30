import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KARVION CONTROL | Universal VPS Management & Automated Deployment',
  description:
    'Universal VPS Management, Automated Deployment & Hosting SaaS. Designed & Developed by Arjun Kahar.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#ef4444',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-karvion-bg text-zinc-100 antialiased selection:bg-red-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
