# Obsidian WordPress Publisher - 开发流程说明

## 📋 项目概述

这是一个 Obsidian 插件，用于将笔记一键发布到 WordPress。支持文章/页面发布、智能 Slug 生成、特色图片选择和 AI 功能集成。

## 🛠️ 技术栈

- **语言**: TypeScript
- **构建工具**: esbuild
- **测试框架**: Jest
- **版本管理**: standard-version
- **CI/CD**: GitHub Actions

## 🚀 快速开始

### 1. 环境准备

```bash
# 克隆仓库
git clone https://github.com/uu0/obsidian-wordpresspublisher.git
cd obsidian-wordpresspublisher

# 安装依赖
npm install
```

### 2. 开发模式

```bash
# 启动开发模式（自动监听文件变化并重新构建）
npm run dev
```

开发模式会：
- 监听 `src/` 目录下的文件变化
- 自动重新编译生成 `main.js`
- 需要在 Obsidian 中手动重载插件查看效果

### 3. 开发后检查

```bash
# 运行测试 + 构建（推荐每次开发后执行）
npm run check
```

这个命令会：
1. 运行所有测试用例
2. 执行生产构建
3. 确保代码质量

## 🧪 测试

```bash
# 运行所有测试
npm test

# 监听模式（开发时推荐）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

## 📦 构建

```bash
# 开发构建
npm run dev

# 生产构建（包含类型检查）
npm run build
```

## 📝 Commit 规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 重构（既不是新功能也不是 Bug 修复）
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具/依赖更新
- `revert`: 回滚之前的 commit

### 示例

```bash
# 新功能
git commit -m "feat: 添加批量发布功能"

# Bug 修复
git commit -m "fix: 修复特色图片上传失败问题"

# 文档更新
git commit -m "docs: 更新 README 安装说明"

# 重构
git commit -m "refactor: 优化 WordPress API 调用逻辑"
```

## 🔄 版本发布流程

### 1. 确保代码质量

```bash
# 运行测试和构建
npm run check
```

### 2. 生成版本和 CHANGELOG

```bash
# 自动升级版本（根据 commit 类型判断）
npm run release

# 或指定版本类型
npm run release-major    # 1.0.0 -> 2.0.0
npm run release-minor    # 1.0.0 -> 1.1.0
# patch 版本由 npm run release 自动判断
```

这个命令会：
- 分析 commit 历史，自动升级版本号
- 更新 `package.json`、`manifest.json`、`versions.json`
- 生成/更新 `CHANGELOG.md`
- 创建 git commit 和 tag

### 3. 推送到 GitHub

```bash
# 推送 commits 和 tags
git push --follow-tags origin dev
```

### 4. 自动发布

推送后，GitHub Actions 会自动：
1. 运行测试
2. 执行构建
3. 创建 GitHub Release
4. 上传 `main.js`、`manifest.json`、`styles.css`

## 🌿 分支管理

- `main`: 稳定版本分支
- `dev`: 开发分支（日常开发在此进行）
- `feature/*`: 功能分支
- `fix/*`: Bug 修复分支

### 工作流程

```bash
# 1. 从 dev 创建功能分支
git checkout dev
git pull origin dev
git checkout -b feature/new-feature

# 2. 开发 + 提交
npm run dev
# ... 开发 ...
npm run check
git add .
git commit -m "feat: 添加新功能"

# 3. 合并到 dev
git checkout dev
git merge feature/new-feature
git push origin dev

# 4. 发布版本（在 dev 分支）
npm run check
npm run release
git push --follow-tags origin dev

# 5. 合并到 main（可选，用于稳定版本）
git checkout main
git merge dev
git push origin main
```

## 📂 项目结构

```
obsidian-wordpresspublisher/
├── src/                    # 源代码
│   ├── main.ts            # 插件入口
│   ├── settings.ts        # 设置面板
│   ├── publisher.ts       # 发布逻辑
│   └── ...
├── tests/                 # 测试文件
├── docs/                  # 文档
│   ├── WORKFLOW.md       # 工作流程说明
│   └── DEVELOPMENT.md    # 开发流程说明（本文件）
├── scripts/              # 脚本工具
│   └── post-dev.sh       # 开发后检查脚本
├── .github/
│   └── workflows/
│       └── release.yml   # 自动发布工作流
├── main.js               # 构建产物
├── manifest.json         # 插件清单
├── package.json          # 项目配置
├── tsconfig.json         # TypeScript 配置
├── jest.config.js        # Jest 配置
├── .commitlintrc.json    # Commit 规范配置
└── CHANGELOG.md          # 变更日志
```

## 🔧 常见问题

### Q: 如何在 Obsidian 中测试插件？

A:
1. 将项目克隆到 Obsidian vault 的 `.obsidian/plugins/` 目录
2. 运行 `npm run dev` 启动开发模式
3. 在 Obsidian 中启用插件
4. 修改代码后，在 Obsidian 中按 `Ctrl+R` (Windows/Linux) 或 `Cmd+R` (Mac) 重载插件

### Q: 测试失败怎么办？

A:
```bash
# 查看详细错误信息
npm test

# 或使用监听模式逐个修复
npm run test:watch
```

### Q: 如何预览版本发布？

A:
```bash
# 预览版本升级和 CHANGELOG（不会实际修改文件）
npm run release-test
npm run release-major-test
npm run release-minor-test
```

### Q: GitHub Actions 发布失败？

A: 检查：
1. 是否推送了 tag？`git push --follow-tags`
2. 测试是否通过？本地运行 `npm run check`
3. 查看 GitHub Actions 日志获取详细错误信息

## 📚 相关文档

- [工作流程说明](./WORKFLOW.md) - 日常开发命令和流程
- [Obsidian 插件开发文档](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [standard-version](https://github.com/conventional-changelog/standard-version)

## 🤝 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: 添加某个很棒的功能'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](../LICENSE) 文件
