import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function RankingPage() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const competitors = await prisma.competitor.findMany({ include: { snapshots: true } });

  const ranked = competitors
    .map((c) => ({
      id: c.id,
      name: c.name,
      count7d: c.snapshots.filter((s) => s.capturedAt >= since).length,
    }))
    .sort((a, b) => b.count7d - a.count7d);

  return (
    <>
      <h1>Ranking</h1>
      <div className="card">
        <h3>競合モメンタム（直近7日件数）</h3>
        <table className="table">
          <thead><tr><th>Rank</th><th>Competitor</th><th>7d件数</th><th>Detail</th></tr></thead>
          <tbody>
            {ranked.map((r, i) => (
              <tr key={r.id}>
                <td>#{i + 1}</td>
                <td>{r.name}</td>
                <td>{r.count7d}</td>
                <td><Link href={`/competitors/${r.id}`}>詳細</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
