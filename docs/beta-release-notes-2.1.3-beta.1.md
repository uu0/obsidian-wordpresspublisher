# Beta 发布说明草稿 — 2.1.3-beta.1

> 状态：**测试版（Beta）**，未正式发布，未推送远程仓库。
> 版本号：`2.1.3-beta.1`（manifest.json / package.json 一致）
> 对应 git 提交：`05f3f0d`（`chore(release): 2.1.3-beta.1`）
> 标签：`2.1.3-beta.1`（固定） / `beta`（移动，供 BRAT 追踪）

---

## 一、这个测试版有什么

本次 beta **只包含内部重构，没有新功能、没有破坏性变更、没有用户可见的行为变化**：

- 把发布弹窗（`WpPublishModalV2`）里约 900 行内联的 V3.1 渲染逻辑，拆分成了 3 个职责单一的组件类 + 1 个共享布局工具 + 1 个宿主接口：
  - `FeaturedImageSection` — 特色图片选择 / 拖拽 / 远程加载状态 / 预览
  - `ContentPreviewSection` — Markdown 预览 + 内联摘要编辑 + 标签编辑（增删 / 拖拽排序）
  - `SettingsSidebar` — 基础设置卡 + 可折叠历史卡
  - `v3-layout.ts` — `createV3Section` / `renderV3Field` / `addV3HintBtn`
  - `publish-modal-context.ts` — `PublishModalContext` 接口（组件只依赖接口，不依赖弹窗类）
- 弹窗类本身从 2499 行降到 1602 行，只保留"编排 + 图片加载/选择 + AI 生成 + 发布 + frontmatter + 日期遮罩"等指挥逻辑。
- 顺手修了两个历史 bug：
  - 定时发布（Future 状态）原本有一段递归调用 `ctx.display(params)` 的占位死代码，现已改为正确调用 `setupDateMask`。
  - `publish-modal-context.ts` 对 `WordpressPlugin` 的导入方式错误（命名导入），已改为默认类型导入。

**为什么值得测**：代码被搬动了位置、并新增了组件边界。运行时行为理论上不变，但我们需要确认拆分之后的渲染、交互、事件接线在真实环境里和拆分前一致。

---

## 二、如何安装这个测试版（BRAT）

1. 在 Obsidian 商店安装 **Beta Reviewer's Auto-update Tool（BRAT）**。
2. 命令面板 → `BRAT: Add a beta plugin for testing` → 填入本仓库地址。
3. 分支/标签选择 `beta`（或直接填 `2.1.3-beta.1`）。
4. 启用插件，重载。

> 非正式发布，请勿在"社区插件商店"里寻找；也请勿用于生产笔记的正式发布，除非你已自行验证。

---

## 三、建议重点测试的内容

| 区域 | 测什么 |
|---|---|
| 特色图片 | 本地选图、仓库选图、Unsplash、AI 生成；拖拽图片进弹窗；远程图片加载中 / 失败重试 / 跳过；删除已选图片 |
| 内容预览 | Markdown 正确渲染；点 ✏️ 进入内容编辑、保存 / 取消；摘要行 AI 生成与手动输入；标签增删、拖拽排序、编辑模式 |
| 设置栏 | 标题 / Slug（自动清理特殊字符）；状态切到"定时"出现日期输入；评论开关；发布格式（HTML / Markdown）；分类增删；"发布为新文章"开关（仅已关联文章时出现） |
| 历史卡 | 默认折叠，点击标题展开 / 收起 |
| 发布 | 整体发布流程、进度提示、成功提示、错误卡片是否与拆分前一致 |

---

## 四、已知事项 / 风险点

- 为让组件通过 `PublishModalContext` 接口访问弹窗能力，原 `private` 的部分字段 / 方法已提升为 `public`（编译期由 `tsc` 校验接口一致性）。这是接口解耦的代价，不影响使用。
- 标签"拖拽排序"依赖指针事件与 `getBoundingClientRect`，单元测试环境（jsdom）难以覆盖，**真实交互请以手动测试为准**。
- 本 beta 未经生产数据验证，仅通过本地 `tsc` + 构建 + 161 项既有单测 + 新增的 section 组件单测。

---

## 五、反馈怎么给

- 问题请附带：触发步骤、控制台报错（若有）、obsidian 版本、本插件版本 `2.1.3-beta.1`。
- 回归（拆分前正常、拆分后异常）请明确标注"回归"，优先级最高。
- 反馈方式：仓库 Issue，或直接在此对话中告诉我。

---

## 六、正式版计划（正式发布时）

- 版本号去掉 `-beta.N`，升为干净号 `2.1.3`（纯内部重构属 semver patch）。
- 合并 beta 反馈修复后，打 `2.1.3` 标签并推送发布。
- 同步更新 `CHANGELOG.md` 的 beta 节结论到正式节。
