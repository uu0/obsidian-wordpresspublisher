import { pinyin } from 'pinyin-pro';
import { Logger } from './utils/logger';

const logger = Logger.getInstance();

/**
 * SlugGenerator - 生成和清理 URL slug
 * 
 * 提供中文转拼音、英文转 slug、智能检测、验证和清理功能
 */
export class SlugGenerator {
  /**
   * 清理 slug 字符串（私有公共方法）
   * 
   * 统一的清理逻辑：
   * 1. 转换为小写
   * 2. 移除特殊字符（保留字母、数字、空格、连字符）
   * 3. 空格转连字符
   * 4. 合并多个连字符
   * 5. 移除首尾连字符
   * 
   * @param text - 待清理的文本
   * @returns 清理后的 slug
   */
  private static normalizeSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // 移除特殊字符
      .replace(/\s+/g, '-') // 空格转连字符
      .replace(/-+/g, '-') // 多个连字符合并为一个
      .replace(/^-+|-+$/g, ''); // 移除首尾连字符
  }

  /**
   * 将中文标题转换为拼音 slug
   * 
   * @param title - 中文标题
   * @returns 拼音 slug（例如："减脂食谱" -> "jian-zhi-shi-pu"）
   * 
   * @example
   * ```ts
   * const slug = SlugGenerator.chineseToSlug('减脂食谱');
   * console.log(slug); // 'jian-zhi-shi-pu'
   * ```
   */
  static chineseToSlug(title: string): string {
    if (!title) {
      logger.debug('SlugGenerator', 'Empty title provided for Chinese slug generation');
      return '';
    }

    logger.debug('SlugGenerator', `Converting Chinese title to slug: ${title}`);

    // 分段处理：分离中文和数字
    const segments: string[] = [];
    let currentSegment = '';
    let isNumber = false;

    for (let i = 0; i < title.length; i++) {
      const char = title[i];
      const charIsNumber = /\d/.test(char);

      if (charIsNumber !== isNumber && currentSegment) {
        // 类型切换，保存当前段
        segments.push(currentSegment);
        currentSegment = '';
      }

      currentSegment += char;
      isNumber = charIsNumber;
    }

    if (currentSegment) {
      segments.push(currentSegment);
    }

    // 转换每个段：数字保持原样，其他转拼音
    const convertedSegments = segments.map(segment => {
      if (/^\d+$/.test(segment)) {
        // 纯数字段，直接返回
        return segment;
      } else {
        // 包含中文或其他字符，转拼音
        const pinyinText = pinyin(segment, {
          toneType: 'none',
          type: 'array'
        });
        return (Array.isArray(pinyinText) ? pinyinText : [pinyinText]).join('-');
      }
    });

    // 合并所有段
    const pinyinStr = convertedSegments.join('-');

    // 清理 slug
    const slug = this.normalizeSlug(pinyinStr);

    logger.debug('SlugGenerator', `Generated Chinese slug: ${slug}`);
    return slug;
  }

  /**
   * 将英文标题转换为 slug
   * 
   * @param title - 英文标题
   * @returns 清理后的 slug（例如："Hello World" -> "hello-world"）
   * 
   * @example
   * ```ts
   * const slug = SlugGenerator.englishToSlug('Hello World');
   * console.log(slug); // 'hello-world'
   * ```
   */
  static englishToSlug(title: string): string {
    if (!title) {
      logger.debug('SlugGenerator', 'Empty title provided for English slug generation');
      return '';
    }

    logger.debug('SlugGenerator', `Converting English title to slug: ${title}`);
    const slug = this.normalizeSlug(title);
    logger.debug('SlugGenerator', `Generated English slug: ${slug}`);
    return slug;
  }

  /**
   * 智能生成 slug（自动检测中英文）
   * 
   * 通过正则表达式检测是否包含中文字符，自动选择合适的转换方法
   * 
   * @param title - 标题（中文或英文）
   * @returns 生成的 slug
   * 
   * @example
   * ```ts
   * const slug1 = SlugGenerator.autoGenerateSlug('减脂食谱');
   * console.log(slug1); // 'jian-zhi-shi-pu'
   * 
   * const slug2 = SlugGenerator.autoGenerateSlug('Hello World');
   * console.log(slug2); // 'hello-world'
   * ```
   */
  static autoGenerateSlug(title: string): string {
    if (!title) {
      logger.debug('SlugGenerator', 'Empty title provided for auto slug generation');
      return '';
    }

    // 检测是否包含中文字符
    const hasChinese = /[\u4e00-\u9fa5]/.test(title);
    logger.debug('SlugGenerator', `Auto-detecting language for: ${title}, hasChinese: ${hasChinese}`);

    const slug = hasChinese ? this.chineseToSlug(title) : this.englishToSlug(title);
    logger.info('SlugGenerator', `Auto-generated slug: ${slug}`);
    return slug;
  }

  /**
   * 验证 slug 是否有效
   * 
   * 有效的 slug 应该：
   * - 不为空
   * - 只包含小写字母、数字和连字符
   * 
   * @param slug - 待验证的 slug
   * @returns 是否有效
   * 
   * @example
   * ```ts
   * console.log(SlugGenerator.isValidSlug('hello-world')); // true
   * console.log(SlugGenerator.isValidSlug('Hello_World')); // false
   * console.log(SlugGenerator.isValidSlug('')); // false
   * ```
   */
  static isValidSlug(slug: string): boolean {
    if (!slug) return false;
    
    const isValid = /^[a-z0-9-]+$/.test(slug);
    logger.debug('SlugGenerator', `Validating slug: ${slug}, isValid: ${isValid}`);
    return isValid;
  }

  /**
   * 清理用户输入的 slug
   * 
   * 对用户手动输入的 slug 进行标准化清理
   * 
   * @param slug - 用户输入的 slug
   * @returns 清理后的 slug
   * 
   * @example
   * ```ts
   * const cleaned = SlugGenerator.sanitizeSlug('  Hello_World!!!  ');
   * console.log(cleaned); // 'hello-world'
   * ```
   */
  static sanitizeSlug(slug: string): string {
    if (!slug) {
      logger.debug('SlugGenerator', 'Empty slug provided for sanitization');
      return '';
    }

    logger.debug('SlugGenerator', `Sanitizing slug: ${slug}`);
    const sanitized = this.normalizeSlug(slug);
    logger.debug('SlugGenerator', `Sanitized slug: ${sanitized}`);
    return sanitized;
  }
}
