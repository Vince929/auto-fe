# auto-fe 使用手册

对话式完成前端全流程工作。直接描述需求 + 粘贴学城链接，AI 自动完成从需求分析、代码开发到发布部署的全部工作。

---

## 快速开始

1. CatPaw Agent 下载 auto-fe 并在 chat 中选择该 Agent
2. CatPaw 全局开启任务子代理
3. 对 AI 说：`帮我初始化 auto-fe`（后续更新说：`更新 auto-fe`）

---

## 🔬 前置建议：首次进入项目先做前端考古

> 非必须，但强烈建议首次使用时执行一次，后续 spec / dev 质量会明显更好。

调用 `/fe-archaeology` 或对 AI 说「对这个项目进行考古」，AI 会深度扫描项目结构，生成：
- `.catpaw/rules/project-context.md`：AI 每次对话自动加载的项目上下文
- `docs/`：架构、路由、组件、工具函数等专题文档

考古只需做一次，后续增量更新即可。

---

## 🧠 记忆系统（可选）

> 帮助 AI 跨会话记住你的偏好和项目上下文，避免每次重复交代背景。

### 初始化

```
/catpaw-memory
```

或对 AI 说「初始化记忆系统」，AI 会在用户层（`~/.catpaw/`）和项目层（`.catpaw/`）分别创建索引目录。初始化一次即可，后续会话自动加载。

### 命令说明

| 命令 | 自然语言触发 | 功能 |
|------|------------|------|
| `/catpaw-memory` | "初始化记忆系统" | 初始化目录和索引文件 |
| `/memory-remember` | "记住 X"、"下次也要这样" | 手动写入一条记忆 |
| `/memory-extract` | "提取记忆"、"总结这次对话" | 扫描会话、打分筛选、确认写入 |
| `/memory-review` | "审计记忆"、"清理记忆" | 审计所有记忆，提升或删除 |

### 记忆分层

| 层 | 存什么 | 作用域 |
|----|--------|--------|
| **用户层** | 个人偏好、工具习惯、AI 行为纠正 | 跨所有项目 |
| **项目层** | 业务背景、技术约定、稳定参考信息 | 当前项目 |

> 建议每次重要对话结束后运行 `/memory-extract` 沉淀经验，定期运行 `/memory-review` 清理过时记忆。


---

## 使用方式

### 1. SDD 流程（正式需求）

两个阶段依次执行，每个阶段独立可断点恢复：

```
spec ──[result/spec/tec-doc.md]──▶ dev
(需求分析)                        (代码开发 & 发布)
```

| 阶段 | 触发命令 | 职责 |
|------|---------|------|
| **spec** | `/auto-fe-spec + 需求描述` | 描述需求 + 粘贴学城链接，从前端视角深度分析，生成技术文档（可选上传学城） |
| **dev** | `/auto-fe-dev + 需求文件夹` | 基于技术文档并行写代码、Spec Review、推送 Git、Talos 部署（按需触发） |
| **resume** | `/auto-fe-resume + 需求文件夹 + 新信息` | 收到新信息（如后端接口已上线、UI 确认色値等）后，解锁 partial/blocked 改动点，补充开发并归档 |

---

### 2. 其他命令

无需需求文件夹，随时按需调用：

| 命令 | 类型 | 适用场景 |
|------|------|---------|
| `/auto-fe-quick + 描述` | 快速模式 | Bug 修复、功能调整、文案样式修改等不需要走 SDD 流程的改动，改动可大可小 |
| `/auto-fe-ask + 问题` | 项目问答 | 全量注入项目上下文后回答问题，比直接提问准确率更高 |
| `/auto-fe-git` | 工具 | Git 操作（推送代码、归档提交） |
| `/auto-fe-talos` | 工具 | 触发 Talos 流水线发布并轮询构建结果 |
| `/auto-fe-notify` | 工具 | 大象通知：拉群（提供成员 MIS）或发消息（提供 groupId + 内容） |

---

## 如何开始一个需求

直接对 AI 说：

```
/auto-fe-spec

需求背景：XXX 功能改版
文档链接：https://km.sankuai.com/collabpage/xxxxxxxxx
```

AI 会自动读取文档内容、分析需求、生成技术文档。

需要提供的信息 AI 会在对话中主动询问（如 Talos 发布链接、验收群成员等），无需提前配置。

---

## 需求文件夹结构

需求文件夹由 AI 自动创建和维护，放在项目的 `requirement/` 目录下：

```
requirement/<需求名>/
├── config.json          ← AI 自动维护（phases / notify.groupId 等）
└── result/              ← AI 自动生成产物
    ├── spec/             ← spec 阶段产物
    │   ├── analysis.json   ← 结构化分析结果
    │   ├── tec-doc.md      ← 技术文档
    │   ├── delay.md        ← 有待补全项时生成
    │   ├── spec-tasks.md   ← spec 进度（断点恢复用）
    │   └── spec-questions.md
    └── dev/             ← dev 阶段产物
        ├── dev-tasks.md  ← dev 进度（断点恢复用）
        └── dev-questions.md
```

模板位于 `workflows/SDD/others/requirement-tpl/`，spec 阶段首次启动时自动复制，无需手动操作。

---

## 目录结构

```
.claude/skills/auto-fe/
├── SKILL.md
├── workflows/                  # 实际执行的工作流模块
│   ├── SDD/                    # 正式需求开发流程（spec → dev）
│   │   ├── auto-fe-spec/
│   │   ├── auto-fe-dev/
│   │   ├── auto-fe-resume/
│   │   └── others/
│   │       └── requirement-tpl/
│   └── cmds/                   # 独立命令（随时调用，快速模式 + 工具）
│       ├── auto-fe-quick/      # 快速开发模式（改动可大可小、无需 SDD 流程）
│       ├── auto-fe-ask/        # 项目问答模式
│       ├── auto-fe-git/
│       ├── auto-fe-talos/
│       └── auto-fe-notify/
└── external-skills/            # 外部引入的 skill
    ├── meituan-dx-robot-fast-node/
    ├── catpaw-memory/
    └── fe-archaeology/
```

---

## ❓ 常见问题

**Q：怎么提供 Talos 信息？**
打开 Talos 发布页面，把浏览器地址栏的完整 URL 粘贴给 AI 即可，appId / templateId 自动解析。
例如：`https://talos-better.sankuai.com/release?appId=21558&env=test&templateId=554794`

**Q：学城文档怎么提供？**
把学城页面 URL 直接粘贴到对话框，AI 优先用 `web_fetch` 读取，失败则用 MCP 读取。

**Q：不需要上传学城怎么办？**
spec 完成后 AI 会问是否上传，回答"不需要"即可跳过。

**Q：流程中途中断了怎么办？**
重新发送对应阶段命令，AI 会读取 tasks.md 从第一个未完成的 `[ ]` 处续跑，不会从头开始。

**Q：怎么通知验收人员？**
dev 完成后 AI 会提示可调用 `/auto-fe-notify`，提供群成员 MIS 列表和测试环境 URL 即可自动建群发消息。
