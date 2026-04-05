// src/utils/url.ts
export class URLNormalizer {
  /**
   * Normalize URL to avoid duplicate crawling
   * https://Example.com/path/ and https://example.com/path → same
   */
  static normalize(rawUrl: string, baseUrl?: string): string | null {
    try {
      const url = new URL(rawUrl, baseUrl);

      // Only HTTP(S)
      if (!['http:', 'https:'].includes(url.protocol)) return null;

      // Remove fragment
      url.hash = '';

      // Remove trailing slash (except root)
      if (url.pathname !== '/' && url.pathname.endsWith('/')) {
        url.pathname = url.pathname.slice(0, -1);
      }

      // Lowercase hostname
      url.hostname = url.hostname.toLowerCase();

      // Sort query parameters for consistency
      const params = new URLSearchParams(url.searchParams);
      const sortedParams = new URLSearchParams([...params.entries()].sort());
      url.search = sortedParams.toString();

      // Remove default ports
      if (
        (url.protocol === 'https:' && url.port === '443') ||
        (url.protocol === 'http:' && url.port === '80')
      ) {
        url.port = '';
      }

      return url.toString();
    } catch {
      return null;
    }
  }

  static getDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  /**
   * Filter out non-content URLs
   */
  static isContentUrl(url: string): boolean {
    const skipExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp',
      '.pdf', '.zip', '.tar', '.gz',
      '.css', '.js', '.woff', '.woff2', '.ttf',
      '.mp3', '.mp4', '.avi', '.mov',
    ];

    const lowerUrl = url.toLowerCase();
    return !skipExtensions.some(ext => lowerUrl.endsWith(ext));
  }
}