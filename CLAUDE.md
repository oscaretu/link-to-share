# Project: Link-to-Share Transformer

## Context & Purpose
The goal is to create a system that simplifies sharing web articles/books to WhatsApp and Telegram.
The flow: Browser (Article) -> Bookmarklet -> Web App (Extracts Info) -> Formatted Text/Preview -> Social Share.

## Tech Stack
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Data Extraction:** `cheerio` (parsing HTML and extracting metadata from Open Graph, Twitter, and meta tags)
- **Deployment:** Vercel
- **Testing:** Jest + React Testing Library
- **Language:** Spanish (all UI text is in Spanish)

## Core Requirements

### 1. Web Application (`/`)
- **Input:** Must accept a `url` parameter via GET request (e.g., `/?url=https://example.com`).
- **Extraction Engine:** - Create a server-side API route `/api/extract`.
    - Use `fetch` with a realistic User-Agent to get the HTML.
    - Use `cheerio` to parse: Title, Subtitle (Description), Canonical URL, Hero Image, and Author from Open Graph, Twitter, and standard meta tags.
- **UI/UX:**
    - Display version number in header: "Link to Share (x.x.x)"
    - Display a "Card Preview" of the link.
    - Provide format selector (radio buttons) for WhatsApp or Telegram bold formatting.
    - Provide a "Copy Text" button that generates formatted text with blank line separators:
      ```
      *Title* (WhatsApp) or **Title** (Telegram)

      Subtitle

      Link
      ```
    - Ensure the image is displayed and easy to save/copy.

### 2. Bookmarklet Generation
- Create a dedicated section in the UI to copy the bookmarklet code:
  ```javascript
  javascript:(function(){
    const currentUrl = encodeURIComponent(window.location.href);
    const appUrl = window.location.origin;
    window.open(appUrl + '?url=' + currentUrl, 'ShareLink', 'width=500,height=700,menubar=no,toolbar=no,location=no');
  })();

## Specific Rules & Logic

- **CORS/User-Agent:** When fetching the target URL, use a realistic User-Agent header (like a Chrome browser) with Sec-Ch-Ua and Sec-Fetch-* headers to avoid being blocked.
- **Error Handling:** If a URL is invalid or the site blocks scraping, show a manual entry form pre-filled with whatever data was possible to find.
- **Markdown Support:** The format selector allows choosing between WhatsApp (`*bold*`) and Telegram (`**bold**`) formatting for the title.

## Twitter/X Support

The scraper includes specialized extraction for Twitter/X URLs (`twitter.com` and `x.com`).

Twitter requires authentication to view tweets server-side, so direct fetching returns a login page. The extractor uses two strategies:
1. **Primary:** `fxtwitter.com` public API — returns full tweet data (text, author, photos, videos)
2. **Fallback:** Twitter oEmbed API (`publish.twitter.com/oembed`) — returns tweet text and author name

### Extracted fields:
- **Title:** Author display name
- **Description:** Tweet text
- **Image:** First photo or video thumbnail from the tweet
- **Author:** `@handle`

## Amazon Support

The scraper includes specialized extraction for Amazon URLs across 12 country domains:
- `.com`, `.es`, `.co.uk`, `.de`, `.fr`, `.it`, `.ca`, `.com.mx`, `.com.br`, `.co.jp`, `.in`, `.com.au`

### Amazon-specific selectors:
- **Title:** `#productTitle` or `#ebooksProductTitle`
- **Description (books):** `#bookDescription_feature_div .a-expander-content p`
- **Description (products):** `#feature-bullets ul li span.a-list-item`
- **Author/Brand:** `#bylineInfo .author a` (books) or brand extraction from `#bylineInfo` text (products)
- **Image:** `#landingImage` with `data-a-dynamic-image` JSON attribute (selects highest resolution)

### Multi-language brand extraction:
The scraper extracts brand names from patterns like:
- English: "Visit the X Store"
- Spanish: "Visita la tienda de X"
- French: "Visiter la boutique X"
- German: "Besuche den X Store"

## File Structure

- `/src/app/api/extract/route.ts` -> Logic for fetching and scraping.
- `/src/app/page.tsx` -> Main UI and state management for the preview.
- `/src/components/PreviewCard.tsx` -> Visual representation of the link with format selector.
- `/src/lib/scraper.ts` -> Cheerio-based extraction of metadata (Open Graph, Twitter, meta tags) and longer descriptions from article body.
- `/src/lib/version.ts` -> App version constant.
- `/src/__tests__/` -> Test files.

## Testing

Run tests with `npm test` or `npm run test:watch` for watch mode.

Test suites:
- **PreviewCard.test.tsx**: Component rendering, format switching, edit mode, clipboard copy.
- **scraper.test.ts**: User-Agent format, CSS selectors, URL validation, text formatting.
- **api-extract.test.ts**: URL validation, API response structure.
- **version.test.ts**: Version format validation.
