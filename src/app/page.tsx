/**
 * page.tsx - Página principal de la aplicación Link to Share
 *
 * Esta es la página de inicio que permite a los usuarios:
 * 1. Introducir una URL manualmente o recibirla como parámetro GET
 * 2. Extraer metadatos de la URL (título, descripción, imagen, autor)
 * 3. Previsualizar y editar los datos extraídos
 * 4. Copiar el texto formateado para WhatsApp o Telegram
 * 5. Configurar un bookmarklet para uso rápido desde cualquier página
 *
 * La página usa 'use client' porque necesita hooks de React (useState, useEffect)
 * y acceso a APIs del navegador (clipboard, window.location).
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import PreviewCard from '@/components/PreviewCard';
import { APP_VERSION } from '@/lib/version';

/**
 * Interfaz que define la estructura de los datos de un enlace.
 * Se usa para tipar el estado linkData.
 */
interface LinkData {
  title: string;        // Título del enlace (nunca null en el estado, usa 'Sin título' como fallback)
  description: string;  // Descripción del enlace (puede ser string vacío)
  image: string | null; // URL de la imagen (puede ser null si no hay imagen)
  url: string;          // URL del enlace
  author: string | null; // Autor o marca (puede ser null)
}

/**
 * Componente principal que contiene toda la lógica de la página.
 * Está separado del componente Home para poder usar useSearchParams()
 * dentro de un Suspense boundary (requerido por Next.js App Router).
 */
