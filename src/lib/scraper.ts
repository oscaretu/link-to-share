/**
 * scraper.ts - Módulo de extracción de metadatos de URLs
 *
 * Este módulo proporciona funcionalidad para extraer información relevante
 * de páginas web (título, descripción, imagen, autor y URL canónica).
 *
 * Incluye extractores especializados para:
 * - YouTube: Usa la API oEmbed para evitar problemas de autenticación
 * - Amazon: Usa selectores específicos del DOM de Amazon (12 países soportados)
 * - Sitios genéricos: Usa metadatos Open Graph, Twitter Cards y meta tags estándar
 */

import * as cheerio from 'cheerio';

/**
 * Interfaz que define la estructura de los datos extraídos de una URL.
 * Todos los campos pueden ser null si no se encuentra la información.
 */
export interface ScrapedData {
  title: string | null;            // Título de la página o producto
  description: string | null;      // Descripción o resumen del contenido
  image: string | null;            // URL de la imagen principal o thumbnail
  url: string | null;              // URL canónica de la página
  author: string | null;           // Autor del artículo o marca del producto
  publicationDate: string | null;  // Fecha de publicación (para libros de Packt)
  pages: string | null;            // Número de páginas (para libros de Packt)
}

/**
 * User-Agent que simula un navegador Chrome moderno.
 * Esto es necesario porque muchos sitios bloquean requests de bots.
 */
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * URL base de la API de Microlink.
 * Microlink es un servicio gratuito que usa headless browsers para extraer
 * metadatos de URLs protegidas por Cloudflare u otras protecciones anti-bot.
 */
const MICROLINK_API = 'https://api.microlink.io';

/**
 * Headers HTTP que simulan una petición de navegador real.
 * Incluye headers Sec-Ch-Ua y Sec-Fetch-* que los navegadores modernos envían.
 * Esto ayuda a evitar bloqueos por detección de bots en sitios como Amazon.
 */
const BROWSER_HEADERS = {
  'User-Agent': USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'max-age=0',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  // Headers de Client Hints que Chrome envía
  'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  // Headers Sec-Fetch que indican el contexto de la petición
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
};

// ============================================================================
// FALLBACK CON MICROLINK API
// ============================================================================

/**
 * Extrae metadatos usando la API de Microlink como fallback.
 * Microlink usa headless browsers que pueden bypasear protecciones anti-bot
 * como Cloudflare. Se usa cuando el fetch directo falla con 403/429.
 *
 * @param targetUrl - URL de la página a analizar
 * @returns Datos extraídos o null si Microlink también falla
 */
async function extractWithMicrolink(targetUrl: string): Promise<ScrapedData | null> {
  try {
    const response = await fetch(`${MICROLINK_API}?url=${encodeURIComponent(targetUrl)}`);
    if (!response.ok) {
      return null;
    }

    const json = await response.json();
    if (json.status !== 'success' || !json.data) {
      return null;
    }

    const data = json.data;
    return {
      title: data.title || null,
      description: data.description || null,
      // Usar imagen, o logo del sitio como fallback
      image: data.image?.url || data.logo?.url || null,
      url: data.url || targetUrl,
      author: data.author || data.publisher || null,
      publicationDate: null,
      pages: null,
    };
  } catch {
    return null;
  }
}

// ============================================================================
// EXTRACTOR DE YOUTUBE
// ============================================================================

/**
 * Comprueba si una URL pertenece a YouTube.
 * Soporta tanto youtube.com como youtu.be (enlaces cortos).
 *
 * @param url - URL a comprobar
 * @returns true si es una URL de YouTube, false en caso contrario
 */
function isYouTubeUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    // Coincide con youtube.com, www.youtube.com y youtu.be
    return /^(www\.)?(youtube\.com|youtu\.be)$/i.test(hostname);
  } catch {
    // Si la URL es inválida, retorna false
    return false;
  }
}

/**
 * Extrae datos de un vídeo de YouTube usando la API oEmbed.
 *
 * La API oEmbed es pública y no requiere autenticación, lo que la hace
 * ideal para servidores donde no hay sesión de usuario de YouTube.
 * Esta es la solución al problema de que YouTube devuelve páginas
 * genéricas cuando detecta peticiones sin cookies de sesión.
 *
 * @param originalUrl - URL del vídeo de YouTube
 * @returns Datos del vídeo (título, autor, thumbnail)
 */
