# WordPress Publisher UI 优化任务拆解计划 v3

> 基于用户反馈和 MENU-ORGANIZATION-DESIGN 更新的任务拆解计划
> 更新时间：2026-03-14 18:45
>
> **主要改进**：
> - 整合菜单组织设计的改进建议
> - 优化特色图片按钮顺序（按使用频率）
> - 添加 AI 侧边栏折叠功能
> - 改进折叠状态管理（使用插件设置而非 localStorage）
> - 增强本地图片选择功能（添加预览和裁剪）

## 核心数据流分析

### 当前系统的数据流

```
UI 输入 → params 对象 → WordPress API → frontmatter 更新
   ↓                                           ↑
   └──────── updateMatterData() ──────────────┘
```

### 关键数据同步点

1. **UI 输入处理**：用户在 UI 中修改数据时，需要实时更新 frontmatter
2. **发布操作**：发布成功后，同步 `postId`、`featuredImageId`、`slug` 等到 frontmatter
3. **冲突检测**：发布前检测本地和远端数据差异，用户选择保留哪一方

### 现有实现

- **updateMatterData 回调**：在 `abstract-wp-client.ts` 中，发布成功后调用此回调更新 frontmatter
- **冲突检测**：在 `frontmatter-manager.ts` 中实现，通过 `detectConflicts()` 方法检测冲突
- **冲突解决**：通过 `frontmatter-conflict-modal.ts` 弹窗让用户选择

---

## 阶段 1: 底部操作栏增强（2天）

### 任务 1.1: 添加草稿保存功能

**文件**：`src/wp-publish-modal-v2.ts`

**实现要点**：
- 新增方法：`saveDraft(params: WordPressPostParams)`
- 调用 WordPress API 保存草稿（`status: 'draft'`）
- 数据同步点：
  - 保存草稿后更新 `postId` 到 frontmatter
  - 如果有特色图片，同步 `featuredImageId`
  - 更新文章状态为 `draft`
  - 同步 `slug`、`categories`、`tags`、`excerpt` 到 frontmatter

**测试要点**：
- 验证草稿保存后 frontmatter 正确更新
- 验证再次打开时能加载草稿数据
- 验证草稿保存后可以继续编辑并发布

---

### 任务 1.2: 添加定时发布下拉菜单（取消预览功能）

**文件**：`src/wp-publish-modal-v2.ts`

**实现要点**：
- 新增方法：`createScheduleDropdown()`
- 下拉菜单选项：
  1. **立即发布**（默认）
  2. **定时发布**：弹出日期时间选择器
- **注意**：不要在这里添加"发布为新文章"选项

**数据同步点**：
- 定时发布时，更新发布日期到 frontmatter
- 发布成功后，同步 `postId`、`featuredImageId` 等

**UI 设计**：
```
┌─────────────────────────────────────┐
│ [保存草稿]  [▼ 立即发布]  [取消]   │
│              └─ 立即发布            │
│              └─ 定时发布...         │
└─────────────────────────────────────┘
```

---

### 任务 1.3: 添加可配置的键盘快捷键

**文件**：
- `src/plugin-settings.ts`：添加快捷键配置
- `src/wp-publish-modal-v2.ts`：实现快捷键监听

**实现要点**：

1. **插件设置中添加快捷键配置**：
```typescript
// src/plugin-settings.ts
export interface WordpressPluginSettings {
  // ... 现有配置
  keyboardShortcuts?: {
    saveDraft?: string;        // 默认: 'Mod+S'
    publish?: string;          // 默认: 'Mod+Enter'
    cancel?: string;           // 默认: 'Escape'
  };
}
```

2. **设置界面添加快捷键配置**：
- 使用 Obsidian 的 `addHotkey()` 方法
- 允许用户自定义快捷键
- 显示当前快捷键绑定

3. **模态框中监听快捷键**：
```typescript
// src/wp-publish-modal-v2.ts
private setupKeyboardShortcuts() {
  const shortcuts = this.plugin.settings.keyboardShortcuts || {};

  this.scope.register(
    shortcuts.saveDraft?.split('+') || ['Mod', 'S'],
    () => this.saveDraft(this.currentParams)
  );

  this.scope.register(
    shortcuts.publish?.split('+') || ['Mod', 'Enter'],
    () => this.handlePublish(this.currentParams)
  );

  this.scope.register(
    shortcuts.cancel?.split('+') || ['Escape'],
    () => this.close()
  );
}
```

