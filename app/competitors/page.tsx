import Link from 'next/link';
import { CompetitorManager } from '@/components/CompetitorManager';
import { prisma } from '@/lib/prisma';

export default async function CompetitorsPage() {
  const [competitors, runs] = await Promise.all([
    prisma.competitor.findMany({
      orderBy: { createdAt: 'desc' },
      include: { sources: { orderBy: { createdAt: 'desc' } } },
    }),
    prisma.crawlRun.findMany({ orderBy: { startedAt: 'desc' }, take: 5 }),
  ]);

  return (
    <>
      <h1>Competitors</h1>
      <CompetitorManager competitors={competitors} />

      <div className="card">
        <h3>直近クロール結果</h3>
        <table className="table">
          <thead>
            <tr><th>started</th><th>status</th><th>success</th><th>fail</th></tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td>{r.startedAt.toLocaleString()}</td>
                <td>{r.status}</td>
                <td>{r.totalSuccess}</td>
                <td>{r.totalFail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>詳細ページ</h3>
        {competitors.map((c) => (
          <div key={c.id}><Link href={`/competitors/${c.id}`}>{c.name} の詳細へ</Link></div>
        ))}
      </div>
    </>
  );
}
