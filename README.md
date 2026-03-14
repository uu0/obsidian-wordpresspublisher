# WordPress Publisher for Obsidian

[English](README.md) | [简体中文](README_zh.md)

**Version**: 1.3.0
**Author**: uu0
**Last Updated**: 2026-03-14

## About This Project

This project is a deep refactor and feature extension based on [obsidian-wordpress](https://github.com/devbean/obsidian-wordpress). While preserving the core WordPress publishing functionality, we've added a modern publishing interface, intelligent slug generation, featured image selection, AI service integration, and completely refactored the codebase architecture.

**Key Extensions**:
- 🎨 **Modern Tab-Based Interface**: Complete UI refactor with Settings/Preview/AI Assistant tabs
- 🤖 **AI-Powered Features**: Featured image generation, auto-excerpt, smart tag suggestions
- 🖼️ **Advanced Image Management**: AI generation, Unsplash integration, vault browser, intelligent caching
- 📝 **Live Preview & Editing**: Real-time preview with inline editing capabilities
- ✨ **Enhanced UX**: Micro-interactions, smooth animations, visual feedback
- 🔗 **Intelligent Slug Generation**: Pinyin conversion / AI translation dual modes
- 🎯 **Smart Content Enhancement**: Auto-summary and context-aware tag generation

## Overview

WordPress Publisher is a powerful Obsidian plugin that enables one-click publishing of Markdown notes to WordPress sites. It supports both posts and pages, with built-in intelligent slug generation, featured image selection, and AI integration to dramatically improve content publishing efficiency.

## Core Features

### 🎨 Modern Tab-Based Interface (v1.3.0)

- **Settings Tab**: Core publishing configuration with intuitive form layout
- **Preview Tab**: Live HTML preview with inline editing capabilities
- **AI Assistant Tab**: AI-powered content generation and enhancement
- **Smooth Transitions**: Animated tab switching with state persistence
- **Responsive Design**: Adapts to different screen sizes

### 🤖 AI-Powered Content Enhancement

#### Featured Image Generation
- **AI Generation**: Create images based on your content using AI
- **Unsplash Integration**: Search millions of free, high-quality photos
- **Vault Browser**: Select from images already in your Obsidian vault
- **Smart Caching**: Automatically cache generated images for reuse
- **Multiple Sources**: Switch between AI, Unsplash, vault, or local upload

#### Content Generation
- **Auto Excerpt**: AI-generated summaries of your content
- **Smart Tags**: Context-aware tag suggestions based on content analysis
- **Multi-language Support**: Works seamlessly with English and Chinese content

### 📝 Content Publishing

- **Dual Type Support**: Publish as posts or pages
- **Category Management**: Select WordPress categories and tags
- **Status Control**: Draft, pending review, published, and more
- **Live Preview**: Real-time preview with editing capabilities
- **Inline Editing**: Edit content, tags, and metadata directly in preview

### 🔗 Intelligent Slug Generation

- **Pinyin Mode**: Automatically converts Chinese titles to pinyin (e.g., "减脂食谱" → "jian-zhi-shi-pu")
- **AI Translation Mode**: Uses AI to translate Chinese to English slugs (e.g., "减脂食谱" → "weight-loss-recipes")
- **Manual Editing**: Edit auto-generated slugs in the publishing interface

### 🖼️ Advanced Image Management

Multiple ways to set featured images:

1. **AI Generation**: Generate unique images based on your content
2. **Unsplash Search**: Browse and select from millions of free photos
3. **Vault Browser**: Choose from images in your Obsidian vault
4. **Local Upload**: Upload images from your file system
5. **Smart Caching**: Previously generated/selected images are cached per note

**Cache Features**:
- Automatic caching of generated images
- Per-note cache association
- Source tracking (AI, Unsplash, Vault)
- Manual cache clearing
- Reduces API calls and generation time

### 🤖 AI Service Integration

- **Dual Engine Configuration**: Text processing AI + Image generation AI
- **Supported Providers**: OpenAI (GPT/DALL-E), Claude
- **Features**: Auto-generate summaries, translate slugs, generate image prompts
- **API Compatibility**: Supports custom Base URLs for regional mirrors

### 💎 Enhanced User Experience

- **Micro-interactions**: Ripple effects, hover states, smooth transitions
- **Visual Feedback**: Loading states, progress indicators, success/error messages
- **Keyboard Navigation**: Full keyboard support with logical tab order
- **Accessibility**: ARIA labels, screen reader support, high contrast
- **Responsive Design**: Adapts to different screen sizes and themes
- **Dark Theme Support**: Seamless integration with Obsidian's theme system

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

### Quick Start

1. **Write Content**: Create your Markdown document in Obsidian
2. **Open Publishing Interface**: Click the plugin icon or use command palette
3. **Configure Settings**:
   - Switch to Settings tab to configure title, slug, categories, status
   - Switch to Preview tab to review and edit content
   - Switch to AI Assistant tab to generate images, excerpts, or tags
4. **Publish**: Click the publish button and wait for completion

### Using AI Features

#### Generate Featured Image

1. Open the AI Assistant tab
2. Click "Featured Image" sub-tab
3. Choose your preferred method:
   - **AI Generate**: Click "Generate with AI" for AI-created image
   - **Unsplash**: Search for free photos
   - **Vault**: Browse images in your vault
   - **Upload**: Upload from your computer
4. Generated/selected images are automatically cached

#### Generate Excerpt

1. Open the AI Assistant tab
2. Click "Excerpt" sub-tab
3. Click "Generate Excerpt"
4. Review and edit the generated summary
5. Click "Use This Excerpt" to apply

#### Generate Tags

1. Open the AI Assistant tab
2. Click "Tags" sub-tab
3. Click "Generate Tags"
4. Review suggested tags
5. Click individual tags to add them
6. Edit or remove tags as needed

### Preview and Edit

1. Switch to the Preview tab
2. Review the rendered HTML content
3. Click "Edit" to enable inline editing
4. Make changes directly in the preview
5. Click "Save" to apply changes
6. Edit tags by clicking on them

### Image Caching

- First-time generated/selected images are cached per note
- Reopen the modal to see cached images
- Click "Use Cached" to reuse previous image
- Click "Generate New" to create a fresh image
- Cache persists across sessions

## Project Structure

```
src/
├── ai-service.ts              # AI service module
├── slug-generator.ts          # Slug generation utilities
├── unsplash-service.ts        # Unsplash integration
├── image-cache-manager.ts     # Image caching system
├── featured-image-modal.ts    # Featured image selector
├── wp-publish-modal-v2.ts     # Modern publishing interface (v1.3.0)
├── plugin-settings.ts         # Settings definitions
└── i18n/                      # Internationalization
    ├── en.json                # English translations
    └── zh-cn.json             # Chinese translations

docs/
├── UI-REFACTOR-GUIDE.md       # Complete UI refactor documentation
└── TESTING-CHECKLIST.md       # Comprehensive testing checklist

styles.css                     # UI styles with animations
manifest.json                  # Plugin manifest
```

## Documentation

- **[UI Refactor Guide](docs/UI-REFACTOR-GUIDE.md)**: Complete guide to the v1.3.0 UI refactor, including architecture, features, and migration
- **[Testing Checklist](docs/TESTING-CHECKLIST.md)**: Comprehensive testing checklist for all features
- **[README 中文](README_zh.md)**: Chinese version of this README

## What's New in v1.3.0

### Major Features
- ✅ Complete UI refactor with modern tab-based interface
- ✅ AI-powered featured image generation
- ✅ Unsplash integration for free photos
- ✅ Vault image browser
- ✅ Intelligent image caching system
- ✅ AI excerpt generation
- ✅ AI tag suggestions
- ✅ Live preview with inline editing
- ✅ Enhanced visual feedback and micro-interactions

### Improvements
- Better state management across tabs
- Improved error handling and user feedback
- Optimized performance with caching
- Enhanced accessibility
- Smoother animations and transitions
- Better keyboard navigation

See [UI Refactor Guide](docs/UI-REFACTOR-GUIDE.md) for detailed information.

## Important Notes

- Unsplash API is free but has rate limits
- OpenAI/Claude APIs are billed by usage
- Stable network connection recommended
- API keys are encrypted with AES-256-GCM; regular rotation recommended

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
