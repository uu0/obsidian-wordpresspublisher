# Obsidian 官方插件市场上架材料

> 本文件包含提交 WordPress Publisher 到 Obsidian 社区插件市场所需的全部材料。

---

## 一、提交前：manifest.json 最终确认

```json
{
  "id": "obsidian-wordpresspublisher",
  "name": "WordPress Publisher",
  "version": "2.0.0",
  "minAppVersion": "1.1.1",
  "description": "Publish Obsidian notes to WordPress with one click. Supports post/page publishing, smart slug generation, featured image selection, and AI integration.",
  "author": "uu0",
  "authorUrl": "https://github.com/uu0",
  "isDesktopOnly": false
}
```

**字段说明：**
- `id`：唯一标识符，需与仓库中 manifest.json 完全一致
- `minAppVersion: "1.1.1"`：Obsidian 最低版本要求（当前安全值）
- `isDesktopOnly: false`：插件支持桌面端 + 移动端

---

## 二、community-plugins.json 条目

Fork `obsidian-releases` 后，在 `community-plugins.json` 文件末尾的 `]` 之前，追加如下条目（注意前一条末尾加逗号）：

```json
  {
    "id": "obsidian-wordpresspublisher",
    "name": "WordPress Publisher",
    "author": "uu0",
    "description": "Publish Obsidian notes to WordPress with one click. Supports post/page publishing, smart slug generation, featured image selection, and AI integration.",
    "repo": "uu0/obsidian-wordpresspublisher"
  }
```

**注意：** 该条目中不包含 `version` 字段，Obsidian 会自动从仓库的 `manifest.json` 读取版本号。

---

## 三、Pull Request 正文

**PR 标题：**
```
Add plugin: WordPress Publisher
```

**PR 正文（直接复制粘贴）：**

---

### Plugin info

| Field | Value |
|-------|-------|
| **Plugin name** | WordPress Publisher |
| **Plugin ID** | `obsidian-wordpresspublisher` |
| **Author** | uu0 |
| **Repository** | https://github.com/uu0/obsidian-wordpresspublisher |
| **Version submitted** | 2.0.0 |
| **Minimum Obsidian version** | 1.1.1 |
| **Desktop only** | No |
| **License** | GPL-3.0 |

### Description

WordPress Publisher is an Obsidian plugin that lets users publish Markdown notes directly to WordPress with a single click. It features a modern dual-pane publishing interface, intelligent slug generation (Pinyin conversion or AI translation), three featured image methods (local/Unsplash/AI-generated), and full AI service integration (OpenAI / Claude) for automated excerpts, tag generation, and image prompts.

