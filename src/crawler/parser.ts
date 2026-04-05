// src/crawler/parser.ts
import * as cheerio from 'cheerio';
import { URLNormalizer } from '../utils/url.js';

export interface ParsedPage {
  title: string;
  textContent: string;
  links: string[];
  description: string;
}

export function parsePage(html: string, baseUrl: string): ParsedPage {
  const $ = cheerio.load(html);

  // Remove non-content elements
  $('script, style, nav, footer, header, aside, iframe, noscript').remove();
  $('[role="navigation"], [role="banner"], [role="complementary"]').remove();
  $('.sidebar, .nav, .menu, .footer, .header, .advertisement, .ad').remove();

  // Extract title
  const title = $('title').first().text().trim()
    || $('h1').first().text().trim()
    || '';

  // Extract meta description
  const description = $('meta[name="description"]').attr('content')?.trim() || '';

  // Extract main text content
  // Prioritize main content areas
  let textContent = '';
  const mainSelectors = ['main', 'article', '[role="main"]', '.content', '#content'];

  for (const selector of mainSelectors) {
    const mainEl = $(selector);
    if (mainEl.length > 0) {
      textContent = mainEl.text();
      break;
    }
  }

  // Fallback to body
  if (!textContent) {
    textContent = $('body').text();
  }

  // Clean up text
  textContent = textContent
    .replace(/\s+/g, ' ')        // collapse whitespace
    .replace(/\n+/g, ' ')        // remove newlines
    .trim();

  // Extract links
  const links: string[] = [];
  const seenLinks = new Set<string>();

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    if (!href) return;

    // Skip anchors, javascript, mailto
    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
      return;
    }

    const normalizedUrl = URLNormalizer.normalize(href, baseUrl);
    if (normalizedUrl && !seenLinks.has(normalizedUrl) && URLNormalizer.isContentUrl(normalizedUrl)) {
      seenLinks.add(normalizedUrl);
      links.push(normalizedUrl);
    }
  });

  return { title, textContent, links, description };
}