**测试要点**：
- 验证默认快捷键工作正常
- 验证用户可以在设置中修改快捷键
- 验证快捷键冲突检测（与 Obsidian 其他快捷键冲突）

---

## 阶段 2: 冲突检测优化（1天）

### 任务 2.1: 修复冲突检测 Bug

**文件**：`src/frontmatter-manager.ts`

**问题描述**：
- 当远端或本地一方的标签/摘要为空时，不应触发冲突检测
- 例如：本地有标签 `['tag1']`，远端为空 `[]`，不应视为冲突

**修复方案**：
```typescript
// src/frontmatter-manager.ts
detectConflicts(localMatter: MatterData, remoteData: RemotePostData): FrontmatterConflict[] {
  const conflicts: FrontmatterConflict[] = [];

  // ... 其他字段检测

  // Check tags (只有双方都有值时才检测冲突)
  const localTags = this.normalizeToArray(localMatter.tags);
  const remoteTags = this.normalizeToArray(remoteData.tags);
  if (localTags.length > 0 && remoteTags.length > 0 && !this.arraysEqual(localTags, remoteTags)) {
    conflicts.push({
      field: 'tags',
      localValue: localTags,
      remoteValue: remoteTags
    });
  }

  // Check excerpt (只有双方都有值时才检测冲突)
  if (localMatter.excerpt && remoteData.excerpt && localMatter.excerpt !== remoteData.excerpt) {
    conflicts.push({
      field: 'excerpt',
      localValue: localMatter.excerpt,
      remoteValue: remoteData.excerpt
    });
  }

  return conflicts;
}
```

---

### 任务 2.2: 添加"本次发布前不再检测"选项

**文件**：`src/frontmatter-conflict-modal.ts`

**实现要点**：
- 在冲突解决弹窗中添加复选框："本次发布前不再检测冲突"
- 用户勾选后，将标志保存到会话状态（不持久化）
- 在 `abstract-wp-client.ts` 中检查此标志，跳过冲突检测

**实现代码**：
```typescript
// src/frontmatter-conflict-modal.ts
export class FrontmatterConflictModal extends Modal {
  private skipFutureChecks = false;

  onOpen(): void {
    // ... 现有代码

    // 添加复选框
    const skipContainer = contentEl.createDiv('wp-conflict-skip');
    new Setting(skipContainer)
      .setName(this.plugin.t('conflictModal_skipFutureChecks'))
      .addToggle(toggle => toggle
        .setValue(false)
        .onChange(value => {
          this.skipFutureChecks = value;
        })
      );

    // ... 按钮代码
  }

  onClose(): void {
    this.onResolve(this.resolution, this.skipFutureChecks);
  }
}

// 更新回调签名
export function openConflictModal(
  app: App,
  plugin: WordpressPlugin,
  conflicts: FrontmatterConflict[]
): Promise<{ resolution: ConflictResolution; skipFutureChecks: boolean }> {
  return new Promise((resolve) => {
    new FrontmatterConflictModal(
      app,
      plugin,
      conflicts,
      (resolution, skipFutureChecks) => resolve({ resolution, skipFutureChecks })
    ).open();
  });
}
```

**UI 设计**：
```
┌─────────────────────────────────────────┐
│ 检测到冲突                              │
│                                         │
│ 字段: 标签                              │
│ 本地值: tag1, tag2                      │
│ 远端值: tag3, tag4                      │
│                                         │
│ ☐ 本次发布前不再检测冲突                │
│                                         │
│ [使用本地值] [使用远端值] [取消]        │
└─────────────────────────────────────────┘
```

**实现代码**：
```typescript
// src/frontmatter-conflict-modal.ts
export class FrontmatterConflictModal extends Modal {
  private skipConflictCheck = false;

  onOpen(): void {
    // ... 现有代码

    // 添加"不再检测"复选框
    const skipCheckSetting = new Setting(optionsContainer)
      .setName(this.plugin.t('conflictModal_skipCheckName'))
      .setDesc(this.plugin.t('conflictModal_skipCheckDesc'))
      .addToggle(toggle => toggle
        .setValue(false)
        .onChange(value => {
          this.skipConflictCheck = value;
        })
      );

    // ... 现有按钮代码
  }

  onClose(): void {
    this.onResolve({
      resolution: this.resolution,
      skipFutureChecks: this.skipConflictCheck
    });
  }
}

// 修改返回类型
export interface ConflictResolutionResult {
  resolution: 'local' | 'remote' | 'cancel';
  skipFutureChecks: boolean;
}
```

