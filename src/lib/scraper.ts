import metascraper from 'metascraper';
import metascraperTitle from 'metascraper-title';
import metascraperDescription from 'metascraper-description';
import metascraperImage from 'metascraper-image';
import metascraperUrl from 'metascraper-url';
import metascraperAuthor from 'metascraper-author';
import * as cheerio from 'cheerio';

const scraper = metascraper([
  metascraperTitle(),
  metascraperDescription(),
  metascraperImage(),
  metascraperUrl(),
  metascraperAuthor(),
]);

// Selectors for article intro/lead paragraphs (in priority order)
const LEAD_SELECTORS = [
  // Common article body paragraph classes
  'p.paragraph:first-of-type',
  '.paragraph:first-of-type',
  // Intro/lead classes
  'article header p',
  '.article-intro',
  '.article__intro',
  '.article-lead',
  '.article__lead',
  '.lead',
  '.intro',
  '.subtitle',
  '.article-subtitle',
  '.article__subtitle',
  '.entradilla',
  '.sumario',
  '.excerpt',
  '[itemprop="description"]',
  '[itemprop="articleBody"] > p:first-of-type',
  'article > p:first-of-type',
  '.content > p:first-of-type',
  '.article-body > p:first-of-type',
  '.article__body > p:first-of-type',
  '.story-body > p:first-of-type',
  '.post-content > p:first-of-type',
];

function extractLongDescription(html: string, metaDescription: string | null): string | null {
  const $ = cheerio.load(html);

  // Try each selector to find a longer description
  for (const selector of LEAD_SELECTORS) {
    const element = $(selector).first();
    if (element.length) {
      const text = element.text().trim();
      // Only use if it's longer than the meta description and has reasonable length
      if (text.length > 50 && (!metaDescription || text.length > metaDescription.length)) {
        return text;
      }
    }
  }

  return null;
}

export interface ScrapedData {
  title: string | null;
  description: string | null;
  image: string | null;
  url: string | null;
  author: string | null;
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function scrapeUrl(targetUrl: string): Promise<ScrapedData> {
  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const metadata = await scraper({ html, url: targetUrl });

  // Try to get a longer description from article content
  const longDescription = extractLongDescription(html, metadata.description || null);

  return {
    title: metadata.title || null,
    description: longDescription || metadata.description || null,
    image: metadata.image || null,
    url: metadata.url || targetUrl,
    author: metadata.author || null,
  };
}
