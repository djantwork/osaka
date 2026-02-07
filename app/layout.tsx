import './globals.css';
import Link from 'next/link';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Competitor Radar',
  description: 'Personal EC competitor radar MVP',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <div className="container">
          <nav className="card" style={{ display: 'flex', gap: 16 }}>
            <Link href="/competitors">Competitors</Link>
            <Link href="/ranking">Ranking</Link>
            <Link href="/insights">Insights</Link>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
