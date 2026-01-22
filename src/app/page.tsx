'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import PreviewCard from '@/components/PreviewCard';

interface LinkData {
  title: string;
  description: string;
  image: string | null;
  url: string;
  author: string | null;
}

function HomeContent() {
  const searchParams = useSearchParams();
  const urlParam = searchParams.get('url');

  const [inputUrl, setInputUrl] = useState('');
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBookmarklet, setShowBookmarklet] = useState(false);

  const extractData = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/extract?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!response.ok) {
        if (data.partial) {
          setLinkData({
            title: data.partial.title || 'Untitled',
            description: data.partial.description || '',
            image: data.partial.image,
            url: data.partial.url || url,
            author: data.partial.author,
          });
          setError(`Could not fully extract data: ${data.error}. You can edit the fields manually.`);
        } else {
          throw new Error(data.error || 'Failed to extract data');
        }
      } else {
        setLinkData({
          title: data.title || 'Untitled',
          description: data.description || '',
          image: data.image,
          url: data.url || url,
          author: data.author,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLinkData({
        title: 'Untitled',
        description: '',
        image: null,
        url: url,
        author: null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (urlParam) {
      setInputUrl(urlParam);
      extractData(urlParam);
    }
  }, [urlParam, extractData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      extractData(inputUrl.trim());
    }
  };

  const handleEdit = (data: { title: string; description: string; url: string }) => {
    if (linkData) {
      setLinkData({
        ...linkData,
        ...data,
      });
    }
  };

  const bookmarkletCode = `javascript:(function(){const currentUrl=encodeURIComponent(window.location.href);const appUrl='${typeof window !== 'undefined' ? window.location.origin : ''}';window.open(appUrl+'?url='+currentUrl,'ShareLink','width=500,height=700,menubar=no,toolbar=no,location=no');})();`;

  const copyBookmarklet = async () => {
    try {
      await navigator.clipboard.writeText(bookmarkletCode);
      alert('Bookmarklet code copied! Create a new bookmark and paste this code as the URL.');
    } catch {
      alert('Failed to copy. Please select and copy the code manually.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Link to Share</h1>
          <p className="text-gray-600 mt-1">
            Extract and format links for WhatsApp & Telegram
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="url"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Enter URL to extract..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Extracting...' : 'Extract Link Data'}
          </button>
        </form>

        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {linkData && !loading && (
          <PreviewCard
            title={linkData.title}
            description={linkData.description}
            image={linkData.image}
            url={linkData.url}
            author={linkData.author}
            onEdit={handleEdit}
          />
        )}

        <div className="border-t border-gray-200 pt-6">
          <button
            onClick={() => setShowBookmarklet(!showBookmarklet)}
            className="w-full text-left flex items-center justify-between text-gray-700 hover:text-gray-900"
          >
            <span className="font-medium">Bookmarklet Setup</span>
            <span className="text-xl">{showBookmarklet ? '−' : '+'}</span>
          </button>

          {showBookmarklet && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-gray-600">
                Drag this link to your bookmarks bar, or copy the code below:
              </p>

              <a
                href={bookmarkletCode}
                onClick={(e) => e.preventDefault()}
                className="block w-full text-center bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors"
                draggable
              >
                Share Link
              </a>

              <div className="bg-gray-100 rounded-lg p-3">
                <code className="text-xs text-gray-700 break-all block">
                  {bookmarkletCode}
                </code>
              </div>

              <button
                onClick={copyBookmarklet}
                className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                Copy Bookmarklet Code
              </button>

              <div className="text-xs text-gray-500 space-y-1">
                <p><strong>Instructions:</strong></p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Drag the &quot;Share Link&quot; button to your bookmarks bar</li>
                  <li>Or create a new bookmark manually</li>
                  <li>Paste the copied code as the bookmark URL</li>
                  <li>Click the bookmark on any page to share it</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
