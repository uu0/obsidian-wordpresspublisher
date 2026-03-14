# 主题支持改进方案

## 问题分析

当前代码已经使用了 Obsidian 的 CSS 变量系统（`var(--background-primary)` 等），但存在以下硬编码颜色问题：

### 1. 标签颜色（第 30-40 行）
```typescript
const TAG_COLORS = [
  '#5B8FF9', // 蓝色 - 暗色主题下对比度不足
  '#5AD8A6', // 绿色
  '#F6BD16', // 黄色
  // ...
];
```

**问题：** 这些颜色在暗色主题下可能过于鲜艳或对比度不足。

### 2. 阴影效果（第 1690 行）
```typescript
tagEl.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
```

**问题：** 黑色阴影在亮色主题下正常，但在暗色主题下应该使用更亮的阴影。

### 3. 模态框背景（第 2016 行）
```typescript
background:rgba(0,0,0,0.5)
```

**问题：** 固定的黑色半透明背景在暗色主题下不够明显。

---

## 解决方案

### 方案 A：使用 CSS 变量（推荐）

#### 1. 修改标签颜色系统

**文件：** `src/wp-publish-modal-v2.ts`

```typescript
// 替换第 30-40 行
const TAG_COLORS_LIGHT = [
  '#5B8FF9', '#5AD8A6', '#F6BD16', '#E86452',
  '#6DC8EC', '#945FB9', '#FF9845', '#1E9493', '#FF99C3'
];

const TAG_COLORS_DARK = [
  '#7BA3FF', '#6FE8B8', '#FFD13D', '#FF7A6B',
  '#85D9F7', '#A87FD1', '#FFB066', '#3EAFAE', '#FFB3D9'
];

// 修改 getTagColor 函数（第 45-49 行）
function getTagColor(tagName: string): string {
  const hash = tagName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const isDark = document.body.classList.contains('theme-dark');
  const colors = isDark ? TAG_COLORS_DARK : TAG_COLORS_LIGHT;
  return colors[hash % colors.length];
}
```

#### 2. 修改阴影效果

**文件：** `src/wp-publish-modal-v2.ts` (第 1690 行)

```typescript
// 替换
tagEl.addEventListener('mouseenter', () => {
  tagEl.style.transform = 'translateY(-1px)';
  tagEl.style.boxShadow = '0 2px 8px var(--background-modifier-box-shadow)';
});
```

#### 3. 修改模态框背景

**文件：** `src/wp-publish-modal-v2.ts` (第 2016 行)

```typescript
// 替换
<div class="modal-bg" style="position:fixed;top:0;left:0;width:100%;height:100%;background:var(--background-modifier-cover);z-index:9999;">
```

---

### 方案 B：添加 CSS 自定义属性（更灵活）

**文件：** `styles.css`

```css
/* 在文件开头添加 */
:root {
  --wp-tag-color-1: #5B8FF9;
  --wp-tag-color-2: #5AD8A6;
  --wp-tag-color-3: #F6BD16;
  --wp-tag-color-4: #E86452;
  --wp-tag-color-5: #6DC8EC;
  --wp-tag-color-6: #945FB9;
  --wp-tag-color-7: #FF9845;
  --wp-tag-color-8: #1E9493;
  --wp-tag-color-9: #FF99C3;

  --wp-shadow-hover: 0 2px 8px rgba(0, 0, 0, 0.15);
  --wp-modal-overlay: rgba(0, 0, 0, 0.5);
}

.theme-dark {
  --wp-tag-color-1: #7BA3FF;
  --wp-tag-color-2: #6FE8B8;
  --wp-tag-color-3: #FFD13D;
  --wp-tag-color-4: #FF7A6B;
  --wp-tag-color-5: #85D9F7;
  --wp-tag-color-6: #A87FD1;
  --wp-tag-color-7: #FFB066;
  --wp-tag-color-8: #3EAFAE;
  --wp-tag-color-9: #FFB3D9;

  --wp-shadow-hover: 0 2px 8px rgba(255, 255, 255, 0.1);
  --wp-modal-overlay: rgba(0, 0, 0, 0.7);
}
```

然后在 TypeScript 中使用：

```typescript
// src/wp-publish-modal-v2.ts
const TAG_COLORS = [
  'var(--wp-tag-color-1)',
  'var(--wp-tag-color-2)',
  'var(--wp-tag-color-3)',
  'var(--wp-tag-color-4)',
  'var(--wp-tag-color-5)',
  'var(--wp-tag-color-6)',
  'var(--wp-tag-color-7)',
  'var(--wp-tag-color-8)',
  'var(--wp-tag-color-9)',
];
```

---

## 推荐方案

**使用方案 B（CSS 自定义属性）**，原因：

1. ✅ 更易维护 - 颜色集中在 CSS 文件中
2. ✅ 更灵活 - 用户可以通过 CSS snippet 自定义
3. ✅ 性能更好 - 不需要 JS 检测主题
4. ✅ 符合 Obsidian 最佳实践

---

## 测试清单

- [ ] 在亮色主题下测试标签颜色对比度
- [ ] 在暗色主题下测试标签颜色对比度
- [ ] 测试标签悬停阴影效果
- [ ] 测试模态框背景遮罩
- [ ] 测试特色图片加载骨架屏
- [ ] 测试 AI 生成按钮的禁用状态
- [ ] 在不同 Obsidian 主题下测试（Default、Minimal、Things 等）
