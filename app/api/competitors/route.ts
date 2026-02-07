import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const competitors = await prisma.competitor.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      sources: true,
      snapshots: {
        orderBy: { capturedAt: 'desc' },
        take: 1,
      },
    },
  });
  return NextResponse.json(competitors);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = String(body.name || '').trim();
  const domain = String(body.domain || '').trim();

  if (!name || !domain) {
    return NextResponse.json({ error: 'name and domain are required' }, { status: 400 });
  }

  const competitor = await prisma.competitor.create({
    data: {
      name,
      domain: domain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    },
  });

  return NextResponse.json(competitor, { status: 201 });
}
