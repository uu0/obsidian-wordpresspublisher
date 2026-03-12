import { describe, it, expect } from '@jest/globals';
import { TagFormatter } from '../../src/tag-formatter';

describe('TagFormatter', () => {
  describe('parseToArray', () => {
    describe('YAML array format', () => {
      it('should parse YAML array tags', () => {
        expect(TagFormatter.parseToArray(['鸡排', '牛肉', '美食']))
          .toEqual(['鸡排', '牛肉', '美食']);
      });

      it('should handle empty array', () => {
        expect(TagFormatter.parseToArray([])).toEqual([]);
      });

      it('should trim and filter empty strings in array', () => {
        expect(TagFormatter.parseToArray(['鸡排', '  ', '牛肉']))
          .toEqual(['鸡排', '牛肉']);
      });
    });

    describe('Inline tags format', () => {
      it('should parse inline tags', () => {
        expect(TagFormatter.parseToArray('#鸡排 #牛肉 #美食'))
          .toEqual(['鸡排', '牛肉', '美食']);
      });

      it('should handle inline tags with extra spaces', () => {
        expect(TagFormatter.parseToArray('#鸡排  #牛肉   #美食'))
          .toEqual(['鸡排', '牛肉', '美食']);
      });

      it('should handle inline tags with Chinese and English', () => {
        expect(TagFormatter.parseToArray('#WordPress #发布 #教程'))
          .toEqual(['WordPress', '发布', '教程']);
      });

      it('should handle mixed inline and text', () => {
        expect(TagFormatter.parseToArray('tags: #鸡排 #牛肉'))
          .toEqual(['鸡排', '牛肉']);
      });
    });

    describe('Comma-separated format', () => {
      it('should parse comma-separated tags', () => {
        expect(TagFormatter.parseToArray('鸡排, 牛肉, 美食'))
          .toEqual(['鸡排', '牛肉', '美食']);
      });

      it('should parse Chinese comma-separated tags', () => {
        expect(TagFormatter.parseToArray('鸡排，牛肉，美食'))
          .toEqual(['鸡排', '牛肉', '美食']);
      });

      it('should handle extra spaces', () => {
        expect(TagFormatter.parseToArray('鸡排,  牛肉 , 美食'))
          .toEqual(['鸡排', '牛肉', '美食']);
      });
    });

    describe('Edge cases', () => {
      it('should handle empty string', () => {
        expect(TagFormatter.parseToArray('')).toEqual([]);
      });

      it('should handle null', () => {
        expect(TagFormatter.parseToArray(null)).toEqual([]);
      });

      it('should handle undefined', () => {
        expect(TagFormatter.parseToArray(undefined)).toEqual([]);
      });

      it('should handle whitespace-only string', () => {
        expect(TagFormatter.parseToArray('   ')).toEqual([]);
      });
    });
  });

  describe('toYamlFormat', () => {
    it('should return array as-is', () => {
      expect(TagFormatter.toYamlFormat(['鸡排', '牛肉']))
        .toEqual(['鸡排', '牛肉']);
    });

    it('should return copy of array', () => {
      const tags = ['鸡排', '牛肉'];
      const result = TagFormatter.toYamlFormat(tags);
      expect(result).toEqual(tags);
      expect(result).not.toBe(tags); // Should be a copy
    });
  });

  describe('toInlineFormat', () => {
    it('should format tags with # prefix', () => {
      expect(TagFormatter.toInlineFormat(['鸡排', '牛肉']))
        .toBe('#鸡排 #牛肉');
    });

    it('should handle single tag', () => {
      expect(TagFormatter.toInlineFormat(['鸡排'])).toBe('#鸡排');
    });

    it('should handle empty array', () => {
      expect(TagFormatter.toInlineFormat([])).toBe('');
    });

    it('should handle null', () => {
      expect(TagFormatter.toInlineFormat(null as any)).toBe('');
    });
  });

  describe('formatTags', () => {
    describe('YAML format', () => {
      it('should format tags as YAML array', () => {
        expect(TagFormatter.formatTags(['鸡排', '牛肉'], 'yaml'))
          .toEqual(['鸡排', '牛肉']);
      });

      it('should handle empty array for YAML', () => {
        expect(TagFormatter.formatTags([], 'yaml'))
          .toEqual([]);
      });
    });

    describe('Inline format', () => {
      it('should format tags as inline', () => {
        expect(TagFormatter.formatTags(['鸡排', '牛肉'], 'inline'))
          .toBe('#鸡排 #牛肉');
      });

      it('should handle empty array for inline', () => {
        expect(TagFormatter.formatTags([], 'inline'))
          .toBe('');
      });
    });
  });

  describe('isInlineFormat', () => {
    it('should return true for inline tags', () => {
      expect(TagFormatter.isInlineFormat('#鸡排 #牛肉')).toBe(true);
    });

    it('should return false for comma-separated tags', () => {
      expect(TagFormatter.isInlineFormat('鸡排, 牛肉')).toBe(false);
    });

    it('should return false for non-string', () => {
      expect(TagFormatter.isInlineFormat(['鸡排', '牛肉'] as any)).toBe(false);
    });
  });

  describe('normalizeInlineTags', () => {
    it('should normalize inline tags', () => {
      expect(TagFormatter.normalizeInlineTags('#鸡排  ##牛肉'))
        .toBe('#鸡排 #牛肉');
    });

    it('should handle comma-separated format', () => {
      // Comma-separated format will be normalized to inline
      expect(TagFormatter.normalizeInlineTags('鸡排, 牛肉'))
        .toBe('#鸡排 #牛肉');
    });
  });

  describe('Integration tests', () => {
    it('should round-trip from YAML to inline and back', () => {
      const original = ['鸡排', '牛肉', '美食'];
      
      // YAML -> Inline
      const inline = TagFormatter.formatTags(original, 'inline');
      expect(inline).toBe('#鸡排 #牛肉 #美食');
      
      // Inline -> Array
      const parsed = TagFormatter.parseToArray(inline);
      expect(parsed).toEqual(original);
    });

    it('should round-trip from inline to YAML and back', () => {
      const original = '#鸡排 #牛肉 #美食';
      
      // Inline -> Array
      const parsed = TagFormatter.parseToArray(original);
      expect(parsed).toEqual(['鸡排', '牛肉', '美食']);
      
      // Array -> Inline
      const inline = TagFormatter.formatTags(parsed, 'inline');
      expect(inline).toBe(original);
    });
  });
});
