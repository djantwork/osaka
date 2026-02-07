'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Competitor = {
  id: number;
  name: string;
  domain: string;
  sources: { id: number; categoryUrl: string }[];
};

export function CompetitorManager({ competitors }: { competitors: Competitor[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [sourceById, setSourceById] = useState<Record<number, string>>({});

  const createCompetitor = async () => {
    setLoading(true);
    try {
      await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, domain }),
      });
      setName('');
      setDomain('');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const addSource = async (competitorId: number) => {
    const categoryUrl = sourceById[competitorId]?.trim();
    if (!categoryUrl) return;
    setLoading(true);
    try {
      await fetch(`/api/competitors/${competitorId}/sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryUrl }),
      });
      setSourceById((prev) => ({ ...prev, [competitorId]: '' }));
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const runCrawl = async () => {
    setLoading(true);
    try {
      await fetch('/api/crawl/ec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxProducts: 8 }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid">
      <div className="card">
        <h3>競合追加</h3>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr auto' }}>
          <input placeholder="name" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="domain (example.com)" value={domain} onChange={(e) => setDomain(e.target.value)} />
          <button disabled={loading} onClick={createCompetitor}>登録</button>
        </div>
      </div>

      <div className="card">
        <button disabled={loading} onClick={runCrawl}>全競合をクロール</button>
      </div>

      {competitors.map((c) => (
        <div className="card" key={c.id}>
          <h4>{c.name} <span className="small">({c.domain})</span></h4>
          <div style={{ marginBottom: 8 }}>
            {c.sources.map((s) => (
              <div key={s.id} className="small">- {s.categoryUrl}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="カテゴリURLを追加"
              value={sourceById[c.id] || ''}
              onChange={(e) => setSourceById((prev) => ({ ...prev, [c.id]: e.target.value }))}
            />
            <button disabled={loading} onClick={() => addSource(c.id)}>追加</button>
          </div>
        </div>
      ))}
    </div>
  );
}
