import type WordpressPlugin from './main';
import { TagFormatter } from './tag-formatter';
import { TranslateKey } from './i18n';

/**
 * 预定义的标签颜色池 - 使用 CSS 变量以支持主题切换
 */
export const TAG_COLORS = [
  'var(--wp-tag-color-1)',
  'var(--wp-tag-color-2)',
  'var(--wp-tag-color-3)',
  'var(--wp-tag-color-4)',
  'var(--wp-tag-color-5)',
  'var(--wp-tag-color-6)',
  'var(--wp-tag-color-7)',
  'var(--wp-tag-color-8)',
  'var(--wp-tag-color-9)',
];

/**
 * 根据标签名称哈希分配颜色（确保同名标签颜色一致）
 */
export function getTagColor(tagName: string): string {
  const hash = tagName.split('').reduce((acc, char) =>
    acc + char.charCodeAt(0), 0);
  return TAG_COLORS[hash % TAG_COLORS.length];
}

export type DetectedLanguage = 'zh' | 'en' | 'other';

/**
 * 检测文本的主要语言
 */
export function detectLanguage(text: string): DetectedLanguage {
  if (!text || text.length < 10) return 'en';

  // 统计中文字符数量
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
  const chineseCount = chineseChars ? chineseChars.length : 0;

  // 统计英文字符数量
  const englishChars = text.match(/[a-zA-Z]/g);
  const englishCount = englishChars ? englishChars.length : 0;

  // 如果中文字符占比超过30%，认为是中文
  if (chineseCount > text.length * 0.3) {
    return 'zh';
  }

  // 如果英文字符占比超过40%，认为是英文
  if (englishCount > text.length * 0.4) {
    return 'en';
  }

  // 其他情况，默认英文
  return 'other';
}

export type PromptType = 'summary' | 'tags' | 'image';

/**
 * Get localized prompt based on language
 */
export function getLocalizedPrompt(
  plugin: WordpressPlugin,
  language: DetectedLanguage,
  type: PromptType
): string {
  // Check if user has custom prompt in settings
  if (type === 'summary' && plugin.settings.summaryPrompt) {
    return plugin.settings.summaryPrompt;
  } else if (type === 'tags' && plugin.settings.tagsPrompt) {
    return plugin.settings.tagsPrompt;
  } else if (type === 'image' && plugin.settings.imageGenerationPrompt) {
    return plugin.settings.imageGenerationPrompt;
  }

  // Use English prompts for English or other languages
  if (language === 'en' || language === 'other') {
    if (type === 'summary') {
      return plugin.t('defaultPrompt_summaryEn' as TranslateKey);
    } else if (type === 'tags') {
      return plugin.t('defaultPrompt_tagsEn' as TranslateKey);
    } else {
      return plugin.t('defaultPrompt_imageEn' as TranslateKey);
    }
  }

  // Use Chinese prompts for Chinese
  if (type === 'summary') {
    return plugin.t('defaultPrompt_summary' as TranslateKey);
  } else if (type === 'tags') {
    return plugin.t('defaultPrompt_tags' as TranslateKey);
  } else {
    return plugin.t('defaultPrompt_image' as TranslateKey);
  }
}

/**
 * 推断 URL 或 Content-Type 对应的 MIME 类型
 */
export function getMimeTypeFromResponse(contentType: string | null, url: string): string {
  if (contentType?.startsWith('image/')) {
    return contentType.split(';')[0];
  }

  // 从 URL 扩展名推断
  const ext = url.split('.').pop()?.toLowerCase()?.split('?')[0];
  return getMimeType(ext || 'jpg');
}

/**
 * 从 URL 提取文件名，无扩展名时回退到默认名
 */
export function extractFileName(url: string): string {
  const urlParts = url.split('/');
  const lastPart = urlParts[urlParts.length - 1]?.split('?')[0];
  return (lastPart && lastPart.includes('.')) ? lastPart : 'featured-image.jpg';
}

const MIME_TYPES: Record<string, string> = {
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
};

/**
 * 根据文件扩展名返回标准的图片 MIME 类型
 */
export function getMimeType(extension: string): string {
  return MIME_TYPES[extension.toLowerCase()] || 'image/jpeg';
}

/**
 * 格式化文件大小（B / KB / MB）
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * 中间截断文件名：保留前 prefixLen 个字符 + "..." + 后 suffixLen 个字符
 * 当字符串长度 <= prefixLen + suffixLen + 3 时原样返回
 * 默认 prefix=10, suffix=8 → 最长 21 字符（适合 header 有限宽度）
 */
export function truncateMiddle(str: string, prefixLen = 10, suffixLen = 8): string {
  if (str.length <= prefixLen + suffixLen + 3) return str;
  return str.slice(0, prefixLen) + '...' + str.slice(str.length - suffixLen);
}

/**
 * 将 tags 字段（YAML 数组 / 内联标签 / 逗号分隔字符串）规整为字符串数组
 */
export function normalizeTags(tags: unknown): string[] {
  return TagFormatter.parseToArray(tags as string[] | string | undefined);
}
