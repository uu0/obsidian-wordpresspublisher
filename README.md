# WordPress Publisher for Obsidian

[English](README.md) | [简体中文](README_zh.md)

**Version**: 2.1.1
**Author**: uu0
**Last Updated**: 2026-03-19

## About This Project

This project is a deep refactor and feature extension based on [obsidian-wordpress](https://github.com/devbean/obsidian-wordpress). While preserving the core WordPress publishing functionality, we've added a modern publishing interface, intelligent slug generation, featured image selection, AI service integration, and completely refactored the codebase architecture.

**Key Extensions**:
- V3 dual-pane publishing modal with mobile-responsive single-column layout
- Brand new visual publishing interface with post/page type selection, category management, and status control
- Intelligent slug generation system (Pinyin conversion / AI translation dual modes)
- Three featured image options (local images / Unsplash search / AI generation)
- OpenAI / Claude AI service integration with auto-summary and smart translation
- Modern UI design with dark theme support

## Overview

WordPress Publisher is a powerful Obsidian plugin that enables one-click publishing of Markdown notes to WordPress sites. It supports both posts and pages, with built-in intelligent slug generation, featured image selection, and AI integration to dramatically improve content publishing efficiency.

## Core Features

### 📝 Content Publishing

- **Dual Type Support**: Publish as posts or pages
- **Category Management**: Select WordPress categories and tags
- **Status Control**: Draft, pending review, published, and more
- **Live Preview**: Preview all settings before publishing

### 🔗 Intelligent Slug Generation

- **Pinyin Mode**: Automatically converts Chinese titles to pinyin (e.g., "减脂食谱" → "jian-zhi-shi-pu")
- **AI Translation Mode**: Uses AI to translate Chinese to English slugs (e.g., "减脂食谱" → "weight-loss-recipes")
- **Manual Editing**: Edit auto-generated slugs in the publishing interface

### 🖼️ Featured Images

Three ways to set featured images:

1. **Local Images**: Select from file system or Obsidian vault, with drag-and-drop support and auto-crop to 16:9
2. **Unsplash**: Search and download free high-quality images
3. **AI Generation**: Auto-generate images based on article content

### 🤖 AI Service Integration

- **Dual Engine Configuration**: Text processing AI + Image generation AI
- **Supported Providers**: OpenAI (GPT/DALL-E), Claude
- **Features**: Auto-generate summaries, translate slugs, generate image prompts, generate tags
- **API Compatibility**: Supports custom Base URLs for regional mirrors

### 💎 Modern Interface

- V3 dual-pane layout: content preview (left) + settings sidebar (right)
- Fully responsive — collapses to single-column on mobile (≤ 680 px)
- Sticky footer with action buttons always visible when scrolling
- Colored tag pills with drag-and-drop sorting (9-color palette, light/dark variants)
- Dark theme support with CSS variable-based design tokens

## Installation

### Manual Installation

1. Download the latest `main.js`, `styles.css`, and `manifest.json`
2. Create folder in your Obsidian vault: `.obsidian/plugins/obsidian-wordpresspublisher/`
3. Copy downloaded files to this folder
4. Restart Obsidian and enable the plugin in settings

### Build from Source

```bash
# Clone repository
git clone https://github.com/your-repo/obsidian-wordpresspublisher.git
cd obsidian-wordpresspublisher

# Install dependencies
npm install

# Build
npm run build

# Development mode
npm run dev
```

## Configuration

### WordPress Connection

1. Go to plugin settings page
2. Enter your WordPress site URL
3. Enter username and application password (generated in WordPress admin)
4. Click verify connection

### Slug Generation Settings

- **Auto-generate Slug**: Enable/disable automatic generation
- **Slug Generation Mode**: Choose "Pinyin Conversion" or "AI Translation"

### Unsplash Settings

1. Visit [Unsplash Developers](https://unsplash.com/developers) to create an app
2. Get your Access Key
3. Enter and verify in plugin settings

### AI Service Settings

```
AI Provider: OpenAI / Claude
Base URL: https://api.openai.com/v1
API Key: sk-...
Model Name: gpt-3.5-turbo / claude-3-sonnet
```

**Tip**: You can use regional mirror service Base URLs

## Usage

1. **Write Content**: Create Markdown document in Obsidian
2. **Open Publishing Interface**: Click plugin icon or use command palette
3. **Fill Information**: Title, categories, status, etc.
4. **Select Featured Image** (optional): Local / drag-and-drop / Unsplash / AI generation
5. **Publish**: Click publish button and wait for completion

## Project Structure

```
src/
├── ai-service.ts              # AI service module
├── slug-generator.ts          # Slug generation utilities
├── unsplash-service.ts        # Unsplash integration
├── featured-image-modal.ts    # Featured image selector
├── wp-publish-modal-v2.ts     # Publishing interface (V3)
├── frontmatter-manager.ts     # Frontmatter conflict detection & merge
├── plugin-settings.ts         # Settings definitions
└── i18n/                      # Internationalization
    ├── en.json                # English translations
    └── zh-cn.json             # Chinese translations

styles.css                     # UI styles
manifest.json                  # Plugin manifest
```

## Important Notes

- Unsplash API is free but has rate limits
- OpenAI/Claude APIs are billed by usage
- Stable network connection recommended
- API keys are encrypted with AES-256-GCM; regular rotation recommended

## License

GPL-3.0 License

This plugin is based on [obsidian-wordpress](https://github.com/devbean/obsidian-wordpress) by devbean (GPL-3.0), and is licensed under GPL-3.0 accordingly.

## Acknowledgments

This project uses the following open-source projects:

| Project | Description |
|---------|-------------|
| [obsidian-wordpress](https://github.com/devbean/obsidian-wordpress) | This project is based on deep refactoring and feature extension of this plugin. Thanks to original author devbean for the foundational framework |
| [Obsidian](https://obsidian.md) | Powerful knowledge base application with comprehensive plugin development API |
| [OpenAI Node.js SDK](https://github.com/openai/openai-node) | Official OpenAI Node.js SDK for AI text processing and image generation |
| [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript) | Official Claude AI TypeScript SDK providing Claude model support |
| [pinyin-pro](https://github.com/zh-lx/pinyin-pro) | High-performance Chinese to Pinyin library for intelligent slug generation |
| [unsplash-js](https://github.com/unsplash/unsplash-js) | Official Unsplash JavaScript client for image search |

Thanks to all open-source community contributors!

## Changelog

### 2.1.1 (2026-03-19)

**Smart Error Handling & Auth Cache Configuration**

This release adds intelligent retry logic for featured image uploads and configurable authentication cache duration, improving reliability and user experience.

**New Features**

- **Smart Error Handling for Featured Image Upload (P0)**
  - Automatic retry for transient server errors (502, 503, 504, timeout, network issues)
  - Maximum 2 retries with 2-second delay between attempts
  - User-friendly notifications during retry process
  - Detailed error logging for troubleshooting

- **Auth Cache Duration Configuration (P1)**
  - Configurable authentication cache duration: 1 day / 1 week / 1 month / 6 months / forever
  - Reduces repeated login prompts for long sessions
  - Global cache shared across all client instances
  - Automatic cache invalidation on authentication failure

**Bug Fixes**

- **Category Dropdown Visibility**
  - Fixed category dropdown and add button not displaying correctly
  - Resolved CSS layout issue where `width: 100%` on `.wp-category-tags-container` pushed the add button out of view
  - Category add button now always visible and functional

- **Category Initialization**
  - Fixed default category not being set correctly when no frontmatter categories exist
  - Now properly finds "Uncategorized" by name (支持中文"未分类") instead of hardcoded ID
  - Ensures consistent category selection across different WordPress configurations

- **Mobile Footer Layout**
  - Fixed footer button overflow on small screens
  - Added complete footer button layout with save params button for mobile
  - Improved responsive design for screens ≤ 480px

- **Category Add Button Restoration**
  - Fixed category add button not restoring after dropdown blur
  - Added proper `onblur` event handling to restore button visibility
  - Improved user experience when canceling category selection

**Improvements**

- **Save Button Rename**
  - Renamed "Save Parameters" button to "Save" for consistency and clarity
  - Updated both English and Chinese translations

- **Category Selection UX**
  - Category dropdown now always shows available categories
  - Improved layout with separate containers for tags and add controls
  - Better visual separation between selected categories and selection controls

---

### 2.1.0 (2026-03-18)

**Image Processing & Upload Improvements**

This release focuses on image handling reliability, featuring automatic compression, consistent cropping across all image sources, and robust error handling with retry logic.

**New Features**

- **Automatic Image Compression**
  - Compresses images exceeding configurable size threshold before upload
  - Binary search algorithm finds optimal quality while staying under size limit
  - PNG automatically converts to JPEG for better compression
  - Configurable settings: `enableImageCompression`, `imageMaxSizeKB` (default 500KB), `imageMinQuality` (default 0.6)
  - Shows compression result notice: "图片已压缩: 2500KB → 380KB"

- **Image Cropping for All Sources**
  - Previously: cropping only applied to local file uploads and Unsplash
  - Now: cropping applies to **all** image sources including vault selection and AI-generated images
  - Consistent aspect ratio and width across all featured images

- **Smart Error Handling for Featured Image Upload**
  - Automatic retry for transient server errors (502, 503, 504, timeout, network issues)
  - Maximum 2 retries with 2-second delay between attempts
  - Fallback to existing featured image ID if available when upload fails
  - Prominent 10-second error notice with clear indication of failure

- **Auth Cache Duration Configuration**
  - Configurable authentication cache duration: 1 day / 1 week / 1 month / 6 months / forever
  - Reduces repeated login prompts for long sessions

**Bug Fixes**

- **Frontmatter Field Preservation**
  - Fixed `existingOtherFields` being collected but never restored to frontmatter
  - User-added frontmatter fields (author, date, custom fields, etc.) are now preserved during publish
  - Fixed excerpt being cleared when empty - now only updates if non-empty value provided

- **Frontmatter Sync with Remote Values**
  - WordPress may modify slug on save (e.g., add suffix for conflicts)
  - Plugin now syncs remote `slug`, `tags`, and other fields back to frontmatter after publish
  - Tags converted from IDs to names using cached tag list

- **Featured Image State Management**
  - Fixed `cachedFeaturedImageId` not being cleared when user removes image
  - Prevents stale cached IDs from being used when publishing without an image

- **Category Display**
  - Fixed category not showing due to incorrect nullish coalescing operator
  - Changed `??` to `||` for postType default value handling

- **CORS Error Fix**
  - Loading online images now uses Obsidian's `requestUrl` instead of `fetch`
  - Resolves CORS errors when loading remote featured images

**Improvements**

- Added detailed debug logging for featured image upload flow
- Added loading spinner animation during async operations
- Improved category conflict detection with user-friendly notices
- Better async error handling throughout the codebase
- Type safety improvements with proper TypeScript typing

---

### 2.0.0 (2026-03-15)

**Complete UI Overhaul — V3 Dual-Pane Publishing Interface**

This release is a complete visual and structural overhaul of the publishing modal. The interface has been rebuilt from the ground up with a dual-pane layout, a redesigned interaction model, and full mobile support.

**New Features**

- **Dual-Pane Publishing Interface (V3)**
  - Left pane: content preview (featured image + article body)
  - Right pane (sidebar): all publish settings — title, slug, category, tags, excerpt, status, type, and advanced options
  - Clean title bar showing only "WordPress Publisher" — Obsidian's native header and close button hidden via CSS `:has()` selector
  - Footer action bar: `✏️ Edit` · `❌ Cancel` · `🚀 Publish`

- **Featured Image — Richer Controls**
  - Inline image preview card with action buttons: Remove / Select from Vault / Select Local File / AI Generate
  - Drag-and-drop an image onto the preview card to select a local file
  - Local file picker with automatic format validation (JPEG / PNG / GIF / WebP, max 10 MB) and auto-crop to 16:9
  - "Retry" / "Skip" controls when remote featured image fails to load

- **Tags — Colored Pills with Drag-and-Drop Sorting**
  - Each tag rendered as a colored pill using a palette of 9 CSS variables (`--wp-tag-color-1` through `--wp-tag-color-9`)
  - Tags can be reordered via drag-and-drop
  - Separate light and dark theme palettes

- **Excerpt — Inline Editing**
  - Excerpt displayed inline in the preview pane; tap to edit in-place
  - AI-generated excerpt available via the sidebar AI tab

- **AI Tab — Unified Panel**
  - Single AI sidebar tab covering: Featured Image generation, Excerpt generation, Tags generation
  - Tab state (`featured-image` / `excerpt` / `tags`) preserved within a session

**Bug Fixes**

- **Mobile layout completely fixed**
  - Root cause: JS was writing inline styles (`width` / `minWidth` / `height`) directly onto `modalEl`, which have higher CSS specificity than `@media` rules — media queries had zero effect on mobile
  - Fix: `updateModalWidth()` now detects `window.innerWidth <= 680` at runtime; on mobile it clears all inline dimension styles on both `modalEl` and `contentEl`, letting CSS take full control
  - Mobile scroll architecture rebuilt: `modal-container` fixed at `92vh` / `overflow: hidden`; `modal-content` becomes the single scroll layer (`overflow-y: auto`); `wp-v3-footer` uses `position: sticky; bottom: 0` — always visible regardless of content length
  - Dual-pane collapses to single-column on screens ≤ 680 px; sidebar stacks below content

- **Frontmatter conflict detection false positives fixed**
  - `detectConflicts` now uses a "both sides must be non-empty AND differ" rule, eliminating false conflicts when one side is empty
  - New `mergeValue()` helper: if one side is empty, use the other; if both present (and equal after resolution), prefer local

**UI / Style Changes**

- `min-width: 480px` moved from JS inline style to CSS `.modal-container:has()` selector (desktop only)
- Footer cancel button updated to `❌ Cancel`
- Edit pencil icon (✏️) removed from content section header
- Footer button emoji deduplication: i18n values already contain emoji; manual prefix strings removed from code
- CSS design tokens: 9 tag color variables, sticky shadow variable, light/dark variants

---

### 1.2.2 (2026-03-14)

**Security**
- AI API Keys (Text AI / Image AI) and Unsplash API Key are now encrypted with AES-256-GCM before being written to disk, consistent with how WordPress passwords are handled; existing plaintext keys are automatically migrated on first save

**Bug Fixes**
- Fixed AI feature entry points (generate summary, generate tags, slug AI translate, AI image generation) bypassing guards and sending HTTP 401 requests when `apiKey` was empty
- Summary, tags, and slug translate buttons now render as disabled with a friendly notice when the corresponding API Key is not configured

### 1.2.1 (2026-03-14)

**Bug Fixes**
- Fixed local featured image being overwritten by remote image when reopening the publish modal
- Fixed cancelled featured image reappearing after closing and reopening the modal

**Improvements**
- Removed redundant `featurePicture` URL inconsistency check in preview; only `featuredImageId` presence is now checked
- UI refactor: replaced hardcoded colors with CSS variables for better theme compatibility
- Removed fixed minimum width; added responsive breakpoints (768px / 480px / 360px)
- Touch device optimization (44px minimum touch target)
- Added `prefers-reduced-motion` and `focus-visible` accessibility support
- Plugin description updated to English
- Build script now auto-syncs `manifest.json` to output and guards against Chinese characters

### 1.2.0 (2026-03-13)

**New Features**
- Added inline tags support, using #tag# format in notes
- Added "Publish as New" feature, allows choosing between updating remote posts or publishing as a completely new article
- Enhanced API capability analysis with XML-RPC protocol support
- Changed default tag format to YAML array format

**Bug Fixes**
- Fixed category selection being overwritten when publishing posts
- Fixed posts becoming uncategorized after publishing when different category was selected
- Fixed featurePicture and featuredImageId being lost in frontmatter during republish
- Improved category handling logic and user interface
- Improved media upload error handling with clearer error messages

### 1.1.0 (2026-03-12)

**New Features**
- Added internationalization (i18n) support with Chinese and English interface switching
- Added English translation file (`src/i18n/en.json`)
- Enhanced Chinese translation file (`src/i18n/zh-cn.json`)

**Improvements**
- Optimized multi-language display in plugin interface
- Improved user experience in settings page
- Updated project documentation and README

### 1.0.1 (2026-03-12)

**Bug Fixes**
- Fixed some interface display issues
- Optimized code structure

### 1.0.0 (2026-03-11)

**Initial Release**
- Deep refactoring based on obsidian-wordpress
- Brand new visual publishing interface
- Intelligent slug generation system
- Featured image selection functionality
- AI service integration
- Modern UI design
