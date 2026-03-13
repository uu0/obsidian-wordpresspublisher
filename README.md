# WordPress Publisher for Obsidian

[English](README.md) | [简体中文](README_zh.md)

**Version**: 1.2.0
**Author**: uu0
**Last Updated**: 2026-03-14

## About This Project

This project is a deep refactor and feature extension based on [obsidian-wordpress](https://github.com/devbean/obsidian-wordpress). While preserving the core WordPress publishing functionality, we've added a modern publishing interface, intelligent slug generation, featured image selection, AI service integration, and completely refactored the codebase architecture.

**Key Extensions**:
- Brand new visual publishing interface with post/page type selection, category management, and status control
- Intelligent slug generation system (Pinyin conversion / AI translation dual modes)
- Three featured image options (local images / Unsplash search / AI generation)
- OpenAI / Claude AI service integration with auto-summary and smart translation
- Modern UI design with dark theme and glassmorphism effects

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

1. **Local Images**: Select from file system or Obsidian vault
2. **Unsplash**: Search and download free high-quality images
3. **AI Generation**: Auto-generate images based on article content

### 🤖 AI Service Integration

- **Dual Engine Configuration**: Text processing AI + Image generation AI
- **Supported Providers**: OpenAI (GPT/DALL-E), Claude
- **Features**: Auto-generate summaries, translate slugs, generate image prompts
- **API Compatibility**: Supports custom Base URLs for regional mirrors

### 💎 Modern Interface

- Card-based layout with split-pane design
- Glassmorphism background effects
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
4. **Select Featured Image** (optional): Local/Unsplash/AI generation
5. **Publish**: Click publish button and wait for completion

## Project Structure

```
src/
├── ai-service.ts              # AI service module
├── slug-generator.ts          # Slug generation utilities
├── unsplash-service.ts        # Unsplash integration
├── featured-image-modal.ts    # Featured image selector
├── wp-publish-modal-v2.ts     # Publishing interface
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
- API keys are encrypted; regular rotation recommended

## License

GPL-3.0 License

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