function HomeContent() {
  // Hook para acceder a los parámetros de la URL (?url=...)
  const searchParams = useSearchParams();
  const urlParam = searchParams.get('url');

  // ---- ESTADOS DE LA APLICACIÓN ----

  // URL introducida en el campo de texto
  const [inputUrl, setInputUrl] = useState('');

  // Datos extraídos del enlace (null hasta que se extraigan)
  const [linkData, setLinkData] = useState<LinkData | null>(null);

  // Indica si se está procesando una extracción
  const [loading, setLoading] = useState(false);

  // Mensaje de error (null si no hay error)
  const [error, setError] = useState<string | null>(null);

  // Controla la visibilidad de la sección del bookmarklet
  const [showBookmarklet, setShowBookmarklet] = useState(false);

  // Referencia al elemento <a> del bookmarklet para poder modificar su href
  const bookmarkletRef = useRef<HTMLAnchorElement>(null);

  /**
   * Función que extrae los metadatos de una URL llamando a la API.
   *
   * Usa useCallback para memorizar la función y evitar recrearla en cada render.
   * Esto es importante porque se usa como dependencia en useEffect.
   *
   * @param url - URL de la que extraer los metadatos
   */
  const extractData = useCallback(async (url: string) => {
    // Iniciar estado de carga y limpiar errores previos
    setLoading(true);
    setError(null);

    try {
      // Llamar a la API de extracción
      const response = await fetch(`/api/extract?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!response.ok) {
        // La API devolvió un error (ej: sitio bloqueado)
        if (data.partial) {
          // Hay datos parciales disponibles - mostrarlos y permitir edición manual
          setLinkData({
            title: data.partial.title || 'Sin título',
            description: data.partial.description || '',
            image: data.partial.image,
            url: data.partial.url || url,
            author: data.partial.author,
          });
          setError(`No se pudieron extraer todos los datos: ${data.error}. Puedes editar los campos manualmente.`);
        } else {
          // Error sin datos parciales
          throw new Error(data.error || 'Error al extraer los datos');
        }
      } else {
        // Éxito: guardar todos los datos extraídos
        setLinkData({
          title: data.title || 'Sin título',
          description: data.description || '',
          image: data.image,
          url: data.url || url,
          author: data.author,
        });
      }
    } catch (err) {
      // Error de red o excepción no controlada
      setError(err instanceof Error ? err.message : 'Ha ocurrido un error');
      // Crear datos mínimos para permitir edición manual
      setLinkData({
        title: 'Sin título',
        description: '',
        image: null,
        url: url,
        author: null,
      });
    } finally {
      // Siempre desactivar el estado de carga al terminar
      setLoading(false);
    }
  }, []); // Sin dependencias porque no usa ningún estado externo

  /**
   * Effect que se ejecuta cuando la página carga con un parámetro ?url=
   * Esto permite que el bookmarklet funcione: abre la app con la URL como parámetro.
   */
  useEffect(() => {
    if (urlParam) {
      setInputUrl(urlParam);     // Mostrar la URL en el campo de texto
      extractData(urlParam);     // Iniciar extracción automáticamente
    }
  }, [urlParam, extractData]);

  /**
   * Handler del formulario de entrada de URL.
   * Se ejecuta cuando el usuario hace clic en "Extraer datos del enlace".
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Evitar recarga de página
    if (inputUrl.trim()) {
      extractData(inputUrl.trim());
    }
  };

  /**
   * Handler para actualizar los datos cuando el usuario edita en PreviewCard.
   * Combina los datos existentes con los nuevos datos editados.
   */
  const handleEdit = (data: { title: string; description: string; url: string }) => {
    if (linkData) {
      setLinkData({
        ...linkData,  // Mantener image y author
        ...data,      // Sobrescribir title, description y url
      });
    }
  };

  /**
   * Código JavaScript del bookmarklet.
   *
   * Este código se ejecuta cuando el usuario hace clic en el marcador.
   * Lo que hace:
   * 1. Obtiene la URL de la página actual
   * 2. La codifica para poder pasarla como parámetro
   * 3. Abre esta app en una ventana popup con la URL como parámetro
   *
   * Nota: window.location.origin se evalúa en tiempo de ejecución del bookmarklet,
   * no cuando se crea, por eso usamos una IIFE (Immediately Invoked Function Expression).
   */
  const bookmarkletCode = `javascript:(function(){const currentUrl=encodeURIComponent(window.location.href);const appUrl='${typeof window !== 'undefined' ? window.location.origin : ''}';window.open(appUrl+'?url='+currentUrl,'ShareLink','width=500,height=700,menubar=no,toolbar=no,location=no');})();`;

  /**
   * Effect para actualizar el href del bookmarklet cuando se muestra.
   * Necesario porque no podemos poner código JavaScript directamente en el href
   * durante el render del servidor.
   */
  useEffect(() => {
    if (showBookmarklet && bookmarkletRef.current) {
      bookmarkletRef.current.href = bookmarkletCode;
    }
  }, [showBookmarklet, bookmarkletCode]);

  /**
   * Copia el código del bookmarklet al portapapeles.
   * Útil para usuarios que no pueden arrastrar el enlace (ej: móviles).
   */
  const copyBookmarklet = async () => {
    try {
      await navigator.clipboard.writeText(bookmarkletCode);
      alert('¡Código copiado! Crea un nuevo marcador y pega este código como URL.');
    } catch {
      alert('Error al copiar. Por favor, selecciona y copia el código manualmente.');
    }
  };

  // ---- RENDERIZADO DE LA INTERFAZ ----
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-md mx-auto space-y-6">

        {/* ---- HEADER ---- */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Link to Share <span className="text-sm font-normal text-gray-400">({APP_VERSION})</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Obtén título y subtítulo de una URL para compartir en WhatsApp y Telegram
          </p>
        </div>

        {/* ---- FORMULARIO DE ENTRADA DE URL ---- */}
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

        {/* ---- MENSAJE DE ERROR (si existe) ---- */}
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">{error}</p>
          </div>
        )}

        {/* ---- SPINNER DE CARGA ---- */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* ---- TARJETA DE PREVISUALIZACIÓN (si hay datos) ---- */}
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

        {/* ---- SECCIÓN DEL BOOKMARKLET (colapsable) ---- */}
        <div className="border-t border-gray-200 pt-6">
          {/* Botón para expandir/contraer */}
          <button
            onClick={() => setShowBookmarklet(!showBookmarklet)}
            className="w-full text-left flex items-center justify-between text-gray-700 hover:text-gray-900"
          >
            <span className="font-medium">Configuración del Bookmarklet</span>
            <span className="text-xl">{showBookmarklet ? '−' : '+'}</span>
          </button>

          {/* Contenido del bookmarklet (solo visible si showBookmarklet es true) */}
          {showBookmarklet && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-gray-600">
                Arrastra este enlace a tu barra de marcadores, o copia el código de abajo:
              </p>

              {/* Enlace arrastrable del bookmarklet */}
              <a
                ref={bookmarkletRef}
                onClick={(e) => e.preventDefault()} // Evitar navegación al hacer clic
                className="block w-full text-center bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors cursor-grab"
                draggable
              >
                Compartir Enlace
              </a>

              {/* Código del bookmarklet visible para copiar manualmente */}
              <div className="bg-gray-100 rounded-lg p-3">
                <code className="text-xs text-gray-700 break-all block">
                  {bookmarkletCode}
                </code>
              </div>

              {/* Botón para copiar el código */}
              <button
                onClick={copyBookmarklet}
                className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                Copiar Código del Bookmarklet
              </button>

              {/* Instrucciones de uso */}
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

        {/* ---- FOOTER CON ENLACE A GITHUB ---- */}
        <div className="text-center pt-4 border-t border-gray-200">
          <a
            href="https://github.com/oscaretu/link-to-share"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm transition-colors"
          >
            {/* Icono de GitHub (SVG inline) */}
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            Ver en GitHub
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Componente Home exportado como default.
 *
 * Envuelve HomeContent en un Suspense boundary porque useSearchParams()
 * requiere suspense en Next.js App Router cuando se usa con static rendering.
 *
 * El fallback muestra un spinner mientras se carga el contenido.
 */
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