```typescript
// src/abstract-wp-client.ts
private skipConflictCheckForSession = false;

async publishPost(...) {
  // ... 现有代码

  if (!this.skipConflictCheckForSession) {
    const conflicts = this.frontmatterManager.detectConflicts(matterData, remoteData);
    if (conflicts.length > 0) {
      const result = await openConflictModal(this.plugin.app, this.plugin, conflicts);

      if (result.skipFutureChecks) {
        this.skipConflictCheckForSession = true;
      }

      if (result.resolution === 'cancel') {
        // ... 取消发布
      }
    }
  }
}
```

---

## 阶段 3: 三段式布局（3天）

### 任务 3.1: 重构 Settings Tab 布局

**文件**：`src/wp-publish-modal-v2.ts`

**实现要点**：
- 将 Settings Tab 拆分为三个区域：
  1. **核心信息区**（始终展开）：标题、Slug、分类、标签
  2. **内容增强区**（可折叠，默认展开）：摘要、发布日期、评论状态
  3. **高级选项区**（可折叠，默认收起）：发布格式、发布为新文章
- **折叠状态管理**：保存到插件设置而非 localStorage（支持跨设备同步）

**UI 设计**：
```
┌─────────────────────────────────────┐
│ 核心信息                            │
│ ├─ 标题                             │
│ ├─ Slug                             │
│ ├─ 分类                             │
│ └─ 标签                             │
├─────────────────────────────────────┤
│ ▼ 内容增强                          │
│ ├─ 摘要                             │
│ ├─ 发布日期                         │
│ └─ 评论状态                         │
├─────────────────────────────────────┤
│ ▶ 高级选项                          │
│ ├─ 发布格式                         │
│ └─ 发布为新文章                     │
└─────────────────────────────────────┘
```

---

### 任务 3.2: 添加折叠状态管理

**文件**：
- `src/plugin-settings.ts`：添加折叠状态配置
- `src/wp-publish-modal-v2.ts`：实现折叠状态保存和恢复

**实现要点**：
```typescript
// src/plugin-settings.ts
export interface WordpressPluginSettings {
  // ... 现有配置
  uiPreferences?: {
    collapsedSections?: string[];  // ['content-enhancement', 'advanced']
    aiSidebarCollapsed?: boolean;
    lastActiveAITab?: 'featured-image' | 'excerpt' | 'tags';
  };
}
```

**优势**：
- 支持 Obsidian Sync 跨设备同步
- 符合 Obsidian 插件最佳实践
- 统一管理所有用户偏好

**数据同步**：
- 折叠状态保存到插件设置
- 不影响 frontmatter

---

### 任务 3.3: 实现区域折叠交互

**文件**：`src/wp-publish-modal-v2.ts`

**实现要点**：
- 新增方法：`renderCollapsibleSection(title, content, isExpanded, onToggle)`
- 点击标题切换展开/收起状态
- 保存折叠状态到 `plugin.settings.sectionStates`

**实现代码**：
```typescript
private renderCollapsibleSection(
  container: HTMLElement,
  sectionId: string,
  title: string,
  renderContent: (contentEl: HTMLElement) => void
): void {
  const section = container.createDiv('wp-collapsible-section');
  const isExpanded = !this.isCollapsed(sectionId);

  const header = section.createDiv('wp-section-header');
  header.onclick = async () => {
    await this.toggleCollapse(sectionId);
    this.display(this.currentParams);
  };

  header.createSpan({ text: isExpanded ? '▼' : '▶', cls: 'collapse-icon' });
  header.createSpan({ text: title, cls: 'section-title' });

  if (isExpanded) {
    const content = section.createDiv('wp-section-content');
    renderContent(content);
  }
}

private isCollapsed(sectionId: string): boolean {
  return this.plugin.settings.uiPreferences?.collapsedSections?.includes(sectionId) || false;
}

private async toggleCollapse(sectionId: string) {
  const prefs = this.plugin.settings.uiPreferences || { collapsedSections: [] };
  const collapsed = prefs.collapsedSections || [];

  if (collapsed.includes(sectionId)) {
    prefs.collapsedSections = collapsed.filter(id => id !== sectionId);
  } else {
    prefs.collapsedSections = [...collapsed, sectionId];
  }

  this.plugin.settings.uiPreferences = prefs;
  await this.plugin.saveSettings();
}
```

