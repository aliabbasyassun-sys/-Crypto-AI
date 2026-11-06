import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Crypto AI Analyst',
  description: '10 AI Agents + Brain analyzing crypto markets',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