This plugin is based on [obsidian-wordpress](https://github.com/devbean/obsidian-wordpress) by devbean (GPL-3.0), and is licensed under GPL-3.0 accordingly.

### Checklist

- [x] My plugin ID is unique and does not conflict with existing plugins
- [x] My plugin ID only contains lowercase alphanumeric characters and hyphens
- [x] My `manifest.json` includes all required fields (`id`, `name`, `version`, `minAppVersion`, `description`, `author`)
- [x] My `manifest.json` `version` matches the latest GitHub release tag (`2.0.0`)
- [x] My latest release includes `main.js`, `manifest.json`, and `styles.css` as release assets
- [x] My plugin does not use `eval()` or dynamic code execution
- [x] My plugin does not include `node_modules` in the repository
- [x] My README includes installation instructions
- [x] My README is written in English (with optional additional translations)
- [x] I have tested my plugin with the latest version of Obsidian
- [x] I have read and complied with the [developer policies](https://docs.obsidian.md/Developer+policies)
- [x] I have read and complied with the [submission requirements](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins)
- [x] My plugin collects no personal data without explicit user consent
- [x] External network requests are limited to user-configured services (WordPress API, OpenAI API, Claude API, Unsplash API)

---

## 四、提交步骤（操作手册）

### Step 1 — Fork obsidian-releases

访问 https://github.com/obsidianmd/obsidian-releases  
点击右上角 **Fork**，fork 到你自己的账号下。

### Step 2 — 编辑 community-plugins.json

在你 fork 的仓库中，打开 `community-plugins.json`，  
找到文件末尾的最后一个条目（以 `}` 结尾），  
在其后加一个逗号，然后粘贴上方「二」中的 JSON 条目。

**示例：末尾追加方式**
```json
  ...
  {
    "id": "last-existing-plugin",
    "name": "...",
    ...
  },
  {
    "id": "obsidian-wordpresspublisher",
    "name": "WordPress Publisher",
    "author": "uu0",
    "description": "Publish Obsidian notes to WordPress with one click. Supports post/page publishing, smart slug generation, featured image selection, and AI integration.",
    "repo": "uu0/obsidian-wordpresspublisher"
  }
]
```

### Step 3 — 提交 PR

1. Commit 信息：`Add plugin: WordPress Publisher`
2. 向 `obsidianmd/obsidian-releases` 的 `master` 分支发起 Pull Request
3. PR 标题：`Add plugin: WordPress Publisher`
4. PR 正文：复制上方「三」的内容

### Step 4 — 等待审核

- 官方团队通常在 **1–4 周** 内审核
- 审核期间可能会在 PR 中留下评论要求修改
- 审核通过后插件会自动出现在 Obsidian 社区插件列表中

---

## 五、提交前自检清单

提交前逐项确认：

### 仓库结构
- [x] `main.js` — 已编译的插件主文件
- [x] `styles.css` — 插件样式文件
- [x] `manifest.json` — 插件元信息，版本与 Release tag 一致（2.0.0）
- [x] `versions.json` — 版本兼容性记录
- [x] `README.md` — 英文文档（主 README）
- [x] `README_zh.md` — 中文文档
- [x] `CHANGELOG.md` — 变更日志
- [x] License 文件（GPL-3.0）

### Release 资产（必须包含以下 3 个文件）
- [x] `main.js`
- [x] `styles.css`
- [x] `manifest.json`
- GitHub Release URL: https://github.com/uu0/obsidian-wordpresspublisher/releases/tag/2.0.0

### 代码合规
- [x] 无 `eval()` / `Function()` 动态执行代码
- [x] 无 `node_modules` 跟踪到仓库
- [x] 无 `docs/` 等无关文件（已加入 .gitignore）
- [x] 外部请求仅限用户配置的服务（WordPress / OpenAI / Claude / Unsplash）
- [x] API Key 采用 AES-256-GCM 加密存储，不以明文持久化
- [x] 无数据追踪 / 无遥测 / 无用户行为上报

### README 合规
- [x] 英文主 README
- [x] 包含安装说明（手动安装 + 从源码构建）
- [x] 包含配置说明（WordPress 连接配置）
- [x] 包含功能截图或功能列表
- [x] 包含许可证说明（GPL-3.0）

---

## 六、潜在审核风险提示

| 风险点 | 状态 | 说明 |
|--------|------|------|
| 插件名与已有插件重名 | ✅ 已确认无冲突 | 社区中存在 `obsidian-wordpress` (devbean) 但 ID 不同 |
| `minAppVersion` 过低 | ✅ 正常 | 1.1.1 是安全的最低版本 |
| README 仅中文 | ✅ 已修复 | README.md 为英文，README_zh.md 为中文 |
| 外部服务依赖未说明 | ✅ 已在 README 中说明 | 需要用户自行配置 WordPress / AI API |
| 基于他人插件 | ✅ 合规 | 基于 devbean/obsidian-wordpress（GPL-3.0），本插件同样使用 GPL-3.0，协议兼容，README 中已注明来源 |

> **关于 devbean/obsidian-wordpress 的基础：** 原插件使用 MIT 协议，我们在 README 中已明确注明基础来源。只要遵守 MIT 协议（保留版权声明），合规上没有问题。建议在 PR 描述中主动说明这一点，避免审核员困惑。

---

*生成时间：2026-03-15*
