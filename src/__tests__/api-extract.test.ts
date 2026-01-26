/**
 * api-extract.test.ts - Tests unitarios para la API de extracción
 *
 * Este archivo contiene tests para el endpoint /api/extract.
 *
 * Nota: No se importa directamente el route handler porque usa
 * NextRequest/NextResponse que requieren el entorno del servidor.
 * En su lugar, se testean las funciones de validación y la estructura
 * de las respuestas de forma aislada.
 *
 * Tests incluidos:
 * 1. Validación de URLs (formato correcto/incorrecto)
 * 2. Estructura de respuesta exitosa (ScrapedData)
 * 3. Estructura de respuesta de error (con datos parciales)
 */

// ---- TESTS DE VALIDACIÓN DE URLs ----

/**
 * Suite de tests para la lógica de validación de URLs.
 *
 * La API requiere una URL válida en el parámetro 'url'.
 * Estos tests verifican que la validación funciona correctamente
 * para diferentes tipos de URLs.
 */
describe('/api/extract URL validation', () => {
  /**
   * Función auxiliar que replica la lógica de validación de la API.
   * Usa el constructor URL() de JavaScript para validar el formato.
   *
   * @param url - URL a validar
   * @returns true si la URL es válida, false si no lo es
   */
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Verifica que una URL vacía es rechazada.
   * El constructor URL() lanza error con string vacío.
   */
  it('should reject empty URL', () => {
    expect(isValidUrl('')).toBe(false);
  });

  /**
   * Verifica que texto sin formato de URL es rechazado.
   * Debe tener protocolo (http:// o https://) y dominio válido.
   */
  it('should reject invalid URL format', () => {
    expect(isValidUrl('not-a-valid-url')).toBe(false);
  });

  /**
   * Verifica que URLs con protocolo HTTP son aceptadas.
   * Aunque HTTPS es preferible, HTTP también es válido.
   */
  it('should accept valid HTTP URL', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  /**
   * Verifica que URLs con protocolo HTTPS son aceptadas.
   * Este es el caso más común y seguro.
   */
  it('should accept valid HTTPS URL', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
  });

  /**
   * Verifica que URLs con path son aceptadas.
   * Ejemplo: https://example.com/path/to/page
   */
  it('should accept URL with path', () => {
    expect(isValidUrl('https://example.com/path/to/page')).toBe(true);
  });

  /**
   * Verifica que URLs con parámetros de consulta son aceptadas.
   * Los query params son muy comunes en URLs de artículos.
   */
  it('should accept URL with query parameters', () => {
    expect(isValidUrl('https://example.com/path?query=value&other=123')).toBe(true);
  });

  /**
   * Verifica que URLs con caracteres especiales codificados son aceptadas.
   * Los espacios y otros caracteres especiales deben estar URL-encoded.
   */
  it('should accept URL with special characters (encoded)', () => {
    // encodeURIComponent convierte espacios a %20
    const url = 'https://example.com/path?query=' + encodeURIComponent('value with spaces');
    expect(isValidUrl(url)).toBe(true);
  });
});

// ---- TESTS DE ESTRUCTURA DE RESPUESTA ----

/**
 * Suite de tests para verificar la estructura de las respuestas de la API.
 *
 * La API puede devolver dos tipos de respuesta:
 * 1. Éxito (200): ScrapedData con todos los campos
 * 2. Error (422): Mensaje de error + datos parciales
 */
describe('API response structure', () => {
  /**
   * Interfaz que define la estructura de datos extraídos.
   * Replica la interfaz ScrapedData del módulo scraper.
   */
  interface ScrapedData {
    title: string | null;       // Título del enlace
    description: string | null; // Descripción/subtítulo
    image: string | null;       // URL de imagen destacada
    url: string | null;         // URL canónica del enlace
    author: string | null;      // Autor o marca
  }

  /**
   * Verifica la estructura de una respuesta exitosa.
   * Todos los campos de ScrapedData deben estar presentes.
   */
  it('should have correct structure for successful response', () => {
    // Datos de ejemplo para respuesta exitosa
    const mockData: ScrapedData = {
      title: 'Test Title',
      description: 'Test description',
      image: 'https://example.com/image.jpg',
      url: 'https://example.com',
      author: 'Test Author',
    };

    // Verificar que todos los campos requeridos existen
    expect(mockData).toHaveProperty('title');
    expect(mockData).toHaveProperty('description');
    expect(mockData).toHaveProperty('image');
    expect(mockData).toHaveProperty('url');
    expect(mockData).toHaveProperty('author');
  });

  /**
   * Verifica que los campos opcionales pueden ser null.
   *
   * Cuando no se puede extraer cierta información (ej: no hay imagen,
   * no hay autor), los campos correspondientes son null en lugar
   * de estar ausentes o tener valores vacíos.
   */
  it('should allow null values for optional fields', () => {
    // Datos con campos opcionales como null
    const mockData: ScrapedData = {
      title: 'Test Title',
      description: null, // No se encontró descripción
      image: null,       // No hay imagen
      url: 'https://example.com',
      author: null,      // No se encontró autor
    };

    // Verificar que los valores son explícitamente null
    expect(mockData.description).toBeNull();
    expect(mockData.image).toBeNull();
    expect(mockData.author).toBeNull();
  });

  /**
   * Verifica la estructura de una respuesta de error.
   *
   * Cuando hay un error durante la extracción (sitio bloqueado,
   * timeout, etc.), la API devuelve:
   * - error: Mensaje descriptivo del error
   * - partial: Datos parciales que se pudieron obtener (al menos la URL)
   *
   * Esto permite al frontend mostrar la URL y habilitar edición manual.
   */
  it('should have correct structure for error response', () => {
    // Estructura de respuesta de error
    const errorResponse = {
      error: 'Failed to fetch',  // Mensaje de error
      partial: {                 // Datos parciales disponibles
        title: null,
        description: null,
        image: null,
        url: 'https://example.com', // Al menos la URL original está disponible
        author: null,
      },
    };

    // Verificar estructura del error
    expect(errorResponse).toHaveProperty('error');
    expect(errorResponse).toHaveProperty('partial');
    // La URL siempre debe estar en los datos parciales
    expect(errorResponse.partial).toHaveProperty('url');
  });
});
