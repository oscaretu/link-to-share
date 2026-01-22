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

  type MetascraperRule = () => Record<string, unknown>;

  function metascraper(rules: MetascraperRule[]): (options: MetascraperOptions) => Promise<MetascraperResult>;

  export default metascraper;
}

declare module 'metascraper-title' {
  function metascraperTitle(): Record<string, unknown>;
  export default metascraperTitle;
}

declare module 'metascraper-description' {
  function metascraperDescription(): Record<string, unknown>;
  export default metascraperDescription;
}

declare module 'metascraper-image' {
  function metascraperImage(): Record<string, unknown>;
  export default metascraperImage;
}

declare module 'metascraper-url' {
  function metascraperUrl(): Record<string, unknown>;
  export default metascraperUrl;
}

declare module 'metascraper-author' {
  function metascraperAuthor(): Record<string, unknown>;
  export default metascraperAuthor;
}
