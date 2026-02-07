import { prisma } from '@/lib/prisma';

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default async function InsightsPage() {
  const competitors = await prisma.competitor.findMany({ include: { snapshots: true } });
  const now = Date.now();
  const weekStart = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const prevWeekStart = new Date(now - 14 * 24 * 60 * 60 * 1000);

  const growthTop = competitors
    .map((c) => {
      const current = c.snapshots.filter((s) => s.capturedAt >= weekStart).length;
      const previous = c.snapshots.filter((s) => s.capturedAt >= prevWeekStart && s.capturedAt < weekStart).length;
      return { id: c.id, name: c.name, delta: current - previous, current, previous };
    })
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5);

  const priceTrend = competitors.map((c) => {
    const currentPrices = c.snapshots
      .filter((s) => s.capturedAt >= weekStart)
      .map((s) => Number(s.price))
      .filter((v) => Number.isFinite(v));
    const prevPrices = c.snapshots
      .filter((s) => s.capturedAt >= prevWeekStart && s.capturedAt < weekStart)
      .map((s) => Number(s.price))
      .filter((v) => Number.isFinite(v));

    const currentMedian = median(currentPrices);
    const prevMedian = median(prevPrices);
    const trend = currentMedian !== null && prevMedian !== null ? currentMedian - prevMedian : null;

    return { id: c.id, name: c.name, currentMedian, prevMedian, trend };
  });

  const uspDiff = new Map<string, { current: number; prev: number }>();
  competitors.forEach((c) => {
    c.snapshots.forEach((s) => {
      const bucket = s.capturedAt >= weekStart ? 'current' : s.capturedAt >= prevWeekStart ? 'prev' : null;
      if (!bucket) return;
      s.uspKeywords.forEach((k) => {
        const row = uspDiff.get(k) || { current: 0, prev: 0 };
        row[bucket] += 1;
        uspDiff.set(k, row);
      });
    });
  });

  const uspTop = [...uspDiff.entries()]
    .map(([keyword, v]) => ({ keyword, delta: v.current - v.prev, current: v.current, prev: v.prev }))
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 10);

  return (
    <>
      <h1>Insights (今週の結論)</h1>

      <div className="card">
        <h3>直近7日で伸びてる競合 TOP5</h3>
        {growthTop.map((g) => (
          <div key={g.id}>{g.name}: Δ{g.delta} (今週 {g.current} / 先週 {g.previous})</div>
        ))}
      </div>

      <div className="card">
        <h3>価格帯トレンド（中央値）</h3>
        {priceTrend.map((p) => (
          <div key={p.id}>{p.name}: 今週 {p.currentMedian ?? '-'} / 先週 {p.prevMedian ?? '-'} / 差分 {p.trend ?? '-'}</div>
        ))}
      </div>

      <div className="card">
        <h3>USP増加 TOP10（前週 vs 今週）</h3>
        {uspTop.map((u) => (
          <div key={u.keyword}>{u.keyword}: Δ{u.delta} (今週 {u.current} / 前週 {u.prev})</div>
        ))}
      </div>
    </>
  );
}
