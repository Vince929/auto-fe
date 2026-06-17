---
name: auto-fe
chineseName: 前端自动化助手
description: 前端开发全流程自动化助手，覆盖需求分析、代码开发、发布部署。SDD 流程：`/auto-fe-spec` → `/auto-fe-dev` → `/auto-fe-resume`；快速模式 `/auto-fe-quick + 描述`；项目问答 `/auto-fe-ask + 问题`；其他命令：git模块`/auto-fe-git`、前端Talos发布`/auto-fe-talos`、大象机器人建群/发信息`/auto-fe-notify`。
---

## 使用方式

### 1. SDD 流程（正式需求）

| 阶段 | 触发命令 | 职责 |
|------|---------|------|
| **spec** | `/auto-fe-spec` | 描述需求 + 粘贴学城链接，从前端视角深度分析，生成技术文档（可选上传学城） |
| **dev** | `/auto-fe-dev + 需求文件夹` | 基于技术文档并行写代码、Spec Review、推送 Git、Talos 部署 |
| **resume** | `/auto-fe-resume + 需求文件夹 + 新信息` | 收到新信息后解锁 partial/blocked 改动点，补充开发并归档（渐进补全模式） |

### 2. 其他命令

无需需求文件夹，随时按需调用：

| 命令 | 类型 | 适用场景 |
|------|------|---------|
| `/auto-fe-quick + 描述` | 快速模式 | Bug 修复、功能调整、文案样式修改等不需要走 SDD 流程的改动，改动可大可小 |
| `/auto-fe-ask + 问题` | 项目问答 | 全量注入项目上下文，回答关于项目的任意问题（组件用法、规范查询、架构确认等） |
| `/auto-fe-git` | 工具 | Git 分支管理（创建分支、推送代码、归档提交） |
| `/auto-fe-talos` | 工具 | 触发 Talos 流水线发布并轮询构建结果 |
| `/auto-fe-notify` | 工具 | 大象通知：拉群（提供成员 MIS + 群名）或发消息（提供 groupId + 内容） |

---

## 阶段依赖关系

```
spec ──[result/spec/tec-doc.md + kmUrl(可选)]──▶ dev
       │
       │ 存在 partial/blocked 项
       ▼
    result/spec/delay.md 生成
       │
       ▼ 外部信息到位后
    auto-fe-resume（渐进补全）

auto-fe-quick（独立，无依赖，直接使用）
auto-fe-ask（独立，无依赖，随时调用）
auto-fe-git（独立，无依赖，随时调用）
auto-fe-talos（独立，无依赖，随时调用）
auto-fe-notify（独立，无依赖，随时调用）
```

| 阶段 | 依赖前置产物 | 被阻塞时 |
|------|------------|---------|
| spec | 无 | - |
| dev | `result/spec/spec-tasks.md` 所有阶段均 `[x]` + `result/spec/tec-doc.md` 存在 | ⛔ 先完成 spec |
| **resume** | `result/spec/analysis.json` 存在 + 存在 `delayStatus: "pending"` 的 changePoint | ⛔ 无待解锁项 |
| **quick** | 无（独立命令） | - |
| **ask** | 无（独立命令） | - |
| **git** | 无（独立命令） | - |
| **talos** | 无（独立命令） | - |
| **notify** | 无（独立命令） | - |

---

## 进度感知 & 断点恢复

每阶段在 `result/` 下对应子目录生成 checkbox 任务清单，中断后从第一个 `[ ]` 处继续：

| 阶段 | tasks 文件 |
|------|-----------|
| spec | `result/spec/spec-tasks.md` |
| dev | `result/dev/dev-tasks.md` |
| resume | `result/dev/dev-tasks.md`（追加「resume 补充轮」节） |

---

## 各阶段摘要

| 阶段 | 详细指南 | 核心流程 |
|------|---------|---------|
| spec | `workflows/SDD/auto-fe-spec/SKILL.md` | 用户描述需求 + 粘贴学城链接 → 分层聚焦分析 → result/spec/analysis.json + result/spec/tec-doc.md（+ result/spec/delay.md）→ 可选上传学城 |
| dev | `workflows/SDD/auto-fe-dev/SKILL.md` | 基于当前分支创建功能分支 → Fan-out 并行开发（跳过 blocked 项）→ Spec Review → 推送 Git → Talos 发布（用户按需触发） |
| **resume** | `workflows/SDD/auto-fe-resume/SKILL.md` | 注入上下文 → 读 delay 清单 → AI 判断解锁范围 → 用户确认 → 更新文档 → 补充开发 → 归档 push |
| **quick** | `workflows/cmds/auto-fe-quick/SKILL.md` | 注入项目上下文 → 分析改动点 → 用户确认 → 并行写代码 → 输出命令菜单 |
| **ask** | `workflows/cmds/auto-fe-ask/SKILL.md` | 全量注入项目上下文 → 按需深挖相关代码 → 回答用户问题 |
| **notify** | `workflows/cmds/auto-fe-notify/SKILL.md` | 拉群：收集成员 MIS，ownerMis 从记忆读取，建群返回 gid；发消息：提供 gid + 内容发送 |

---

## ⚠️ 重要原则

- 任何步骤遇到**不确定的地方，必须暂停询问**，不猜测、不自行决策
- **不再需要手动填写 `config.user.json`**，所有配置通过用户记忆或对话即时提供
- misId 优先从用户记忆中读取，记忆无记录时询问用户

---

## 目录结构

```
requirement/
└── <需求名>/
    └── result/                 # AI 自动生成产物
        ├── spec/               # spec 阶段产物
        │   ├── analysis.json
        │   ├── tec-doc.md
        │   ├── delay.md        # 有 delay 项时生成
        │   ├── spec-tasks.md
        │   └── spec-questions.md
        └── dev/               # dev 阶段产物
            ├── dev-tasks.md
            └── dev-questions.md

.claude/skills/auto-fe/
├── SKILL.md
├── workflows/                  # 实际执行的工作流模块
│   ├── SDD/                    # 正式需求开发流程（spec → dev）
│   │   ├── auto-fe-spec/       # 含 tec-doc.tpl.md（tec-doc 生成模板）
│   │   ├── auto-fe-dev/
│   │   └── auto-fe-resume/
│   └── cmds/                  # 独立命令（随时调用，快速模式 + 工具）
│       ├── auto-fe-quick/      # 快速开发模式
│       ├── auto-fe-ask/        # 项目问答模式
│       ├── auto-fe-git/
│       ├── auto-fe-talos/
│       └── auto-fe-notify/     # 大象通知（拉群/发消息），底层调用 external-skills/
└── external-skills/            # 外部引入的 skill
    ├── meituan-dx-robot-fast-node/  # 大象开放平台 HTTP API 封装
    ├── catpaw-memory/          # 跨会话记忆管理
    └── fe-archaeology/         # 前端项目考古，生成项目知识库
```