---

## 阶段 4: AI 助手侧边栏（3天）

### 任务 4.1: 创建侧边栏布局（含折叠功能）

**文件**：`src/wp-publish-modal-v2.ts`、`styles.css`

**实现要点**：
- 新增 CSS 类：`wp-settings-main-container`、`wp-ai-sidebar`
- 实现可折叠侧边栏（默认展开，状态保存到插件设置）
- 侧边栏宽度：展开 320px，折叠 40px
- 添加折叠/展开按钮

**UI 设计**：
```
┌────────────────────┬──────────────┐
│                    │ ◀            │  ← 折叠按钮
│  Settings Tab      │  AI 助手     │
│  (主要内容)        │  (侧边栏)    │
│                    │              │
│                    │  ▼ 特色图片  │
│                    │  ▶ 摘要      │
│                    │  ▶ 标签      │
│                    │              │
└────────────────────┴──────────────┘

折叠后：
┌────────────────────────┬─┐
│                        │▶│
│  Settings Tab          │ │
│  (主要内容)            │ │
│                        │ │
└────────────────────────┴─┘
```

**实现代码**：
```typescript
private renderAISidebar(container: HTMLElement, params: WordPressPostParams): void {
  const aiSidebar = container.createDiv('wp-ai-sidebar');
  const isCollapsed = this.plugin.settings.uiPreferences?.aiSidebarCollapsed || false;

  if (isCollapsed) {
    aiSidebar.addClass('collapsed');
  }

  // 折叠按钮
  const toggleBtn = aiSidebar.createEl('button', {
    text: isCollapsed ? '▶' : '◀',
    cls: 'wp-ai-sidebar-toggle'
  });

  toggleBtn.onclick = async () => {
    const prefs = this.plugin.settings.uiPreferences || {};
    prefs.aiSidebarCollapsed = !isCollapsed;
    this.plugin.settings.uiPreferences = prefs;
    await this.plugin.saveSettings();
    this.display(params);
  };

  if (!isCollapsed) {
    const content = aiSidebar.createDiv('wp-ai-sidebar-content');
    this.renderAITabs(content, params);
  }
}
```

**CSS 样式**：
```css
.wp-ai-sidebar {
  width: 320px;
  transition: width 0.2s;
}

.wp-ai-sidebar.collapsed {
  width: 40px;
  overflow: hidden;
}

.wp-ai-sidebar.collapsed .wp-ai-sidebar-content {
  display: none;
}

.wp-ai-sidebar-toggle {
  position: absolute;
  left: 8px;
  top: 8px;
  width: 24px;
  height: 24px;
  padding: 0;
  background: var(--background-secondary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.wp-ai-sidebar-toggle:hover {
  background: var(--background-modifier-hover);
}
```

---

### 任务 4.2: 集成 AI 功能到侧边栏

**文件**：`src/wp-publish-modal-v2.ts`

**实现要点**：
- 将现有 AI 标签页功能移到侧边栏
- 保留折叠/展开功能
- **关键数据同步点**：
  - AI 生成摘要 → 填充到 `params.excerpt` → 需要同步到 frontmatter（如果用户保存）
  - AI 生成标签 → 填充到 `params.tags` → 需要同步到 frontmatter
  - AI 生成特色图片 → 上传到 WordPress → 获取 `featuredImageId` → 同步到 frontmatter

---

### 任务 4.3: 实现 AI 生成结果直接填充

**文件**：`src/wp-publish-modal-v2.ts`

**实现要点**：
- 修改 `generateExcerpt()`: 生成后直接填充到摘要输入框
- 修改 `generateTags()`: 生成后直接填充到标签输入框
- 修改 `generateFeaturedImage()`: 生成后直接显示在特色图片区域