async function extractYouTubeData(originalUrl: string): Promise<ScrapedData> {
  // Construir URL de la API oEmbed de YouTube
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(originalUrl)}&format=json`;

  try {
    const response = await fetch(oembedUrl);
    if (!response.ok) {
      throw new Error('oEmbed request failed');
    }

    const data = await response.json();

    // Extraer el ID del vídeo para construir URL de thumbnail en alta resolución
    // Funciona tanto con youtube.com/watch?v=ID como con youtu.be/ID
    const videoIdMatch = originalUrl.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;

    // Usar maxresdefault.jpg para obtener la mejor calidad de thumbnail
    // Si no se puede extraer el ID, usar el thumbnail que devuelve oEmbed
    const maxResThumbnail = videoId
      ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
      : data.thumbnail_url;

    return {
      title: data.title || null,
      description: null, // La API oEmbed no proporciona descripción del vídeo
      image: maxResThumbnail,
      url: originalUrl, // Mantener la URL original del usuario
      author: data.author_name || null, // Nombre del canal de YouTube
      publicationDate: null,
      pages: null,
    };
  } catch {
    // Si falla la API oEmbed, retornar datos mínimos con la URL original
    return {
      title: null,
      description: null,
      image: null,
      url: originalUrl,
      author: null,
      publicationDate: null,
      pages: null,
    };
  }
}

// ============================================================================
// EXTRACTOR DE TWITTER/X
// ============================================================================

/**
 * Comprueba si una URL pertenece a Twitter o X.
 * Soporta tanto twitter.com como x.com.
 *
 * @param url - URL a comprobar
 * @returns true si es una URL de Twitter/X, false en caso contrario
 */
function isTwitterUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return /^(www\.)?(twitter\.com|x\.com)$/i.test(hostname);
  } catch {
    return false;
  }
}

/**
 * Extrae datos de un tweet usando la API de fxtwitter.com.
 *
 * Twitter/X requiere autenticación para ver tweets, por lo que las peticiones
 * desde el servidor devuelven una página de login. fxtwitter es un servicio
 * público que proporciona los datos del tweet en formato JSON.
 *
 * Fallback: si fxtwitter falla, se intenta la API oEmbed de Twitter.
 *
 * @param originalUrl - URL del tweet
 * @returns Datos del tweet (texto, autor, imagen)
 */
async function extractTwitterData(originalUrl: string): Promise<ScrapedData> {
  // Extraer usuario y ID del tweet de la URL
  // Formato: https://x.com/usuario/status/1234567890
  const tweetMatch = originalUrl.match(/(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/);

  if (tweetMatch) {
    const [, user, tweetId] = tweetMatch;
    try {
      // fxtwitter API devuelve datos completos del tweet en JSON
      const fxResponse = await fetch(`https://api.fxtwitter.com/${user}/status/${tweetId}`);
      if (fxResponse.ok) {
        const fxData = await fxResponse.json();
        const tweet = fxData.tweet;
        if (tweet) {
          // Buscar la primera imagen del tweet si existe
          let image: string | null = null;
          if (tweet.media?.photos?.length > 0) {
            image = tweet.media.photos[0].url;
          } else if (tweet.media?.videos?.length > 0) {
            image = tweet.media.videos[0].thumbnail_url;
          }

          return {
            title: tweet.author?.name || tweet.author?.screen_name || null,
            description: tweet.text || null,
            image,
            url: originalUrl,
            author: tweet.author?.screen_name ? `@${tweet.author.screen_name}` : null,
            publicationDate: null,
            pages: null,
          };
        }
      }
    } catch {
      // Si fxtwitter falla, continuar al fallback
    }
  }

  // Fallback: API oEmbed de Twitter (proporciona menos datos pero es oficial)
  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(originalUrl)}`;
    const response = await fetch(oembedUrl);
    if (response.ok) {
      const data = await response.json();
      // El HTML de oEmbed contiene el texto del tweet en un <blockquote>
      const htmlContent = data.html || '';
      const $oembed = cheerio.load(htmlContent);
      const tweetText = $oembed('blockquote p').text().trim();

      return {
        title: data.author_name || null,
        description: tweetText || null,
        image: null, // oEmbed de Twitter no proporciona imagen
        url: data.url || originalUrl,
        author: data.author_name || null,
        publicationDate: null,
        pages: null,
      };
    }
  } catch {
    // Si ambos métodos fallan, retornar datos mínimos
  }

  return {
    title: null,
    description: null,
    image: null,
    url: originalUrl,
    author: null,
    publicationDate: null,
    pages: null,
  };
}

// ============================================================================
// EXTRACTOR DE PACKT (Free Learning)
// ============================================================================

/**
 * Comprueba si una URL es la página de Free Learning de Packt.
 *
 * @param url - URL a comprobar
 * @returns true si es la página de free-learning de Packt
 */
function isPacktFreeLearningUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return /^(www\.)?packtpub\.com$/i.test(urlObj.hostname) &&
           urlObj.pathname.includes('free-learning');
  } catch {
    return false;
  }
}

/**
 * Extrae datos del libro gratuito del día de Packt.
 *
 * La página de free-learning tiene og:image vacío porque la imagen
 * del libro se carga dinámicamente. Esta función extrae los datos
 * directamente del DOM usando selectores específicos.
 *
 * @param $ - Instancia de Cheerio con el HTML parseado
 * @param originalUrl - URL original
 * @returns Datos del libro del día
 */
function extractPacktData($: cheerio.CheerioAPI, originalUrl: string): ScrapedData {
  // Imagen del libro del día
  const image = $('.product-info__image img.product-image').first().attr('src') ||
                $('.main-product img.product-image').first().attr('src') || null;

  // Título del libro (limpiar prefijo "Free eBook - " si existe)
  const titleRaw = $('.product-info__title').first().text().trim() ||
                   $('.main-product .product-info__title').first().text().trim() || null;
  const title = titleRaw ? titleRaw.replace(/^Free eBook\s*-\s*/i, '') : null;

  // Autor del libro
  const authorText = $('.product-info__author.free_learning__author').first().text().trim() ||
                     $('.main-product .product-info__author').first().text().trim();
  const author = authorText.replace(/^By\s+/i, '').trim() || null;

  // Descripción del libro
  const description = $('.free_learning__product_description span').first().text().trim() ||
                      $('.main-product .product-info__description').first().text().trim() ||
                      $('meta[name="description"]').attr('content') || null;

  // Fecha de publicación
  const pubDateRaw = $('.free_learning__product_pages_date span').first().text().trim();
  const publicationDate = pubDateRaw.replace(/^Publication date:\s*/i, '').trim() || null;

  // Número de páginas
  const pagesRaw = $('.free_learning__product_pages span').first().text().trim();
  const pages = pagesRaw.replace(/^Pages:\s*/i, '').trim() || null;

  return {
    title,
    description,
    image,
    url: $('link[rel="canonical"]').attr('href') || originalUrl,
    author,
    publicationDate,
    pages,
  };
}

// ============================================================================
// EXTRACTOR DE AMAZON
// ============================================================================

/**
 * Comprueba si una URL pertenece a Amazon.
 * Soporta 12 dominios de Amazon en diferentes países.
 *
 * @param url - URL a comprobar
 * @returns true si es una URL de Amazon, false en caso contrario
 */
function isAmazonUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    // Lista de dominios de Amazon soportados:
    // .com (USA), .es (España), .co.uk (UK), .de (Alemania), .fr (Francia),
    // .it (Italia), .ca (Canadá), .com.mx (México), .com.br (Brasil),
    // .co.jp (Japón), .in (India), .com.au (Australia)
    return /^(www\.)?amazon\.(com|es|co\.uk|de|fr|it|ca|com\.mx|com\.br|co\.jp|in|com\.au)$/i.test(hostname) ||
           /\.amazon\.(com|es|co\.uk|de|fr|it|ca|com\.mx|com\.br|co\.jp|in|com\.au)$/i.test(hostname);
  } catch {
    return false;
  }
}

/**
 * Extrae datos de una página de producto de Amazon.
 *
 * Amazon tiene una estructura de DOM específica que difiere de los
 * metadatos estándar Open Graph. Esta función usa selectores CSS
 * específicos de Amazon para extraer:
 * - Título del producto
 * - Autor (para libros) o Marca (para productos)
 * - Descripción del libro o características del producto
 * - Imagen del producto en la mejor resolución disponible
 *
 * @param $ - Instancia de Cheerio con el HTML parseado
 * @param originalUrl - URL original para usar como fallback
 * @returns Datos del producto de Amazon
 */
function extractAmazonData($: cheerio.CheerioAPI, originalUrl: string): ScrapedData {
  // ---- EXTRACCIÓN DEL TÍTULO ----
  // Primero intentar #productTitle (productos físicos) o #ebooksProductTitle (ebooks)
  let title: string | null = $('#productTitle').text().trim() || $('#ebooksProductTitle').text().trim() || null;
  if (!title) {
    // Fallback: usar meta title y tomar solo la primera parte (antes de ":")
    title = $('meta[name="title"]').attr('content')?.split(':')[0]?.trim() || null;
  }

  // ---- EXTRACCIÓN DEL AUTOR/MARCA ----
  // Para libros: buscar en #bylineInfo con clase .author
  let author = $('#bylineInfo .author a').first().text().trim();
  if (!author) {
    author = $('#bylineInfo a.contributorNameID').first().text().trim();
  }
  if (!author) {
    author = $('span.author a').first().text().trim();
  }

  // Para productos: extraer marca del texto "Visit the X Store" en diferentes idiomas
  if (!author) {
    const bylineText = $('#bylineInfo').text().trim();
    // Patrones para diferentes idiomas
    const brandMatchEn = bylineText.match(/Visit the (.+?) Store/i);        // Inglés
    const brandMatchEs = bylineText.match(/Visita la tienda de (.+)/i);     // Español
    const brandMatchFr = bylineText.match(/Visiter la boutique (.+)/i);     // Francés
    const brandMatchDe = bylineText.match(/Besuche den (.+?)[-\s]Store/i);  // Alemán

    const brandMatch = brandMatchEn || brandMatchEs || brandMatchFr || brandMatchDe;
    if (brandMatch) {
      author = brandMatch[1].trim();
    }
  }

  // Último fallback: limpiar el texto del enlace de marca
  if (!author) {
    let linkText = $('#bylineInfo a').first().text().trim();
    // Eliminar prefijos y sufijos comunes en todos los idiomas
    linkText = linkText
      .replace(/^Visit the\s+/i, '')
      .replace(/^Visita la tienda de\s+/i, '')
      .replace(/^Visiter la boutique\s+/i, '')
      .replace(/^Besuche den\s+/i, '')
      .replace(/\s+Store$/i, '')
      .replace(/[-\s]Store$/i, '');
    if (linkText && linkText.length < 50) {
      author = linkText;
    }
  }

  // ---- EXTRACCIÓN DE LA DESCRIPCIÓN ----
  let description = '';

  // Lista de selectores para la descripción del libro (en orden de prioridad)
  const descSelectors = [
    '#bookDescription_feature_div .a-expander-content', // Descripción expandible de libros
    '#bookDescription .a-expander-content',
    '[data-a-expander-name="book_description_expander"] .a-expander-content',
    '#bookDescription_feature_div',
    '#bookDescription',
  ];

  // Intentar cada selector hasta encontrar contenido
  for (const selector of descSelectors) {
    const descDiv = $(selector);
    if (descDiv.length) {
      // Preferir extraer texto de párrafos individuales
      const paragraphs: string[] = [];
      descDiv.find('p').each((_, el) => {
        const text = $(el).text().trim();
        if (text) paragraphs.push(text);
      });

      if (paragraphs.length > 0) {
        description = paragraphs.join(' ');
        break;
      }

      // Fallback: usar todo el texto del contenedor
      const fullText = descDiv.text().trim();
      if (fullText && fullText.length > 50) {
        description = fullText;
        break;
      }
    }
  }

  // Para productos no-libro: intentar #productDescription
  if (!description) {
    description = $('#productDescription p').text().trim();
  }

  // Para electrónica y otros: usar los "feature bullets" (lista de características)
  if (!description) {
    const bullets: string[] = [];
    $('#feature-bullets ul li span.a-list-item').each((_, el) => {
      const text = $(el).text().trim();
      // Excluir disclaimers legales
      if (text && !text.includes('LEGAL DISCLAIMER')) {
        bullets.push(text);
      }
    });
    if (bullets.length > 0) {
      // Tomar solo las primeras 3 características como descripción
      description = bullets.slice(0, 3).join(' ');
    }
  }

  // Último recurso: meta description (solo si no parece ser texto genérico)
  if (!description) {
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    if (metaDesc && !metaDesc.includes('Amazon.es') && metaDesc.length > 50) {
      description = metaDesc;
    }
  }

  // Truncar descripción si es muy larga
  if (description.length > 500) {
    description = description.substring(0, 497) + '...';
  }

  // ---- EXTRACCIÓN DE LA IMAGEN ----
  let image: string | null = null;

  // Amazon almacena múltiples resoluciones en el atributo data-a-dynamic-image como JSON
  const imgElement = $('#landingImage, #imgBlkFront, #ebooksImgBlkFront').first();
  const dynamicImageData = imgElement.attr('data-a-dynamic-image');

  if (dynamicImageData) {
    try {
      // Parsear el JSON que contiene {url: [ancho, alto], ...}
      const imageObj = JSON.parse(dynamicImageData);
      const imageUrls = Object.keys(imageObj);

      if (imageUrls.length > 0) {
        // Encontrar la imagen con mayor resolución (mayor área)
        let maxSize = 0;
        for (const url of imageUrls) {
          const dims = imageObj[url];
          const size = dims[0] * dims[1]; // ancho * alto
          if (size > maxSize) {
            maxSize = size;
            image = url;
          }
        }
      }
    } catch {
      // Si falla el parseo, usar el atributo src normal
      image = imgElement.attr('src') || null;
    }
  } else {
    image = imgElement.attr('src') || null;
  }

  // Fallback: usar og:image si no se encontró imagen del producto
  if (!image) {
    image = $('meta[property="og:image"]').attr('content') || null;
  }

  // ---- URL CANÓNICA ----
  const canonical = $('link[rel="canonical"]').attr('href') || originalUrl;

  return {
    title: title || null,
    description: description || null,
    image,
    url: canonical,
    author: author || null,
    publicationDate: null,
    pages: null,
  };
}

// ============================================================================
// EXTRACTOR GENÉRICO (Open Graph, Twitter Cards, meta tags)
// ============================================================================

/**
 * Lista de selectores CSS para encontrar el párrafo introductorio de un artículo.
 * Se prueban en orden de prioridad hasta encontrar contenido válido.
 * Incluye selectores comunes en sitios de noticias españoles e internacionales.
 */
const LEAD_SELECTORS = [
  'p.paragraph:first-of-type',
  '.paragraph:first-of-type',
  'article header p',
  '.article-intro',
  '.article__intro',
  '.article-lead',
  '.article__lead',
  '.lead',
  '.intro',
  '.subtitle',
  '.article-subtitle',
  '.article__subtitle',
  '.entradilla',              // Común en medios españoles
  '.sumario',                 // Común en medios españoles
  '.excerpt',
  '[itemprop="description"]', // Schema.org
  '[itemprop="articleBody"] > p:first-of-type',
  'article > p:first-of-type',
  '.content > p:first-of-type',
  '.article-body > p:first-of-type',
  '.article__body > p:first-of-type',
  '.story-body > p:first-of-type',
  '.post-content > p:first-of-type',
];

/**
 * Extrae el título de la página usando diferentes fuentes de metadatos.
 * Orden de prioridad: Open Graph > Twitter > <title> > <h1>
 *
 * @param $ - Instancia de Cheerio con el HTML parseado
 * @returns Título de la página o null si no se encuentra
 */
function extractTitle($: cheerio.CheerioAPI): string | null {
  // 1. Open Graph title (usado por Facebook, LinkedIn, etc.)
  const ogTitle = $('meta[property="og:title"]').attr('content');
  if (ogTitle) return ogTitle.trim();

  // 2. Twitter Card title
  const twitterTitle = $('meta[name="twitter:title"]').attr('content');
  if (twitterTitle) return twitterTitle.trim();

  // 3. Etiqueta <title> estándar
  const title = $('title').text();
  if (title) return title.trim();

  // 4. Primer <h1> de la página
  const h1 = $('h1').first().text();
  if (h1) return h1.trim();

  return null;
}

/**
 * Extrae la descripción de la página desde metadatos.
 * Orden de prioridad: Open Graph > Twitter > meta description
 *
 * @param $ - Instancia de Cheerio con el HTML parseado
 * @returns Descripción de la página o null si no se encuentra
 */
function extractDescription($: cheerio.CheerioAPI): string | null {
  // 1. Open Graph description
  const ogDesc = $('meta[property="og:description"]').attr('content');
  if (ogDesc) return ogDesc.trim();

  // 2. Twitter Card description
  const twitterDesc = $('meta[name="twitter:description"]').attr('content');
  if (twitterDesc) return twitterDesc.trim();

  // 3. Meta description estándar
  const metaDesc = $('meta[name="description"]').attr('content');
  if (metaDesc) return metaDesc.trim();

  return null;
}

/**
 * Intenta encontrar una descripción más larga en el contenido del artículo.
 * Útil cuando la meta description es muy corta o genérica.
 *
 * @param $ - Instancia de Cheerio con el HTML parseado
 * @param metaDescription - Descripción de metadatos para comparar longitud
 * @returns Descripción larga del artículo o null si no es mejor que la meta
 */
function extractLongDescription($: cheerio.CheerioAPI, metaDescription: string | null): string | null {
  // Probar cada selector en orden de prioridad
  for (const selector of LEAD_SELECTORS) {
    const element = $(selector).first();
    if (element.length) {
      const text = element.text().trim();
      // Solo usar si tiene longitud razonable y es más largo que la meta description
      if (text.length > 50 && (!metaDescription || text.length > metaDescription.length)) {
        return text;
      }
    }
  }
  return null;
}

/**
 * Extrae la imagen principal de la página.
 * Orden de prioridad: Open Graph > Twitter > primera imagen del artículo
 *
 * @param $ - Instancia de Cheerio con el HTML parseado
 * @returns URL de la imagen o null si no se encuentra
 */
function extractImage($: cheerio.CheerioAPI): string | null {
  // 1. Open Graph image (la más común para compartir)
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage) return ogImage;

  // 2. Twitter Card image
  const twitterImage = $('meta[name="twitter:image"]').attr('content');
  if (twitterImage) return twitterImage;

  // 3. Primera imagen dentro de un <article>
  const articleImage = $('article img').first().attr('src');
  if (articleImage) return articleImage;

  return null;
}

/**
 * Extrae el autor del contenido.
 * Busca en metadatos Open Graph, meta tags y elementos comunes del DOM.
 *
 * @param $ - Instancia de Cheerio con el HTML parseado
 * @returns Nombre del autor o null si no se encuentra
 */
function extractAuthor($: cheerio.CheerioAPI): string | null {
  // 1. Open Graph article:author
  const ogAuthor = $('meta[property="article:author"]').attr('content');
  if (ogAuthor) return ogAuthor.trim();

  // 2. Meta author estándar
  const metaAuthor = $('meta[name="author"]').attr('content');
  if (metaAuthor) return metaAuthor.trim();

  // 3. Schema.org itemprop="author"
  const schemaAuthor = $('[itemprop="author"]').first().text();
  if (schemaAuthor) return schemaAuthor.trim();

  // 4. Selectores CSS comunes para bylines de autor
  const authorSelectors = ['.author', '.byline', '.author-name', '[rel="author"]'];
  for (const selector of authorSelectors) {
    const author = $(selector).first().text();
    if (author) return author.trim();
  }

  return null;
}

/**
 * Extrae la URL canónica de la página.
 * La URL canónica es la versión "oficial" de la URL que el sitio prefiere.
 *
 * @param $ - Instancia de Cheerio con el HTML parseado
 * @param originalUrl - URL original como fallback
 * @returns URL canónica o la URL original si no se encuentra
 */
function extractCanonicalUrl($: cheerio.CheerioAPI, originalUrl: string): string {
  // 1. Enlace canónico explícito
  const canonical = $('link[rel="canonical"]').attr('href');
  if (canonical) return canonical;

  // 2. Open Graph URL
  const ogUrl = $('meta[property="og:url"]').attr('content');
  if (ogUrl) return ogUrl;

  // 3. Usar la URL original proporcionada
  return originalUrl;
}

// ============================================================================
// FUNCIÓN PRINCIPAL DE SCRAPING
// ============================================================================

/**
 * Función principal que extrae metadatos de cualquier URL.
 *
 * El proceso es:
 * 1. Detectar si es YouTube -> usar API oEmbed
 * 2. Si no, hacer fetch del HTML con headers de navegador
 * 3. Detectar si es Amazon -> usar extractor especializado
 * 4. Si no, usar extractor genérico (Open Graph, Twitter, meta tags)
 *
 * @param targetUrl - URL de la página a analizar
 * @returns Datos extraídos de la página
 * @throws Error si no se puede acceder a la URL
 */
export async function scrapeUrl(targetUrl: string): Promise<ScrapedData> {
  // Caso especial: YouTube
  // Usamos oEmbed porque YouTube bloquea peticiones de servidores sin sesión
  if (isYouTubeUrl(targetUrl)) {
    return extractYouTubeData(targetUrl);
  }

  // Caso especial: Twitter/X
  // Twitter requiere autenticación, usamos fxtwitter API como proxy
  if (isTwitterUrl(targetUrl)) {
    return extractTwitterData(targetUrl);
  }

  // Hacer petición HTTP con headers que simulan un navegador real
  const response = await fetch(targetUrl, {
    headers: BROWSER_HEADERS,
  });

  // Parsear el HTML con Cheerio incluso si la respuesta no es 200,
  // ya que algunos sitios (ej. con anti-bot) devuelven contenido útil
  // en respuestas 403/429
  const html = await response.text();
  const $ = cheerio.load(html);

  // Si la respuesta no fue exitosa, intentar extraer metadatos del HTML recibido.
  // Si no hay datos útiles, usar Microlink como fallback (puede bypasear Cloudflare).
  if (!response.ok) {
    const title = extractTitle($);
    const description = extractDescription($);
    const image = extractImage($);

    // Detectar páginas de challenge de Cloudflare u otras protecciones anti-bot
    // Estos títulos genéricos indican que no tenemos el contenido real
    const isChallengePage = title && /^(just a moment|attention required|please wait|checking your browser|one more step)/i.test(title);

    if (!isChallengePage && (title || description || image)) {
      return {
        title,
        description,
        image,
        url: extractCanonicalUrl($, targetUrl),
        author: extractAuthor($),
        publicationDate: null,
        pages: null,
      };
    }

    // Fallback: usar Microlink API para sitios protegidos por Cloudflare/anti-bot
    const microlinkData = await extractWithMicrolink(targetUrl);
    if (microlinkData && (microlinkData.title || microlinkData.description)) {
      return microlinkData;
    }

    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  // Caso especial: Packt Free Learning
  // La imagen del libro del día no está en og:image, hay que extraerla del DOM
  if (isPacktFreeLearningUrl(targetUrl)) {
    return extractPacktData($, targetUrl);
  }

  // Caso especial: Amazon
  // Amazon tiene estructura de DOM propia que no usa Open Graph correctamente
  if (isAmazonUrl(targetUrl)) {
    return extractAmazonData($, targetUrl);
  }

  // Caso genérico: usar metadatos estándar
  const metaDescription = extractDescription($);
  const longDescription = extractLongDescription($, metaDescription);

  return {
    title: extractTitle($),
    // Preferir descripción larga del artículo si está disponible
    description: longDescription || metaDescription,
    image: extractImage($),
    url: extractCanonicalUrl($, targetUrl),
    author: extractAuthor($),
    publicationDate: null,
    pages: null,
  };
}
