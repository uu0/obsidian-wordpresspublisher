# WordPress Publisher - Obsidian WordPress Plugin

**Version**: 1.0.0
**Author**: uu0
**Updated**: 2026-03-11

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