**数据同步策略**：
- AI 生成的内容先填充到 UI（`params` 对象）
- 用户点击"保存草稿"或"发布"时，统一同步到 frontmatter
- 用户关闭弹窗时，如果有未保存的 AI 生成内容，提示用户

**实现代码**：
```typescript
private async generateExcerpt(params: WordPressPostParams): Promise<void> {
  // ... 生成摘要逻辑

  // 直接填充到 UI
  params.excerpt = generatedExcerpt;

  // 更新摘要输入框
  if (this.excerptInput) {
    this.excerptInput.value = generatedExcerpt;
  }

  // 标记为未保存
  this.hasUnsavedChanges = true;

  // 重新渲染
  this.display(params);
}
```

---

## 阶段 5: 标题栏快捷菜单（2天）

### 任务 5.1: 添加标题栏菜单按钮

**文件**：`src/wp-publish-modal-v2.ts`

**实现要点**：
- 新增方法：`renderTitleBarMenu()`
- 菜单项：
  1. 复制文章链接
  2. 在 WordPress 中编辑
  3. 删除文章
  4. 刷新分类/标签

**UI 设计**：
```
┌─────────────────────────────────────┐
│ 发布到 WordPress          [⋮]      │
│                           └─ 复制链接
│                           └─ 在 WP 中编辑
│                           └─ 删除文章
│                           └─ 刷新分类/标签
└─────────────────────────────────────┘
```

---

### 任务 5.2: 实现删除文章功能

**文件**：`src/wp-publish-modal-v2.ts`、`src/abstract-wp-client.ts`

**实现要点**：
- 新增方法：`deletePost()`
- 调用 WordPress API 删除文章
- **关键数据同步点**：
  - 删除成功后，清除 frontmatter 中的：
    - `postId`
    - `featuredImageId`
    - `slug`（可选）
  - 清除图片缓存：`imageCacheManager.clearCache(postId)`

**实现代码**：
```typescript
private async deletePost(): Promise<void> {
  const postId = this.matterData.postId;
  if (!postId) {
    new Notice(this.t('notice_noPostToDelete'));
    return;
  }

  // 确认删除
  const confirmed = await this.confirmDelete();
  if (!confirmed) return;

  try {
    // 调用 WordPress API 删除
    await this.wpClient.deletePost(postId);

    // 清除 frontmatter
    await this.app.fileManager.processFrontMatter(this.file, (fm) => {
      delete fm.postId;
      delete fm.featuredImageId;
      delete fm.slug;
    });

    // 清除图片缓存
    await this.imageCacheManager.clearCache(postId);

    new Notice(this.t('notice_postDeleted'));
    this.close();
  } catch (error) {
    new Notice(this.t('notice_deletePostFailed', { error: error.message }));
  }
}
```

---

## 阶段 6: 特色图片管理增强（1天）

### 任务 6.1: 添加本地图片选择功能

**文件**：`src/wp-publish-modal-v2.ts`

**问题描述**：
- 当前特色图片管理中缺少"本地图片"选项
- 用户无法从本地文件系统选择图片

**实现要点**：
- 在特色图片按钮行中添加"本地图片"按钮
- 使用 `<input type="file">` 让用户选择本地图片
- 读取图片文件并转换为 ArrayBuffer
- 保存到 `this.featuredImage`

**UI 设计**：
```
┌─────────────────────────────────────┐
│ 特色图片                            │
│ [📁 本地图片] [📚 笔记库] [🖼️ Unsplash] [🤖 AI 生成] │
└─────────────────────────────────────┘
```

**实现代码**：
```typescript
private async selectLocalImage(params: WordPressPostParams): Promise<void> {
  // 创建文件输入元素
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';

  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      // 读取文件
      const arrayBuffer = await file.arrayBuffer();

      // 保存到 featuredImage
      this.featuredImage = {
        fileName: file.name,
        mimeType: file.type,
        content: arrayBuffer,
        width: 1200  // 可以通过 Image 对象获取实际宽度
      };

      this.imageSource = 'local';

      // 保存到缓存
      await this.saveImageToCache(arrayBuffer, file.name, file.type, 'local');

      // 重新渲染
      this.display(params);

      new Notice(this.t('publishModal_imageSelected'));
    } catch (error) {
      new Notice(this.t('publishModal_imageLoadFailed', { error: error.message }));
    }
  };

  // 触发文件选择
  input.click();
}
```

