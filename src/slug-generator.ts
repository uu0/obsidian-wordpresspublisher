import { pinyin } from 'pinyin-pro';

export class SlugGenerator {
  /**
   * 将中文标题转换为拼音 slug
   * 例如："减脂食谱" -> "jian-zhi-shi-pu"
   */
  static chineseToSlug(title: string): string {
    if (!title) return '';

    // 使用 pinyin-pro 转换中文为拼音
    const pinyinText = pinyin(title, {
      toneType: 'none', // 不带声调
      type: 'array' // 返回数组
    });

    // 转换为小写并清理
    return (Array.isArray(pinyinText) ? pinyinText : [pinyinText])
      .join('-')
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // 移除特殊字符
      .replace(/\s+/g, '-') // 空格转连字符
      .replace(/-+/g, '-') // 多个连字符合并为一个
      .replace(/^-+|-+$/g, ''); // 移除首尾连字符
  }

  /**
   * 将英文标题转换为 slug
   * 例如："Hello World" -> "hello-world"
   */
  static englishToSlug(title: string): string {
    if (!title) return '';

    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // 移除特殊字符
      .replace(/\s+/g, '-') // 空格转连字符
      .replace(/-+/g, '-') // 多个连字符合并为一个
      .replace(/^-+|-+$/g, ''); // 移除首尾连字符
  }

  /**
   * 智能生成 slug（自动检测中英文）
   */
  static autoGenerateSlug(title: string): string {
    if (!title) return '';

    // 检测是否包含中文字符
    const hasChinese = /[\u4e00-\u9fa5]/.test(title);

    if (hasChinese) {
      return this.chineseToSlug(title);
    } else {
      return this.englishToSlug(title);
    }
  }

  /**
   * 验证 slug 是否有效
   */
  static isValidSlug(slug: string): boolean {
    if (!slug) return false;
    // Slug 应该只包含小写字母、数字和连字符
    return /^[a-z0-9-]+$/.test(slug);
  }

  /**
   * 清理用户输入的 slug
   */
  static sanitizeSlug(slug: string): string {
    return slug
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
