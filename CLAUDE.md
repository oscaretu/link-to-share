# Project: Link-to-Share Transformer

## Context & Purpose
The goal is to create a system that simplifies sharing web articles/books to WhatsApp and Telegram.
The flow: Browser (Article) -> Bookmarklet -> Web App (Extracts Info) -> Formatted Text/Preview -> Social Share.

## Tech Stack
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Data Extraction:** `metascraper`, `metascraper-title`, `metascraper-description`, `metascraper-image`, `metascraper-url`, `metascraper-author`.
- **Deployment:** Vercel (recommended for API routes).

## Core Requirements

### 1. Web Application (`/`)
- **Input:** Must accept a `url` parameter via GET request (e.g., `/?url=https://example.com`).
- **Extraction Engine:** - Create a server-side API route `/api/extract`.
    - Use `fetch` with a realistic User-Agent to get the HTML.
    - Use `metascraper` to parse: Title, Subtitle (Description), Canonical URL, and Hero Image.
- **UI/UX:**
    - Display a "Card Preview" of the link.
    - Provide a "Copy Formatted Text" button that generates:
      ```
      *Title*
      Subtitle
      Link
      ```
    - Provide a "Share" button using the `navigator.share` API.
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
- **Markdown Support:** Ensure the "Copy" function formats text specifically for WhatsApp (uses `*bold*`) and Telegram (supports Markdown/HTML).

## File Structure Suggestion

- `/app/api/extract/route.ts` -> Logic for fetching and scraping.
- `/app/page.tsx` -> Main UI and state management for the preview.
- `/components/PreviewCard.tsx` -> Visual representation of the link.
- `/lib/scraper.ts` -> Metascraper configuration.
