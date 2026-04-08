# Obsidian 官方插件市场上架材料

> 本文件包含提交 WordPress Publisher 到 Obsidian 社区插件市场所需的全部材料。
> 审核员反馈修正：① plugin ID 去掉 obsidian 前缀 → `wordpress-publisher`；② description 去掉 Obsidian 字样；③ PR 正文改用官方模板格式。

---

## 一、manifest.json 最终确认

```json
{
  "id": "wordpress-publisher",
  "name": "WordPress Publisher",
  "version": "2.0.0",
  "minAppVersion": "1.1.1",
  "description": "Publish notes to WordPress with one click. Supports post/page publishing, smart slug generation, featured image selection, and AI integration.",
  "author": "uu0",
  "authorUrl": "https://github.com/uu0",
  "isDesktopOnly": false
}
```

---

## 二、community-plugins.json 条目

在 `community-plugins.json` 末尾追加（注意前一条末尾加逗号）：

```json
  {
    "id": "wordpress-publisher",
    "name": "WordPress Publisher",
    "author": "uu0",
    "description": "Publish notes to WordPress with one click. Supports post/page publishing, smart slug generation, featured image selection, and AI integration.",
    "repo": "uu0/obsidian-wordpresspublisher"
  }
```

---

## 三、Pull Request 正文（官方模板）

**PR 标题：**
```
Add plugin: WordPress Publisher
```

**PR 正文（直接复制粘贴到 GitHub PR 描述框）：**

---

I am submitting a new Community Plugin

- [x] I have tested the plugin on the following platforms:
  - [x] Windows
  - [x] macOS
  - [ ] Linux
  - [x] Android *(if applicable)*
  - [x] iOS *(if applicable)*

My plugin: https://github.com/uu0/obsidian-wordpresspublisher

- [x] My GitHub release contains all required files (as separate files, not just in the source.zip / source.tar.gz)
  - [x] `main.js`
  - [x] `manifest.json`
  - [x] `styles.css`
- [x] The release name matches the exact version number specified in my `manifest.json` (`2.0.0`, no `v` prefix)
- [x] The `id` in my `manifest.json` matches the `id` in `community-plugins.json` (`wordpress-publisher`)
- [x] My `README.md` describes what the plugin does and provides clear usage instructions
- [x] I have read the developer policies at https://docs.obsidian.md/Developer+policies and assessed my plugin's compliance
- [x] I have read the tips at https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines and have self-reviewed my plugin to avoid common issues
- [x] I have added a license in my `LICENSE` file (GPL-3.0)
- [x] My project respects and is compatible with the original license of any other plugin code it uses. I have given proper attribution in my `README.md` for these other projects.

> This plugin is based on [obsidian-wordpress](https://github.com/devbean/obsidian-wordpress) by devbean (GPL-3.0), and is licensed under GPL-3.0 accordingly.

---

## 四、提交步骤

1. Fork https://github.com/obsidianmd/obsidian-releases
2. 编辑 `community-plugins.json`，在末尾追加「二」中的条目
3. Commit 信息：`Add plugin: WordPress Publisher`
4. 向 `obsidianmd/obsidian-releases` 的 `master` 分支发起 PR
5. PR 标题和正文使用「三」中的内容

---

## 五、自检清单

### Release 资产（必须包含）
- [x] `main.js`
- [x] `styles.css`
- [x] `manifest.json`
- Release URL: https://github.com/uu0/obsidian-wordpresspublisher/releases/tag/2.0.0

### 审核常见问题
| 问题 | 状态 |
|------|------|
| Plugin ID 包含 `obsidian` | ✅ 已修正 → `wordpress-publisher` |
| Description 包含 `Obsidian` | ✅ 已修正 |
| PR 未使用官方模板 | ✅ 已修正 |
| 基于他人插件未注明 | ✅ README 和 PR 正文均已注明 GPL-3.0 归属 |

---

*生成时间：2026-03-15*
