import * as cheerio from 'cheerio';

export interface ScrapedData {
  title: string | null;
  description: string | null;
  image: string | null;
  url: string | null;
  author: string | null;
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// Headers that better simulate a real browser
const BROWSER_HEADERS = {
  'User-Agent': USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'max-age=0',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
};

// Check if URL is from Amazon
function isAmazonUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    // Match amazon.es, www.amazon.es, smile.amazon.com, etc.
    return /^(www\.)?amazon\.(com|es|co\.uk|de|fr|it|ca|com\.mx|com\.br|co\.jp|in|com\.au)$/i.test(hostname) ||
           /\.amazon\.(com|es|co\.uk|de|fr|it|ca|com\.mx|com\.br|co\.jp|in|com\.au)$/i.test(hostname);
  } catch {
    return false;
  }
}

// Amazon-specific extraction
function extractAmazonData($: cheerio.CheerioAPI, originalUrl: string): ScrapedData {
  // Title: #productTitle or #ebooksProductTitle
  let title: string | null = $('#productTitle').text().trim() || $('#ebooksProductTitle').text().trim() || null;
  if (!title) {
    title = $('meta[name="title"]').attr('content')?.split(':')[0]?.trim() || null;
  }

  // Author: from #bylineInfo (for books) or brand (for products)
  let author = $('#bylineInfo .author a').first().text().trim();
  if (!author) {
    author = $('#bylineInfo a.contributorNameID').first().text().trim();
  }
  if (!author) {
    author = $('span.author a').first().text().trim();
  }
  // For products: extract brand from "Visit the X Store" (EN) or "Visita la tienda de X" (ES) or similar
  if (!author) {
    const bylineText = $('#bylineInfo').text().trim();
    // English: "Visit the Apple Store"
    const brandMatchEn = bylineText.match(/Visit the (.+?) Store/i);
    // Spanish: "Visita la tienda de Apple"
    const brandMatchEs = bylineText.match(/Visita la tienda de (.+)/i);
    // French: "Visiter la boutique X"
    const brandMatchFr = bylineText.match(/Visiter la boutique (.+)/i);
    // German: "Besuche den X Store"
    const brandMatchDe = bylineText.match(/Besuche den (.+?)[-\s]Store/i);

    const brandMatch = brandMatchEn || brandMatchEs || brandMatchFr || brandMatchDe;
    if (brandMatch) {
      author = brandMatch[1].trim();
    }
  }
  // Fallback: try to get brand from link text, cleaning common patterns
  if (!author) {
    let linkText = $('#bylineInfo a').first().text().trim();
    linkText = linkText
      .replace(/^Visit the\s+/i, '')
      .replace(/^Visita la tienda de\s+/i, '')
      .replace(/^Visiter la boutique\s+/i, '')
      .replace(/^Besuche den\s+/i, '')
      .replace(/\s+Store$/i, '')
      .replace(/[-\s]Store$/i, '');
    if (linkText && linkText.length < 50) {
      author = linkText;
    }
  }

  // Description: from bookDescription area or product description
  let description = '';

  // Try multiple selectors for the book description
  const descSelectors = [
    '#bookDescription_feature_div .a-expander-content',
    '#bookDescription .a-expander-content',
    '[data-a-expander-name="book_description_expander"] .a-expander-content',
    '#bookDescription_feature_div',
    '#bookDescription',
  ];

  for (const selector of descSelectors) {
    const descDiv = $(selector);
    if (descDiv.length) {
      // Try to get text from paragraphs first
      const paragraphs: string[] = [];
      descDiv.find('p').each((_, el) => {
        const text = $(el).text().trim();
        if (text) paragraphs.push(text);
      });

      if (paragraphs.length > 0) {
        description = paragraphs.join(' ');
        break;
      }

      // Fallback to full text content
      const fullText = descDiv.text().trim();
      if (fullText && fullText.length > 50) {
        description = fullText;
        break;
      }
    }
  }

  // Try product description for non-book items
  if (!description) {
    description = $('#productDescription p').text().trim();
  }

  // Try feature-bullets for products (electronics, etc.)
  if (!description) {
    const bullets: string[] = [];
    $('#feature-bullets ul li span.a-list-item').each((_, el) => {
      const text = $(el).text().trim();
      if (text && !text.includes('LEGAL DISCLAIMER')) {
        bullets.push(text);
      }
    });
    if (bullets.length > 0) {
      // Take first 2-3 bullets as description
      description = bullets.slice(0, 3).join(' ');
    }
  }

  // Last resort: meta description, but only if it's different from title
  if (!description) {
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    // Only use if it doesn't look like a repeated title
    if (metaDesc && !metaDesc.includes('Amazon.es') && metaDesc.length > 50) {
      description = metaDesc;
    }
  }

  // Truncate if too long
  if (description.length > 500) {
    description = description.substring(0, 497) + '...';
  }

  // Image: from #landingImage or #imgBlkFront with data-a-dynamic-image
  let image: string | null = null;
  const imgElement = $('#landingImage, #imgBlkFront, #ebooksImgBlkFront').first();
  const dynamicImageData = imgElement.attr('data-a-dynamic-image');

  if (dynamicImageData) {
    try {
      const imageObj = JSON.parse(dynamicImageData);
      // Get the largest image (last key usually has highest resolution)
      const imageUrls = Object.keys(imageObj);
      if (imageUrls.length > 0) {
        // Find the largest image by dimensions
        let maxSize = 0;
        for (const url of imageUrls) {
          const dims = imageObj[url];
          const size = dims[0] * dims[1];
          if (size > maxSize) {
            maxSize = size;
            image = url;
          }
        }
      }
    } catch {
      // Fallback to src attribute
      image = imgElement.attr('src') || null;
    }
  } else {
    image = imgElement.attr('src') || null;
  }

  // Fallback to og:image if no product image found
  if (!image) {
    image = $('meta[property="og:image"]').attr('content') || null;
  }

  // Canonical URL
  const canonical = $('link[rel="canonical"]').attr('href') || originalUrl;

  return {
    title: title || null,
    description: description || null,
    image,
    url: canonical,
    author: author || null,
  };
}

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
    headers: BROWSER_HEADERS,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Use Amazon-specific extraction if URL is from Amazon
  if (isAmazonUrl(targetUrl)) {
    return extractAmazonData($, targetUrl);
  }

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
