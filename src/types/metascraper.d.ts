/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'metascraper' {
  interface MetascraperOptions {
    html: string;
    url: string;
  }

  interface MetascraperResult {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    author?: string;
    [key: string]: string | undefined;
  }

  function metascraper(rules: any[]): (options: MetascraperOptions) => Promise<MetascraperResult>;

  export default metascraper;
}

declare module 'metascraper-title' {
  const metascraperTitle: () => any;
  export default metascraperTitle;
}

declare module 'metascraper-description' {
  const metascraperDescription: () => any;
  export default metascraperDescription;
}

declare module 'metascraper-image' {
  const metascraperImage: () => any;
  export default metascraperImage;
}

declare module 'metascraper-url' {
  const metascraperUrl: () => any;
  export default metascraperUrl;
}

declare module 'metascraper-author' {
  const metascraperAuthor: () => any;
  export default metascraperAuthor;
}