**按钮顺序优化**（按使用频率排序）：
```typescript
// 在 renderAIFeaturedImageTab() 方法中
const btnRow = container.createDiv('featured-image-btn-row');

// 1. 笔记库图片（最常用）
const vaultBtn = btnRow.createEl('button', {
  text: '📚 ' + this.t('publishModal_selectFromVault'),
  cls: 'feature-btn'
});
vaultBtn.onclick = () => this.selectVaultImage(params);

// 2. 本地图片（次常用）
// 2. 本地图片（次常用）
const localBtn = btnRow.createEl('button', {
  text: '📁 ' + this.t('publishModal_selectLocalImage'),
  cls: 'feature-btn'
});
localBtn.onclick = () => this.selectLocalImage(params);

// 3. Unsplash（辅助功能）
if (this.unsplashService) {
  const unsplashBtn = btnRow.createEl('button', {
    text: '🖼️ Unsplash',
    cls: 'feature-btn'
  });
  unsplashBtn.onclick = () => this.selectUnsplashImage(params);
}

// 4. AI 生成（辅助功能）
if (this.aiService?.hasImageAIKey()) {
  const aiBtn = btnRow.createEl('button', {
    text: '🤖 ' + this.t('publishModal_aiGenerate'),
    cls: 'feature-btn'
  });
  aiBtn.onclick = () => this.generateFeaturedImage(params);
}
```

---

### 任务 6.2: 添加图片预览和简单裁剪功能

**文件**：`src/wp-publish-modal-v2.ts`

**实现要点**：
- 选择图片后显示预览
- 提供简单的宽度调整（保持比例）
- 可选：添加基本的裁剪功能（使用 Canvas API）

**实现代码**：
```typescript
private async selectLocalImage(params: WordPressPostParams): Promise<void> {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';

  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      // 读取并预览图片
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: file.type });
      const imageUrl = URL.createObjectURL(blob);

      // 获取图片尺寸
      const img = new Image();
      img.src = imageUrl;
      await new Promise((resolve) => { img.onload = resolve; });

      // 显示预览和尺寸调整对话框
      const targetWidth = await this.showImagePreviewModal(imageUrl, img.width, img.height);

      if (!targetWidth) {
        URL.revokeObjectURL(imageUrl);
        return;
      }

      // 如果需要调整尺寸，使用 Canvas
      let finalBuffer = arrayBuffer;
      if (targetWidth !== img.width) {
        finalBuffer = await this.resizeImage(arrayBuffer, file.type, targetWidth);
      }

      this.featuredImage = {
        fileName: file.name,
        mimeType: file.type,
        content: finalBuffer,
        width: targetWidth
      };

      this.imageSource = 'local';
      await this.saveImageToCache(finalBuffer, file.name, file.type, 'local');

      URL.revokeObjectURL(imageUrl);
      this.display(params);
      new Notice(this.t('publishModal_imageSelected'));
    } catch (error) {
      new Notice(this.t('publishModal_imageLoadFailed', { error: error.message }));
    }
  };

  input.click();
}

private async resizeImage(buffer: ArrayBuffer, mimeType: string, targetWidth: number): Promise<ArrayBuffer> {
  const blob = new Blob([buffer], { type: mimeType });
  const imageUrl = URL.createObjectURL(blob);

  const img = new Image();
  img.src = imageUrl;
  await new Promise((resolve) => { img.onload = resolve; });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const ratio = targetWidth / img.width;
  canvas.width = targetWidth;
  canvas.height = img.height * ratio;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  URL.revokeObjectURL(imageUrl);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      blob!.arrayBuffer().then(resolve);
    }, mimeType);
  });
}
```

**测试要点**：
- 验证图片选择和预览功能
- 验证图片尺寸调整功能
- 验证调整后的图片质量
- 验证大图片的处理性能
```

---

## 数据同步核心机制

### 统一的数据同步流程

```typescript
// 1. 用户在 UI 中修改数据
params.title = newTitle;

