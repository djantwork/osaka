import { chromium } from 'playwright';

export type ProductCandidate = { url: string; title?: string };

type DomainStrategy = {
  preferredPatterns: RegExp[];
};

const GENERIC_PATTERNS = [/\/products?\//i, /\/item(s)?\//i, /\/detail\//i];

const SHOPIFY_PATTERNS = [/\/products\//i, ...GENERIC_PATTERNS];

function getDomainStrategy(hostname: string): DomainStrategy {
  if (hostname.includes('myshopify.com') || hostname.includes('shopify')) {
    return { preferredPatterns: SHOPIFY_PATTERNS };
  }
  return { preferredPatterns: GENERIC_PATTERNS };
}

function normalizeUrl(url: string): string {
  const u = new URL(url);
  u.hash = '';
  u.search = '';
  return u.toString().replace(/\/$/, '');
}

export async function extractProductLinksFromCategory(categoryUrl: string, maxProducts: number): Promise<ProductCandidate[]> {
  const base = new URL(categoryUrl);
  const strategy = getDomainStrategy(base.hostname);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(categoryUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(1200);

    const hrefs = await page.$$eval('a[href]', (anchors) =>
      anchors.map((a) => ({ href: (a as HTMLAnchorElement).href, title: (a.textContent || '').trim() }))
    );

    const results: ProductCandidate[] = [];
    const seen = new Set<string>();

    for (const item of hrefs) {
      try {
        const parsed = new URL(item.href);
        if (parsed.hostname !== base.hostname) continue;

        const normalized = normalizeUrl(parsed.toString());
        if (seen.has(normalized)) continue;
        if (!strategy.preferredPatterns.some((re) => re.test(parsed.pathname))) continue;

        seen.add(normalized);
        results.push({ url: normalized, title: item.title });
        if (results.length >= maxProducts) break;
      } catch {
        // skip invalid url
      }
    }

    return results;
  } finally {
    await browser.close();
  }
}

export async function scrapeProductDetail(productUrl: string): Promise<{ title: string; price: number | null; uspKeywords: string[] }> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(800);

    const data = await page.evaluate(() => {
      const title =
        document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
        document.querySelector('h1')?.textContent ||
        document.title ||
        'Untitled';

      const text = document.body?.innerText || '';
      const priceMatch = text.match(/([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/);
      const normalized = priceMatch ? Number(priceMatch[1].replace(/,/g, '')) : null;
      const keywordSource = `${title}\n${text.slice(0, 3000)}`.toLowerCase();
      const dict = ['日本製', 'オーガニック', '手作り', '送料無料', '洗える', '高級', '軽量', '快眠', '抗菌', '限定'];
      const uspKeywords = dict.filter((w) => keywordSource.includes(w.toLowerCase())).slice(0, 8);

      return {
        title: title.trim(),
        price: Number.isFinite(normalized) ? normalized : null,
        uspKeywords,
      };
    });

    return data;
  } finally {
    await browser.close();
  }
}
