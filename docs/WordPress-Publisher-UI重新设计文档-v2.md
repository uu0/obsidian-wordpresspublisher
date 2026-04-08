# WordPress Publisher UI 重新设计文档

## 概述

本文档记录了 `obsidian-wordpresspublisher` 插件的 UI 重新设计（V2）的主要改进内容。

**分支**: `feature/ui-v3-redesign`

**源文件对比**:
- V1: `src/wp-publish-modal.ts` (233 行)
- V2: `src/wp-publish-modal-v2.ts` (3223 行)

---

## 主要 UI 改进

### 1. 新布局：两列式设计

**改动**:
- 采用 `wp-layout-container` 两列布局
- 左侧：预览区（wp-layout-preview）
- 右侧：面板区（wp-layout-panels）

**效果**:
- 预览和设置并列显示，提升工作效率
- 响应式断点优化，支持不同屏幕尺寸

### 2. 四段式预览区

实现了四大内容段的实时预览：

| 段落的标题 | 功能描述 |
|------------|----------|
| 特色图片 (Featured Image) | 展示已选择的特色图片，支持编辑跳转 |
| 摘要 (Excerpt) | 显示文章摘要，支持内联编辑 |
| 标签 (Tags) | 展示标签，支持添加/删除 |
| 内容 (Content) | 显示完整文章内容 |

### 3. 可折叠面板系统

- **设置面板 (Settings Panel)**: 包含 AI 辅助和基本设置
- **历史面板 (History Panel)**: 显示发布历史
- 支持折叠/展开操作
- 支持拖拽调整面板高度

### 4. 内联编辑功能

在预览区实现了完整的内联编辑体验：

- **编辑按钮**: 每个段落都有独立的 ✏️ 编辑按钮
- **保存/取消按钮**: 带确认和取消操作
- **键盘快捷键**:
  - `Ctrl/Cmd + Enter`: 保存
  - `Escape`: 取消编辑
- 编辑状态下自动添加视觉反馈（`is-editing` class）

### 5. AI 辅助功能

新增三大 AI 生成能力：

| 功能 | 描述 |
|------|------|
| 摘要生成 (Summary) | 使用 AI 生成文章摘要 |
| 标签生成 (Tags) | 使用 AI 自动提取关键词作为标签 |
| 特色图片 (Featured Image) | 支持 AI 生成图片、Unsplash 搜索、本地文件选择 |

**语言检测**:
- 自动检测文章语言（中/英）
- 根据语言使用对应的提示词模板

### 6. 图片管理增强

支持多种图片来源：
- `local` - 本地文件选择
- `unsplash` - Unsplash 图库搜索
- `ai` - AI 生成图片
- `vault` - Obsidian 保险库图片
- `cached` - 缓存图片
- `auto` - 自动检测文章第一张图片

**图片缓存**:
- 使用 `ImageCacheManager` 管理本地缓存
- 自动保存/恢复已选择的图片

### 7. 滚动阴影效果

- 标签栏和底部操作栏添加滚动监听
- 滚动超过 10px 时自动添加阴影效果
- 提升视觉层次感

### 8. 响应式优化

- 模态框宽度: `90vw`
- 最大宽度: `800px`
- 最小宽度: `400px`

---

## UI 组件结构

```
wp-publish-modal-v2
├── Header (标题栏)
├── API 警告提示 (仅 XML-RPC)
├── 两列布局容器
│   ├── 预览区 (左)
│   │   ├── 特色图片段落
│   │   ├── 摘要段落
│   │   ├── 标签段落
│   │   └── 文章内容段落
│   └── 面板区 (右)
│       ├── 设置面板 (可折叠)
│       │   ├── AI 辅助区域
│       │   └── 基本设置区域
│       └── 历史面板 (可折叠)
└── 底部操作栏
```

---

## 标签页系统

- **Settings (设置)**: 常规发布设置
- **Preview (预览)**: 文章预览模式

---

## Git 提交历史

| 提交 | 描述 |
|------|------|
| 161c180 | docs: complete Phase 7 and Phase 8 documentation |
| c09a9eb | feat(ui): add responsive layout optimizations |
| ade8272 | feat(ui): add local file picker with auto-crop support |
| 77770e0 | feat(ui): enhance editing interaction with save/cancel buttons and keyboard shortcuts |
| ef0a085 | feat(ui): implement collapsible and resizable panel system |
| 345b01e | feat(ui): implement four-section preview area with inline editing |

---

## 技术细节

### 新增依赖
- `imask` - 日期输入格式化
- `date-fns` - 日期处理

### 图片缓存
- 使用 `ImageCacheManager` 类管理缓存
- 支持按笔记路径存储和恢复

### 国际化
- 支持中/英文提示词模板
- 语言自动检测功能

---

## 待完成事项

- [ ] 完成 Phase 7-8 文档
- [ ] 响应式布局移动端适配
- [ ] 历史面板数据展示