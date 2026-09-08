/**
 * @jest-environment jsdom
 *
 * Unit tests for the HTML sanitizer used before publishing to WordPress and
 * when rendering the local preview. Confirms script/event-handler payloads are
 * stripped while legitimate formatting/structure survives.
 */

import { describe, it, expect } from '@jest/globals';
import { sanitizeHtml } from '../../src/html-sanitizer';

describe('sanitizeHtml', () => {
  it('returns empty input unchanged', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('strips <script> tags', () => {
    const dirty = '<p>Hello</p><script>alert(1)</script>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).toContain('Hello');
  });

  it('removes inline event handlers', () => {
    const dirty = '<img src="x" onerror="alert(1)">';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('onerror');
  });

  it('removes javascript: URIs', () => {
    const dirty = '<a href="javascript:alert(1)">click</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean.toLowerCase()).not.toContain('javascript:');
  });

  it('keeps safe formatting and links', () => {
    const dirty = '<h2>Title</h2><p>Text with <strong>bold</strong> and <a href="https://example.com">a link</a>.</p>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<h2>');
    expect(clean).toContain('<strong>');
    expect(clean).toContain('href="https://example.com"');
  });

  it('forbids iframe / object / embed', () => {
    const dirty = '<iframe src="https://evil.com"></iframe><object data="x"></object>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<iframe');
    expect(clean).not.toContain('<object');
  });
});

it('fails closed when DOMPurify fails', () => {
  const purify = require('dompurify');
  const spy = jest.spyOn(purify, 'sanitize').mockImplementation(() => { throw new Error('broken'); });
  expect(() => sanitizeHtml('<script>bad()</script>')).toThrow('Publishing has been stopped');
  spy.mockRestore();
});
