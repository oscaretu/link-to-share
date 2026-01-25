# Project: Link-to-Share Transformer

## Context & Purpose
The goal is to create a system that simplifies sharing web articles/books to WhatsApp and Telegram.
The flow: Browser (Article) -> Bookmarklet -> Web App (Extracts Info) -> Formatted Text/Preview -> Social Share.

## Tech Stack
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Data Extraction:** `metascraper`, `metascraper-title`, `metascraper-description`, `metascraper-image`, `metascraper-url`, `metascraper-author`.
- **HTML Parsing:** `cheerio` (for extracting longer descriptions from article body)
- **Deployment:** Vercel (recommended for API routes).
- **Language:** Spanish (all UI text is in Spanish)

## Core Requirements

### 1. Web Application (`/`)
- **Input:** Must accept a `url` parameter via GET request (e.g., `/?url=https://example.com`).
- **Extraction Engine:** - Create a server-side API route `/api/extract`.
    - Use `fetch` with a realistic User-Agent to get the HTML.
    - Use `metascraper` to parse: Title, Subtitle (Description), Canonical URL, and Hero Image.
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

- **CORS/User-Agent:** When fetching the target URL, use a realistic User-Agent header (like a Chrome browser) to avoid being blocked by sites like Amazon or Medium.
- **Error Handling:** If a URL is invalid or the site blocks scraping, show a manual entry form pre-filled with whatever data was possible to find.
- **Markdown Support:** The format selector allows choosing between WhatsApp (`*bold*`) and Telegram (`**bold**`) formatting for the title.

## File Structure

- `/src/app/api/extract/route.ts` -> Logic for fetching and scraping.
- `/src/app/page.tsx` -> Main UI and state management for the preview.
- `/src/components/PreviewCard.tsx` -> Visual representation of the link with format selector.
- `/src/lib/scraper.ts` -> Metascraper configuration + cheerio extraction for longer descriptions.
- `/src/lib/version.ts` -> App version constant.
