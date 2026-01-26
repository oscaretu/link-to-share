import * as cheerio from 'cheerio';

export interface ScrapedData {
  title: string | null;
  description: string | null;
  image: string | null;
  url: string | null;
  author: string | null;
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Selectors for article intro/lead paragraphs (in priority order)
const LEAD_SELECTORS = [
  'p.paragraph:first-of-type',
  '.paragraph:first-of-type',
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

function extractTitle($: cheerio.CheerioAPI): string | null {
  // Try Open Graph title first
  const ogTitle = $('meta[property="og:title"]').attr('content');
  if (ogTitle) return ogTitle.trim();

  // Try Twitter title
  const twitterTitle = $('meta[name="twitter:title"]').attr('content');
  if (twitterTitle) return twitterTitle.trim();

  // Try standard title tag
  const title = $('title').text();
  if (title) return title.trim();

  // Try h1
  const h1 = $('h1').first().text();
  if (h1) return h1.trim();

  return null;
}

function extractDescription($: cheerio.CheerioAPI): string | null {
  // Try Open Graph description
  const ogDesc = $('meta[property="og:description"]').attr('content');
  if (ogDesc) return ogDesc.trim();

  // Try Twitter description
  const twitterDesc = $('meta[name="twitter:description"]').attr('content');
  if (twitterDesc) return twitterDesc.trim();

  // Try standard meta description
  const metaDesc = $('meta[name="description"]').attr('content');
  if (metaDesc) return metaDesc.trim();

  return null;
}

function extractLongDescription($: cheerio.CheerioAPI, metaDescription: string | null): string | null {
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

function extractImage($: cheerio.CheerioAPI): string | null {
  // Try Open Graph image
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage) return ogImage;

  // Try Twitter image
  const twitterImage = $('meta[name="twitter:image"]').attr('content');
  if (twitterImage) return twitterImage;

  // Try first article image
  const articleImage = $('article img').first().attr('src');
  if (articleImage) return articleImage;

  return null;
}

function extractAuthor($: cheerio.CheerioAPI): string | null {
  // Try Open Graph author
  const ogAuthor = $('meta[property="article:author"]').attr('content');
  if (ogAuthor) return ogAuthor.trim();

  // Try meta author
  const metaAuthor = $('meta[name="author"]').attr('content');
  if (metaAuthor) return metaAuthor.trim();

  // Try schema.org author
  const schemaAuthor = $('[itemprop="author"]').first().text();
  if (schemaAuthor) return schemaAuthor.trim();

  // Try common author class names
  const authorSelectors = ['.author', '.byline', '.author-name', '[rel="author"]'];
  for (const selector of authorSelectors) {
    const author = $(selector).first().text();
    if (author) return author.trim();
  }

  return null;
}

function extractCanonicalUrl($: cheerio.CheerioAPI, originalUrl: string): string {
  // Try canonical link
  const canonical = $('link[rel="canonical"]').attr('href');
  if (canonical) return canonical;

  // Try Open Graph URL
  const ogUrl = $('meta[property="og:url"]').attr('content');
  if (ogUrl) return ogUrl;

  return originalUrl;
}

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
  const $ = cheerio.load(html);

  const metaDescription = extractDescription($);
  const longDescription = extractLongDescription($, metaDescription);

  return {
    title: extractTitle($),
    description: longDescription || metaDescription,
    image: extractImage($),
    url: extractCanonicalUrl($, targetUrl),
    author: extractAuthor($),
  };
}
