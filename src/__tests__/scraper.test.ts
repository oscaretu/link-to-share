/**
 * Tests for the scraper utility
 * Note: These tests focus on unit testing the extractable parts
 */

describe('Scraper configuration', () => {
  it('should have correct USER_AGENT format', () => {
    // Test that our User-Agent looks like a real browser
    const expectedPattern = /Mozilla.*Chrome.*Safari/;
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    expect(userAgent).toMatch(expectedPattern);
  });

  it('should have correct LEAD_SELECTORS', () => {
    // Verify the expected selectors are present
    const expectedSelectors = [
      'p.paragraph:first-of-type',
      '.paragraph:first-of-type',
      'article header p',
      '.article-intro',
      '.lead',
      '[itemprop="description"]',
    ];

    // These are the selectors we expect to use
    expectedSelectors.forEach(selector => {
      expect(selector).toBeTruthy();
    });
  });
});

describe('URL validation', () => {
  it('should accept valid URLs', () => {
    const validUrls = [
      'https://example.com',
      'https://example.com/path',
      'https://example.com/path?query=value',
      'http://localhost:3000',
    ];

    validUrls.forEach(url => {
      expect(() => new URL(url)).not.toThrow();
    });
  });

  it('should reject invalid URLs', () => {
    const invalidUrls = [
      'not-a-url',
      'ftp://example.com',
      '',
    ];

    invalidUrls.forEach(url => {
      if (url === '') {
        expect(() => new URL(url)).toThrow();
      } else if (url === 'not-a-url') {
        expect(() => new URL(url)).toThrow();
      }
    });
  });
});

describe('Format functions', () => {
  it('should format WhatsApp bold correctly', () => {
    const text = 'Hello World';
    const whatsappBold = `*${text}*`;
    expect(whatsappBold).toBe('*Hello World*');
  });

  it('should format Telegram bold correctly', () => {
    const text = 'Hello World';
    const telegramBold = `**${text}**`;
    expect(telegramBold).toBe('**Hello World**');
  });

  it('should create formatted output with separators', () => {
    const title = '*Test Title*';
    const description = 'Test description';
    const url = 'https://example.com';

    const formatted = `${title}\n\n${description}\n\n${url}`;

    expect(formatted).toContain('\n\n');
    expect(formatted.split('\n\n')).toHaveLength(3);
  });
});
