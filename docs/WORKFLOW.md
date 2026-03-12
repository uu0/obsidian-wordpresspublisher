# 开发工作流程

## 📋 Commit Message 规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

### 类型说明
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具配置

### 格式
```
<type>(<scope>): <subject>

<body>
```

### 示例
```bash
feat(slug): 添加智能拼音转换功能
fix(upload): 修复图片上传失败问题
docs: 更新 README 使用说明
perf(render): 优化渲染性能
```

---

## 🔄 开发流程

### 1️⃣ 功能开发/Bug 修复
```bash
# 开发完成后自动运行测试和构建
npm run check

# 提交到本地 git
git add .
git commit -m "feat: 添加新功能"
```

### 2️⃣ 推送到 GitHub
```bash
# 推送到远程仓库
git push origin dev
```

### 3️⃣ 版本发布
```bash
# 自动版本号递增 + 生成 CHANGELOG + 创建 tag
npm run release

# 推送 commits 和 tags
git push --follow-tags

# GitHub Actions 会自动：
# - 运行测试
# - 构建插件
# - 创建 Release
# - 上传构建产物
```

---

## 🎯 快捷命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式（监听文件变化） |
| `npm run build` | 生产构建 |
| `npm test` | 运行测试 |
| `npm run check` | 测试 + 构建（开发后必做） |
| `npm run release` | 自动发布版本（patch） |
| `npm run release-minor` | 发布 minor 版本 |
| `npm run release-major` | 发布 major 版本 |

---

## 📦 版本号规则

根据 commit 类型自动递增：

- `feat:` → **minor** 版本（1.0.x → 1.1.0）
- `fix:` → **patch** 版本（1.0.1 → 1.0.2）
- `BREAKING CHANGE:` → **major** 版本（1.x.x → 2.0.0）

---

## ✅ 发布前检查清单

- [ ] 所有测试通过（`npm test`）
- [ ] 构建成功（`npm run build`）
- [ ] 代码已提交到本地 git
- [ ] Commit message 符合规范
- [ ] 功能已在本地测试验证
