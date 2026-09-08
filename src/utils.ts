import { App, Notice, Setting, TFile, parseYaml } from 'obsidian';
import { WpProfile } from './wp-profile';
import { WordpressPluginSettings } from './plugin-settings';
import { MarkdownItMathJax3PluginInstance } from './markdown-it-mathjax3-plugin';
import { WordPressClientResult, WordPressClientReturnCode } from './wp-types';
import { isString } from 'lodash-es';
import { ERROR_NOTICE_TIMEOUT } from './consts';
import { format } from 'date-fns';
import { MatterData } from './types';
import { MarkdownItCommentPluginInstance } from './markdown-it-comment-plugin';

/**
 * Type alias for any - use sparingly and only when truly necessary
 * @deprecated Prefer specific types when possible
 */
export type SafeAny = any; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Open a URL in the default browser with optional query parameters
 * @param url - Base URL to open
 * @param queryParams - Optional query parameters to append
 */
export function openWithBrowser(url: string, queryParams: Record<string, undefined | number | string> = {}): void {
  const queryString = generateQueryString(queryParams);
  const fullUrl = queryString ? `${url}?${queryString}` : url;
  window.open(fullUrl);
}

/**
 * Generate URL query string from parameters object
 * Filters out undefined values automatically
 * @param params - Parameters to convert to query string
 * @returns URL-encoded query string
 */
export function generateQueryString(params: Record<string, undefined | number | string>): string {
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined)
  ) as Record<string, string>;

  return new URLSearchParams(filteredParams).toString();
}

/**
 * Type guard to check if a Promise.allSettled result is fulfilled
 * @param obj - Object to check
 * @returns True if the object is a fulfilled promise result
 */
export function isPromiseFulfilledResult<T>(obj: SafeAny): obj is PromiseFulfilledResult<T> {
  return !!obj && obj.status === 'fulfilled' && 'value' in obj;
}

/**
 * Configure markdown parser with plugin settings
 * @param settings - Plugin settings containing parser configuration
 */
export function setupMarkdownParser(settings: WordpressPluginSettings): void {
  MarkdownItMathJax3PluginInstance.updateOutputType(settings.mathJaxOutputType);
  MarkdownItCommentPluginInstance.updateConvertMode(settings.commentConvertMode);
}


/**
 * Render a WordPress profile as a Setting element
 * @param profile - WordPress profile to render
 * @param container - HTML container element
 * @returns Setting instance for further configuration
 */
export function rendererProfile(profile: WpProfile, container: HTMLElement): Setting {
  // Build profile name with default indicator
  let name = profile.name;
  if (profile.isDefault) {
    name += ' ✔️';
  }

  // Build profile description with authentication info
  let desc = profile.endpoint;
  if (profile.wpComOAuth2Token) {
    desc += ` / 🆔 / 🔒`;
  } else {
    if (profile.saveUsername) {
      desc += ` / 🆔 ${profile.username}`;
    }
    if (profile.savePassword) {
      desc += ' / 🔒 ******';
    }
  }

  return new Setting(container)
    .setName(name)
    .setDesc(desc);
}

/**
 * Validate if a string is a valid URL
 * @param url - String to validate
 * @returns True if the string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a unique multipart form boundary string
 * @returns Boundary string with timestamp
 */
export function getBoundary(): string {
  return `----obsidianBoundary${format(new Date(), 'yyyyMMddHHmmss')}`;
}

/**
 * Display error message to user and return error result
 * @param error - Error object, string, or unknown error
 * @returns WordPress client error result
 */
export function showError<T>(error: unknown): WordPressClientResult<T> {
  // Extract error message from various error types
  let errorMessage: string;
  if (isString(error)) {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    errorMessage = String(error);
  }

  // Show error notice to user
  new Notice(`❌ ${errorMessage}`, ERROR_NOTICE_TIMEOUT);

  // Return standardized error result
  return {
    code: WordPressClientReturnCode.Error as const,
    error: {
      code: WordPressClientReturnCode.Error,
      message: errorMessage,
    }
  };
}

/**
 * Process a file to extract content and frontmatter
 * @param file - Obsidian file to process
 * @param app - Obsidian app instance
 * @returns Object containing file content (without frontmatter) and frontmatter data
 */
export async function processFile(file: TFile, app: App): Promise<{ content: string; matter: MatterData; raw: string }> {
  const rawContent = await app.vault.read(file);
  const match = rawContent.match(/^\uFEFF?---[ \t]*\r?\n([\s\S]*?)^---[ \t]*(?:\r?\n|$)/m);
  const header = match?.index === 0 ? match : null;
  const parsed: unknown = header ? parseYaml(header[1]) : {};
  if (parsed !== null && (typeof parsed !== 'object' || Array.isArray(parsed))) {
    throw new Error('Frontmatter must be a YAML mapping.');
  }
  return {
    raw: rawContent,
    content: header ? rawContent.slice(header[0].length) : rawContent,
    matter: (parsed ?? {}) as MatterData
  };
}

/**
 * Sleep/delay utility for async operations
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the specified delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
