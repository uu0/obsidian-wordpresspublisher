# WordPress Publisher - Obsidian WordPress Plugin

**Version**: 1.2.1
**Author**: uu0
**Updated**: 2026-03-14

## Project Background

This project is a deep refactoring and feature extension based on [obsidian-wordpress](https://github.com/devbean/obsidian-wordpress). While preserving the core WordPress publishing functionality, it adds new modules including a publishing interface, intelligent slug generation, featured image selection, and AI service integration, with a completely restructured codebase.

**Major Extended Features**:
- Brand new visual publishing interface with post/page type selection, category management, and status control
- Intelligent slug generation system (Pinyin conversion / AI translation dual modes)
- Three featured image setting methods (Local files / Unsplash search / AI generation)
- OpenAI / Claude AI service integration for auto-excerpts and smart translation
- Modern UI design with dark theme and glassmorphism effects

## Overview

WordPress Publisher is a powerful Obsidian plugin that enables one-click publishing of Markdown notes to WordPress websites. It supports both posts and pages, features intelligent slug generation, featured image selection, and AI integration, significantly improving content publishing efficiency.

## Key Features

### 📝 Content Publishing

- **Dual Type Support**: Publish as Post or Page
- **Category Management**: Select WordPress categories and tags
- **Status Control**: Draft, pending, published, and more
- **Real-time Preview**: Review all settings before publishing

### 🔗 Smart Slug Generation

- **Pinyin Mode**: Automatically convert Chinese titles to pinyin (e.g., "减脂食谱" → "jian-zhi-shi-pu")
- **AI Translation Mode**: Use AI to translate Chinese to English slugs (e.g., "减脂食谱" → "weight-loss-recipes")
- **Manual Editing**: Modify auto-generated slugs in the publish interface

### 🖼️ Featured Images

Three ways to set featured images:

1. **Local Images**: Select from file system or Obsidian vault
2. **Unsplash**: Search and download free high-quality images
3. **AI Generation**: Generate images based on article content

### 🤖 AI Service Integration

- **Dual Engine Config**: Text AI + Image AI
- **Supported Providers**: OpenAI (GPT/DALL-E), Claude
- **Features**: Auto-generate excerpts, translate slugs, generate image prompts
- **Compatible API**: Custom Base URL support for regional mirrors

### 💎 Modern Interface

- Card-based layout with split-pane design
- Glassmorphism background effect
- Smooth animation transitions
- Dark theme support

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

1. Go to plugin settings
2. Enter your WordPress site URL
3. Enter username and application password (generate in WordPress admin)
4. Click verify connection

### Slug Generation Settings

- **Auto Generate Slug**: Enable/disable automatic generation
- **Slug Generation Mode**: Choose "Pinyin Conversion" or "AI Translation"

### Unsplash Settings

1. Visit [Unsplash Developers](https://unsplash.com/developers) to create an app
2. Get Access Key
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

1. **Write Article**: Create a Markdown document in Obsidian
2. **Open Publish Interface**: Click plugin icon or use command palette
3. **Fill Information**: Title, category, status, etc.
4. **Select Featured Image** (optional): Local/Unsplash/AI generated
5. **Publish**: Click publish button and wait for completion

## File Structure

```
src/
├── ai-service.ts              # AI service module
├── slug-generator.ts          # Slug generation utility
├── unsplash-service.ts        # Unsplash integration
├── featured-image-modal.ts    # Featured image selection
├── wp-publish-modal-v2.ts     # Publish interface
└── plugin-settings.ts         # Settings definition

styles.css                     # UI styles
manifest.json                  # Plugin configuration
```

## Notes

- Unsplash API is free but has rate limits
- OpenAI/Claude APIs are usage-based billing
- Stable network connection recommended
- API keys are encrypted; regular rotation recommended

## License

MIT License

## Acknowledgments

This project uses the following open source projects. Special thanks to:

| Project | Description |
|---------|-------------|
| [obsidian-wordpress](https://github.com/devbean/obsidian-wordpress) | This project is a deep refactoring and extension based on this. Thanks to the original author devbean for the foundational framework |
| [Obsidian](https://obsidian.md) | Powerful knowledge base application with complete plugin development API |
| [OpenAI Node.js SDK](https://github.com/openai/openai-node) | Official OpenAI Node.js SDK for AI text processing and image generation |
| [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript) | Official Claude AI TypeScript SDK for Claude model support |
| [pinyin-pro](https://github.com/zh-lx/pinyin-pro) | High-performance Chinese-to-Pinyin library for smart slug generation |
| [unsplash-js](https://github.com/unsplash/unsplash-js) | Official Unsplash JavaScript client for image search |

Thanks to all open source community contributors!

## Changelog

### 2.1.1 (2026-03-19)

**Category Management UI Improvements**

This release focuses on fixing category selection UI issues and improving mobile layout responsiveness.

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
  - Renamed "Save Parameters" button to "Save" for simplicity
  - Improved overall user experience for category selection and management

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

### 1.2.0 (2026-03-14)

**New Features**
- Category Selector: New tag-based category selector UI with current category display, delete functionality, and +button for adding categories
- Publish As New: Added option to publish the same content as a new article
- Featured Image Sync: Added featured image synchronization and conflict detection
- Remote Image Loading: Added timeout and retry functionality with loading status indicator

**Bug Fixes**
- Fixed featured image not displaying on initial modal open
- Fixed featurePicture/featuredImageId being cleared on republish
- Fixed category showing "Uncategorized" after conflict resolution
- Fixed preview tab position changing after deletion

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
