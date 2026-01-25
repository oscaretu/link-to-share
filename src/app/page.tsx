'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import PreviewCard from '@/components/PreviewCard';
import { APP_VERSION } from '@/lib/version';

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
  const bookmarkletRef = useRef<HTMLAnchorElement>(null);

  const extractData = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/extract?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!response.ok) {
        if (data.partial) {
          setLinkData({
            title: data.partial.title || 'Sin título',
            description: data.partial.description || '',
            image: data.partial.image,
            url: data.partial.url || url,
            author: data.partial.author,
          });
          setError(`No se pudieron extraer todos los datos: ${data.error}. Puedes editar los campos manualmente.`);
        } else {
          throw new Error(data.error || 'Error al extraer los datos');
        }
      } else {
        setLinkData({
          title: data.title || 'Sin título',
          description: data.description || '',
          image: data.image,
          url: data.url || url,
          author: data.author,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ha ocurrido un error');
      setLinkData({
        title: 'Sin título',
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

  useEffect(() => {
    if (showBookmarklet && bookmarkletRef.current) {
      bookmarkletRef.current.href = bookmarkletCode;
    }
  }, [showBookmarklet, bookmarkletCode]);

  const copyBookmarklet = async () => {
    try {
      await navigator.clipboard.writeText(bookmarkletCode);
      alert('¡Código copiado! Crea un nuevo marcador y pega este código como URL.');
    } catch {
      alert('Error al copiar. Por favor, selecciona y copia el código manualmente.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Link to Share <span className="text-sm font-normal text-gray-400">({APP_VERSION})</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Extrae y formatea enlaces para WhatsApp y Telegram
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="url"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Introduce una URL..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Extrayendo...' : 'Extraer datos del enlace'}
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
            <span className="font-medium">Configuración del Bookmarklet</span>
            <span className="text-xl">{showBookmarklet ? '−' : '+'}</span>
          </button>

          {showBookmarklet && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-gray-600">
                Arrastra este enlace a tu barra de marcadores, o copia el código de abajo:
              </p>

              <a
                ref={bookmarkletRef}
                onClick={(e) => e.preventDefault()}
                className="block w-full text-center bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors cursor-grab"
                draggable
              >
                Compartir Enlace
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
                Copiar Código del Bookmarklet
              </button>

              <div className="text-xs text-gray-500 space-y-1">
                <p><strong>Instrucciones:</strong></p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Arrastra el botón &quot;Compartir Enlace&quot; a tu barra de marcadores</li>
                  <li>O crea un nuevo marcador manualmente</li>
                  <li>Pega el código copiado como URL del marcador</li>
                  <li>Haz clic en el marcador en cualquier página para compartirla</li>
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
