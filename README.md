# Link to Share

Aplicación web que obtiene el título y subtítulo de una página web a partir de su URL, para compartirlos junto con el enlace en WhatsApp y Telegram.

## Características

- Extrae título, descripción, imagen y autor de cualquier URL
- Selector de formato: WhatsApp (`*negrita*`) o Telegram (`**negrita**`)
- Texto de salida con separadores visuales
- Bookmarklet para compartir desde cualquier página
- Edición manual de los campos extraídos
- Interfaz en español

## Requisitos

- Node.js 18 o superior
- npm

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/link-to-share.git
cd link-to-share

# Instalar dependencias
npm install
```

## Comandos

### Desarrollo

```bash
npm run dev
```

Inicia el servidor de desarrollo en `http://localhost:3000`.

### Producción

```bash
# Compilar la aplicación
npm run build

# Iniciar servidor de producción
npm start
```

### Tests

```bash
# Ejecutar tests una vez
npm test

# Ejecutar tests en modo watch
npm run test:watch
```

### Linting

```bash
npm run lint
```

## Uso

### Desde la web

1. Accede a `http://localhost:3000`
2. Introduce una URL en el campo de texto
3. Pulsa "Extraer datos del enlace"
4. Selecciona el formato (WhatsApp o Telegram)
5. Pulsa "Copiar Texto" y pega en tu app de mensajería

### Con parámetro URL

Puedes pasar la URL directamente:

```
http://localhost:3000/?url=https://ejemplo.com/articulo
```

### Bookmarklet

1. En la aplicación, expande "Configuración del Bookmarklet"
2. Arrastra el botón "Compartir Enlace" a tu barra de marcadores
3. En cualquier página web, pulsa el bookmarklet para abrir la aplicación con esa URL

## Estructura del proyecto

```
src/
├── app/
│   ├── api/
│   │   └── extract/
│   │       └── route.ts    # API de extracción
│   └── page.tsx            # Página principal
├── components/
│   └── PreviewCard.tsx     # Componente de previsualización
├── lib/
│   ├── scraper.ts          # Lógica de scraping
│   └── version.ts          # Versión de la app
└── __tests__/              # Tests
```

## Tecnologías

- [Next.js](https://nextjs.org/) - Framework React
- [Tailwind CSS](https://tailwindcss.com/) - Estilos
- [Metascraper](https://metascraper.js.org/) - Extracción de metadatos
- [Cheerio](https://cheerio.js.org/) - Parsing HTML
- [Jest](https://jestjs.io/) - Tests
- [React Testing Library](https://testing-library.com/react) - Tests de componentes

## Despliegue

La forma más sencilla de desplegar es usar [Vercel](https://vercel.com/):

```bash
npm install -g vercel
vercel
```

## Licencia

MIT
