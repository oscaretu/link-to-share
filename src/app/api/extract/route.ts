import { NextRequest, NextResponse } from 'next/server';
import { scrapeUrl, ScrapedData } from '@/lib/scraper';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 }
    );
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json(
      { error: 'Invalid URL format' },
      { status: 400 }
    );
  }

  try {
    const data: ScrapedData = await scrapeUrl(url);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to extract data from URL';
    return NextResponse.json(
      {
        error: message,
        partial: {
          title: null,
          description: null,
          image: null,
          url: url,
          author: null,
        }
      },
      { status: 422 }
    );
  }
}
