import { SafeAny } from './utils';
import { isArray, isString } from 'lodash-es';

/**
 * Interface for markdown-it plugins with configurable options
 */
export interface MarkdownItPlugin {
  /** Update plugin options dynamically */
  updateOptions: (opts: SafeAny) => void;
}

/**
 * Frontmatter data extracted from markdown files
 * Key-value pairs from YAML frontmatter
 */
export type MatterData = { [p: string]: SafeAny };

/**
 * Media file representation for upload
 */
export interface Media {
  /** MIME type of the media file (e.g., 'image/png') */
  mimeType: string;
  /** Original filename */
  fileName: string;
  /** Binary content as ArrayBuffer */
  content: ArrayBuffer;
}

/**
 * Type guard to check if an object is a Media instance
 * @param obj - Object to check
 * @returns True if the object matches Media interface
 */
export function isMedia(obj: SafeAny): obj is Media {
  return (
    typeof obj === 'object'
    && obj !== null
    && 'mimeType' in obj && typeof obj.mimeType === 'string'
    && 'fileName' in obj && typeof obj.fileName === 'string'
    && 'content' in obj && obj.content instanceof ArrayBuffer
  );
}

/**
 * Function type for mapping form item names
 * Used to customize field names in multipart form data
 *
 * @param name - Original item name
 * @param isArray - Whether this item is in an array (name will be appended with `[]`)
 * @returns Mapped field name
 */
export type FormItemNameMapper = (name: string, isArray: boolean) => string;

/**
 * Builder class for multipart form data
 * Handles both string and binary (Media) data
 */
export class FormItems {
  /** Internal storage for form data */
  private formData: Record<string, SafeAny> = {};

  /**
   * Append a string value to the form
   */
  append(name: string, data: string): FormItems;
  /**
   * Append a media file to the form
   */
  append(name: string, data: Media): FormItems;
  /**
   * Append data to the form
   * If the same name is used multiple times, creates an array
   * @param name - Field name
   * @param data - String or Media data
   * @returns This instance for chaining
   */
  append(name: string, data: string | Media): FormItems {
    const existing = this.formData[name];
    if (existing) {
      // Convert to array if not already
      if (!isArray(existing)) {
        this.formData[name] = [existing];
      }
      this.formData[name].push(data);
    } else {
      this.formData[name] = data;
    }
    return this;
  }

  /**
   * Convert form data to multipart/form-data ArrayBuffer
   * @param option - Configuration options
   * @param option.boundary - Multipart boundary string
   * @param option.nameMapper - Optional function to map field names
   * @returns Promise resolving to ArrayBuffer containing encoded form data
   */
  toArrayBuffer(option: {
    boundary: string;
    nameMapper?: FormItemNameMapper;
  }): Promise<ArrayBuffer> {
    const CRLF = '\r\n';
    const encoder = new TextEncoder();
    const encodedItemStart = encoder.encode(`--${option.boundary}${CRLF}`);
    const body: ArrayBuffer[] = [];

    /**
     * Add a single form item to the body
     * @param name - Field name
     * @param data - Field data (string or Media)
     * @param isArray - Whether this is an array item
     */
    const itemPart = (name: string, data: string | Media, isArray: boolean): void => {
      // Apply name mapper if provided
      let itemName = name;
      if (option.nameMapper) {
        itemName = option.nameMapper(name, isArray);
      }

      // Add boundary
      body.push(encodedItemStart);

      if (isString(data)) {
        // String field
        body.push(encoder.encode(`Content-Disposition: form-data; name="${itemName}"${CRLF}${CRLF}`));
        body.push(encoder.encode(data));
      } else {
        // Media file field
        const media = data;
        body.push(encoder.encode(
          `Content-Disposition: form-data; name="${itemName}"; filename="${media.fileName}"${CRLF}` +
          `Content-Type: ${media.mimeType}${CRLF}${CRLF}`
        ));
        body.push(media.content);
      }

      body.push(encoder.encode(CRLF));
    };

    // Process all form data entries
    Object.entries(this.formData).forEach(([name, data]) => {
      if (isArray(data)) {
        // Handle array fields
        data.forEach(item => {
          itemPart(`${name}[]`, item, true);
        });
      } else {
        // Handle single fields
        itemPart(name, data, false);
      }
    });

    // Add closing boundary
    body.push(encoder.encode(`--${option.boundary}--`));

    // Convert to single ArrayBuffer
    return new Blob(body).arrayBuffer();
  }
}
