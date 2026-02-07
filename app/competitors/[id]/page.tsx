import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default async function CompetitorDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const competitor = await prisma.competitor.findUnique({
    where: { id },
    include: {
      snapshots: { orderBy: { capturedAt: 'desc' } },
      crawlLogs: { orderBy: { createdAt: 'desc' }, take: 30 },
    },
  });

  if (!competitor) return notFound();

  const now = Date.now();
  const dayCounts = Array.from({ length: 7 }).map((_, idx) => {
    const dayStart = new Date(now - (6 - idx) * 24 * 60 * 60 * 1000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const count = competitor.snapshots.filter((s) => s.capturedAt >= dayStart && s.capturedAt <= dayEnd).length;
    return { day: dayStart.toLocaleDateString(), count };
  });

  const prices = competitor.snapshots.map((s) => Number(s.price)).filter((v) => Number.isFinite(v));
  const priceMin = prices.length ? Math.min(...prices) : null;
  const priceMax = prices.length ? Math.max(...prices) : null;
  const priceMedian = median(prices);

  const keywordMap = new Map<string, number>();
  competitor.snapshots.forEach((s) => {
    s.uspKeywords.forEach((k) => keywordMap.set(k, (keywordMap.get(k) || 0) + 1));
  });
  const topKeywords = [...keywordMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  const latestAt = competitor.snapshots[0]?.capturedAt;
  const latestSnapshots = latestAt
    ? competitor.snapshots.filter((s) => s.capturedAt.getTime() === latestAt.getTime()).slice(0, 30)
    : [];

  return (
    <>
      <h1>{competitor.name} 詳細</h1>

      <div className="card">
        <h3>直近7日: 取得件数推移</h3>
        {dayCounts.map((d) => (
          <div key={d.day}>{d.day}: {d.count}</div>
        ))}
      </div>

      <div className="card">
        <h3>価格帯</h3>
        <div>min: {priceMin ?? '-'} / median: {priceMedian ?? '-'} / max: {priceMax ?? '-'}</div>
      </div>

      <div className="card">
        <h3>USPキーワードTOP</h3>
        {topKeywords.map(([k, count]) => (
          <span key={k} className="badge">{k} ({count})</span>
        ))}
      </div>

      <div className="card">
        <h3>最新スナップショット商品一覧</h3>
        <table className="table">
          <thead><tr><th>title</th><th>price</th><th>url</th></tr></thead>
          <tbody>
            {latestSnapshots.map((s) => (
              <tr key={s.id}>
                <td>{s.title}</td>
                <td>{String(s.price ?? '-')}</td>
                <td><a href={s.productUrl} target="_blank">{s.productUrl}</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
