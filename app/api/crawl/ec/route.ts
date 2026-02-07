import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractProductLinksFromCategory, scrapeProductDetail } from '@/lib/crawl';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const maxProducts = Number(body.maxProducts) > 0 ? Number(body.maxProducts) : 8;

  const run = await prisma.crawlRun.create({ data: { status: 'running' } });
  let totalSuccess = 0;
  let totalFail = 0;

  try {
    const competitors = await prisma.competitor.findMany({
      include: { sources: { where: { active: true } } },
    });

    for (const competitor of competitors) {
      for (const source of competitor.sources) {
        try {
          await prisma.crawlLog.create({
            data: {
              crawlRunId: run.id,
              competitorId: competitor.id,
              url: source.categoryUrl,
              stage: 'category',
              status: 'success',
              message: 'Start category crawl',
            },
          });

          const productLinks = await extractProductLinksFromCategory(source.categoryUrl, maxProducts);

          for (const candidate of productLinks) {
            try {
              const detail = await scrapeProductDetail(candidate.url);
              await prisma.eCProductSnapshot.create({
                data: {
                  competitorId: competitor.id,
                  productUrl: candidate.url,
                  title: detail.title,
                  price: detail.price,
                  uspKeywords: detail.uspKeywords,
                },
              });

              totalSuccess += 1;
              await prisma.crawlLog.create({
                data: {
                  crawlRunId: run.id,
                  competitorId: competitor.id,
                  url: candidate.url,
                  stage: 'product',
                  status: 'success',
                  message: detail.title,
                },
              });
            } catch (error) {
              totalFail += 1;
              await prisma.crawlLog.create({
                data: {
                  crawlRunId: run.id,
                  competitorId: competitor.id,
                  url: candidate.url,
                  stage: 'product',
                  status: 'fail',
                  message: error instanceof Error ? error.message : 'unknown product error',
                },
              });
            }
          }
        } catch (error) {
          totalFail += 1;
          await prisma.crawlLog.create({
            data: {
              crawlRunId: run.id,
              competitorId: competitor.id,
              url: source.categoryUrl,
              stage: 'category',
              status: 'fail',
              message: error instanceof Error ? error.message : 'unknown category error',
            },
          });
        }
      }
    }

    const finished = await prisma.crawlRun.update({
      where: { id: run.id },
      data: {
        status: 'success',
        finishedAt: new Date(),
        totalSuccess,
        totalFail,
      },
    });

    return NextResponse.json(finished);
  } catch (error) {
    await prisma.crawlRun.update({
      where: { id: run.id },
      data: {
        status: 'fail',
        finishedAt: new Date(),
        totalSuccess,
        totalFail,
      },
    });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'crawl failed' }, { status: 500 });
  }
}
