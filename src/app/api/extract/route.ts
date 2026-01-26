/**
 * route.ts - API Route para extracción de metadatos de URLs
 *
 * Este endpoint recibe una URL como parámetro GET y devuelve los metadatos
 * extraídos (título, descripción, imagen, autor, URL canónica).
 *
 * Endpoint: GET /api/extract?url=<encoded_url>
 *
 * Respuestas:
 * - 200: Extracción exitosa, devuelve ScrapedData
 * - 400: URL no proporcionada o formato inválido
 * - 422: Error durante la extracción, devuelve error + datos parciales
 */

import { NextRequest, NextResponse } from 'next/server';
import { scrapeUrl, ScrapedData } from '@/lib/scraper';

/**
 * Handler para peticiones GET al endpoint /api/extract
 *
 * Flujo:
 * 1. Validar que se proporcionó el parámetro 'url'
 * 2. Validar que la URL tiene formato correcto
 * 3. Intentar extraer metadatos con scrapeUrl()
 * 4. Devolver datos extraídos o error con datos parciales
 *
 * @param request - Objeto NextRequest con los parámetros de la petición
 * @returns NextResponse con JSON de datos o error
 */
export async function GET(request: NextRequest) {
  // Obtener el parámetro 'url' de la query string
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  // Validación 1: El parámetro 'url' es obligatorio
  if (!url) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 } // Bad Request
    );
  }

  // Validación 2: La URL debe tener formato válido
  // Usamos el constructor URL() que lanza excepción si el formato es inválido
  try {
    new URL(url);
  } catch {
    return NextResponse.json(
      { error: 'Invalid URL format' },
      { status: 400 } // Bad Request
    );
  }

  // Intentar extraer los metadatos de la URL
  try {
    const data: ScrapedData = await scrapeUrl(url);
    // Éxito: devolver los datos extraídos
    return NextResponse.json(data);
  } catch (error) {
    // Error durante la extracción (sitio bloqueado, timeout, etc.)
    // Extraer mensaje de error de forma segura
    const message = error instanceof Error ? error.message : 'Failed to extract data from URL';

    // Devolver error junto con datos parciales
    // Esto permite al frontend mostrar al menos la URL original
    // y habilitar la edición manual de los campos
    return NextResponse.json(
      {
        error: message,
        partial: {
          title: null,
          description: null,
          image: null,
          url: url, // Al menos devolvemos la URL original
          author: null,
        }
      },
      { status: 422 } // Unprocessable Entity: la URL es válida pero no se pudo procesar
    );
  }
}
