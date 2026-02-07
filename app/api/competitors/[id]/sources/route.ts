import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const competitorId = Number(params.id);
  const body = await req.json();
  const categoryUrl = String(body.categoryUrl || '').trim();

  if (!competitorId || !categoryUrl) {
    return NextResponse.json({ error: 'competitor and categoryUrl are required' }, { status: 400 });
  }

  const source = await prisma.eCSource.create({
    data: { competitorId, categoryUrl },
  });

  return NextResponse.json(source, { status: 201 });
}
