import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Header } from '@/components/layout/header';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'PolyAnalyzer - Polymarket Trading Strategy Analyzer',
  description: 'Analyze Polymarket trading strategies, PnL, win rates, and edge detection',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-[family-name:var(--font-geist-sans)] antialiased min-h-screen`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
          <Header />
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
