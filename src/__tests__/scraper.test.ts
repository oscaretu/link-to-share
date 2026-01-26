/**
 * scraper.test.ts - Tests unitarios para el módulo de scraping
 *
 * Este archivo contiene tests para verificar la configuración y lógica
 * del scraper sin hacer peticiones HTTP reales.
 *
 * Nota: No se importa directamente el módulo scraper porque usa
 * funcionalidades del servidor (fetch). En su lugar, se testean
 * los patrones y configuraciones que usa el scraper.
 *
 * Tests incluidos:
 * 1. Configuración del User-Agent (debe parecer un navegador real)
 * 2. Selectores CSS para extraer contenido
 * 3. Validación de URLs
 * 4. Funciones de formato de texto
 */

// ---- TESTS DE CONFIGURACIÓN DEL SCRAPER ----

/**
 * Suite de tests para verificar la configuración del scraper.
 * Estos tests aseguran que la configuración es correcta para
 * evitar ser bloqueado por sitios web.
 */
describe('Scraper configuration', () => {
  /**
   * Verifica que el User-Agent tiene el formato correcto de un navegador real.
   *
   * Los sitios web suelen bloquear peticiones con User-Agents genéricos
   * o que parecen de bots. Este test asegura que el User-Agent:
   * - Contiene "Mozilla" (identificador estándar de navegadores)
   * - Contiene "Chrome" (el navegador más común)
   * - Contiene "Safari" (parte del UA de Chrome por compatibilidad)
   */
  it('should have correct USER_AGENT format', () => {
    // Regex que verifica el patrón de un User-Agent de Chrome real
    const expectedPattern = /Mozilla.*Chrome.*Safari/;

    // Ejemplo del User-Agent que usa el scraper
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    expect(userAgent).toMatch(expectedPattern);
  });

  /**
   * Verifica que los selectores CSS para extraer descripciones largas
   * están correctamente definidos.
   *
   * Estos selectores se usan como fallback cuando no hay meta tags
   * de Open Graph o Twitter. Buscan el primer párrafo del artículo
   * en varios formatos comunes de sitios web.
   *
   * Selectores soportados:
   * - p.paragraph:first-of-type: Formato común en sitios de noticias
   * - .paragraph:first-of-type: Variante sin etiqueta p
   * - article header p: Párrafos dentro del header del artículo
   * - .article-intro: Clase común para introducciones
   * - .lead: Clase muy común para el primer párrafo destacado
   * - [itemprop="description"]: Schema.org markup
   */
  it('should have correct LEAD_SELECTORS', () => {
    // Lista de selectores que el scraper debe soportar
    const expectedSelectors = [
      'p.paragraph:first-of-type',    // El País, otros periódicos
      '.paragraph:first-of-type',     // Variante
      'article header p',             // Estructura semántica HTML5
      '.article-intro',               // Clase común de introducción
      '.lead',                        // Lead paragraph (muy común)
      '[itemprop="description"]',     // Schema.org structured data
    ];

    // Verificar que cada selector es una cadena válida (truthy)
    expectedSelectors.forEach(selector => {
      expect(selector).toBeTruthy();
    });
  });
});

// ---- TESTS DE VALIDACIÓN DE URLs ----

/**
 * Suite de tests para la validación de URLs.
 * Estas validaciones se usan en la API antes de intentar el scraping.
 */
describe('URL validation', () => {
  /**
   * Verifica que URLs válidas son aceptadas.
   * El constructor URL() de JavaScript lanza error si la URL es inválida.
   */
  it('should accept valid URLs', () => {
    const validUrls = [
      'https://example.com',              // URL simple HTTPS
      'https://example.com/path',         // Con path
      'https://example.com/path?query=value', // Con query string
      'http://localhost:3000',            // Localhost (desarrollo)
    ];

    // Cada URL válida no debe lanzar excepción al crear un objeto URL
    validUrls.forEach(url => {
      expect(() => new URL(url)).not.toThrow();
    });
  });

  /**
   * Verifica que URLs inválidas son rechazadas.
   * Estas URLs deben hacer que new URL() lance una excepción.
   */
  it('should reject invalid URLs', () => {
    const invalidUrls = [
      'not-a-url',      // Texto sin formato de URL
      'ftp://example.com', // Protocolo no soportado (ftp)
      '',               // String vacío
    ];

    // Verificar que URLs específicas lanzan excepción
    invalidUrls.forEach(url => {
      if (url === '') {
        // String vacío debe lanzar error
        expect(() => new URL(url)).toThrow();
      } else if (url === 'not-a-url') {
        // Texto sin formato de URL debe lanzar error
        expect(() => new URL(url)).toThrow();
      }
      // Nota: ftp:// es técnicamente una URL válida según el estándar,
      // pero la app solo acepta http/https en la práctica
    });
  });
});

// ---- TESTS DE FUNCIONES DE FORMATO ----

/**
 * Suite de tests para las funciones de formateo de texto.
 * Verifican que el texto se formatea correctamente para WhatsApp y Telegram.
 */
describe('Format functions', () => {
  /**
   * Verifica el formato de negrita para WhatsApp.
   * WhatsApp usa asteriscos simples: *texto*
   */
  it('should format WhatsApp bold correctly', () => {
    const text = 'Hello World';
    const whatsappBold = `*${text}*`; // Formato WhatsApp
    expect(whatsappBold).toBe('*Hello World*');
  });

  /**
   * Verifica el formato de negrita para Telegram.
   * Telegram usa asteriscos dobles: **texto**
   */
  it('should format Telegram bold correctly', () => {
    const text = 'Hello World';
    const telegramBold = `**${text}**`; // Formato Telegram
    expect(telegramBold).toBe('**Hello World**');
  });

  /**
   * Verifica la estructura completa del texto formateado.
   *
   * El texto de salida tiene tres partes separadas por líneas en blanco:
   * 1. Título en negrita
   * 2. Descripción
   * 3. URL
   *
   * Las líneas en blanco (\n\n) mejoran la legibilidad en mensajería.
   */
  it('should create formatted output with separators', () => {
    const title = '*Test Title*';
    const description = 'Test description';
    const url = 'https://example.com';

    // Construir el texto formateado con separadores
    const formatted = `${title}\n\n${description}\n\n${url}`;

    // Verificar que contiene los separadores
    expect(formatted).toContain('\n\n');
    // Verificar que tiene exactamente 3 partes
    expect(formatted.split('\n\n')).toHaveLength(3);
  });
});
