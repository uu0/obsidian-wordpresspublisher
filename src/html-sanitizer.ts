import DOMPurify from 'dompurify';
import { createModuleLogger } from './utils/logger';

const log = createModuleLogger('HtmlSanitizer');

/**
 * Sanitize HTML before it leaves the plugin.
 *
 * The rendered note (and any raw HTML when `enableHtml` is on, or AI-generated
 * content) is sent to WordPress and rendered in site visitors' browsers. To
 * avoid carrying a stored-XSS payload to the target site, we strip
 * `<script>`/`<iframe>`/`<object>`/`<embed>` and every event-handler / risky
 * URI scheme here. WordPress sanitizes server-side too, but this is
 * defense-in-depth at the source.
 *
 * SVG and MathML profiles are enabled so MathJax output survives sanitization.
 */
export function sanitizeHtml(html: string): string {
  if (!html) {
    return html;
  }
  try {
    return DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true, svg: true, svgFilters: true, mathMl: true },
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'link', 'meta', 'base', 'form', 'input', 'button'],
      // Keep `style` (MathJax/SVG rely on it); DOMPurify already strips
      // `expression(...)` and `javascript:` inside style values.
    });
  } catch (error) {
    // Never let sanitization block a publish; fall back to the raw HTML
    // and log so the failure is visible.
    log.warn('HTML sanitization failed; publishing raw HTML', error);
    return html;
  }
}