// 2. 点击发布/草稿按钮
async handlePublish(params) {
  // 发送到 WordPress
  const result = await wpClient.createOrUpdatePost(params);

  // 3. 更新 frontmatter
  const updates: Partial<MatterData> = {
    postId: result.id,
    slug: params.slug,
    categories: params.categories,
    tags: params.tags,
    excerpt: params.excerpt,
  };

  // 如果有特色图片，同步 ID
  if (this.featuredImage) {
    updates.featuredImageId = result.featuredImageId;
  }

  // 调用 updateMatterData 回调
  updateMatterData(updates);
}
```

### UI 输入实时同步

**现有实现**：
- 在 `abstract-wp-client.ts` 中，发布成功后通过 `updateMatterData` 回调更新 frontmatter
- 用户在 UI 中修改数据时，数据保存在 `params` 对象中
- 只有在发布/保存草稿时，才会同步到 frontmatter

**需要保留的功能**：
- UI 输入处理 frontmatter 更新的现有实现
- 确保用户在 UI 中的修改能够正确同步到 frontmatter

---

## 测试计划

### 单元测试

1. **冲突检测测试**：
   - 测试空值不触发冲突
   - 测试"不再检测"标志生效
   - 测试冲突解决后 frontmatter 正确更新

2. **数据同步测试**：
   - 测试草稿保存后 frontmatter 更新
   - 测试发布后 frontmatter 更新
   - 测试 AI 生成内容同步

3. **快捷键测试**：
   - 测试默认快捷键
   - 测试自定义快捷键
   - 测试快捷键冲突

### 集成测试

1. **完整发布流程**：
   - 创建新文章 → 保存草稿 → 编辑 → 发布 → 验证 frontmatter
   - 编辑已发布文章 → 检测冲突 → 解决冲突 → 发布 → 验证 frontmatter

2. **AI 功能测试**：
   - 生成摘要 → 填充到 UI → 保存草稿 → 验证 frontmatter
   - 生成标签 → 填充到 UI → 发布 → 验证 frontmatter
   - 生成特色图片 → 上传 → 发布 → 验证 frontmatter

3. **特色图片测试**：
   - 本地图片 → 上传 → 发布 → 验证 frontmatter
   - 笔记库图片 → 上传 → 发布 → 验证 frontmatter
   - Unsplash 图片 → 下载 → 上传 → 发布 → 验证 frontmatter
   - AI 生成图片 → 上传 → 发布 → 验证 frontmatter

---

## 风险评估

### 高风险项

1. **数据同步一致性**：
   - 风险：UI 输入和 frontmatter 不同步
   - 缓解：统一使用 `updateMatterData` 回调，确保所有数据修改都经过此回调

2. **冲突检测逻辑**：
   - 风险：修改后引入新的 bug
   - 缓解：充分测试各种边界情况（空值、null、undefined）

3. **快捷键冲突**：
   - 风险：与 Obsidian 或其他插件的快捷键冲突
   - 缓解：提供冲突检测和自定义快捷键功能

### 中风险项

1. **折叠状态管理**：
   - 风险：折叠状态丢失或不正确
   - 缓解：保存到插件设置，确保持久化

2. **AI 生成内容未保存**：
   - 风险：用户关闭弹窗时丢失 AI 生成的内容
   - 缓解：添加未保存提示

---

## 时间估算

| 阶段 | 任务 | 预计时间 |
|------|------|----------|
| 阶段 1 | 底部操作栏增强 | 2天 |
| 阶段 2 | 冲突检测优化 | 1天 |
| 阶段 3 | 三段式布局 | 3天 |
| 阶段 4 | AI 助手侧边栏 | 3天 |
| 阶段 5 | 标题栏快捷菜单 | 2天 |
| 阶段 6 | 特色图片管理增强 | 1天 |
| **总计** | | **12天** |

---

## 总结

本任务拆解计划基于用户反馈进行了以下修正：

1. ✅ **保留 UI 输入处理 frontmatter 更新**：确保现有实现不被破坏
2. ✅ **修复冲突检测 bug**：空值不触发冲突，添加"不再检测"选项
3. ✅ **取消预览功能**：任务 1.2 已移除
4. ✅ **调整定时发布菜单**："发布为新文章"移到设置区域
5. ✅ **快捷键可配置**：用户可以在插件设置中自定义快捷键
6. ✅ **添加本地图片选择**：特色图片管理中增加本地图片选项

所有任务都明确了数据同步点和测试要点，确保实现过程中不会遗漏关键功能。
