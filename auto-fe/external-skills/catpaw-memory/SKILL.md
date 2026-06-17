---
name: catpaw-memory
chineseName: CatPaw 记忆系统
description: CatPaw AI 助手的跨会话记忆管理系统。命令：/catpaw-memory 初始化记忆系统；/memory-extract 提取本次会话记忆；/memory-remember 手动记住某件事；/memory-review 审计并瘦身记忆。也可用自然语言触发：记住这个、帮我记一下、提取记忆、我希望你永远记住、下次也要这样做。
license: ISC
---

## 记忆系统总览

本技能实现 harness 记忆模式，分为**用户层**和**项目层**两个作用域：

| 层 | 会话自动加载的文件 | 主题文件（按需读取） | 包含类型 |
|----|---------------------|---------------------|----------|
| **用户层**（跨项目） | `~/.catpaw/rules/memory-index.md` | `~/.catpaw/memory/topics/` | `user` / `feedback` |
| **项目层**（当前项目） | `.catpaw/rules/memory-index.md` | `.catpaw/memory/topics/` | `project` / `reference` |
| **用户层副本**（项目内） | `.catpaw/rules/memory-user-index.md` | `~/.catpaw/memory/topics/`（绝对路径） | `user` / `feedback` 的镜像 |

> **索引在 `rules/` 里**：CatPaw 每次会话启动自动加载 `rules/*.md`，三个索引文件同时注入上下文，AI 天然感知到所有记忆摘要，主题文件详情按需加载。
>
> **用户层副本机制**：初始化时把 `~/.catpaw/rules/memory-index.md` 整个复制为 `.catpaw/rules/memory-user-index.md`，后续新增 `user`/`feedback` 类记忆时同时追加到两个文件（双写）。副本随项目一起被 CatPaw 自动加载，无需 AI 主动执行 `read_file` 读取用户目录文件（该行为不可靠）。

---

## 命令与触发场景

| 命令 | 自然语言触发 | 功能 | 子模块 |
|------|------------|------|--------|
| `/catpaw-memory` | "初始化记忆系统"、"帮我装记忆" | 初始化目录和索引文件 | `scripts/memory-init.js` |
| `/memory-remember` | "记住 X"、"下次也要这样" | 手动写入一条记忆 | → [memory-remember](memory-remember/SKILL.md) |
| `/memory-extract` | "提取记忆"、"总结这次对话" | 扫描会话、打分筛选、确认写入 | → [memory-extract](memory-extract/SKILL.md) |
| `/memory-review` | "审计记忆"、"清理记忆" | 审计所有记忆，提升或删除 | → [memory-review](memory-review/SKILL.md) |

---

## 目录结构

初始化后（运行 `scripts/memory-init.js`）：

```
~/.catpaw/                              # 用户层（跨项目）
├── memory/topics/                      # 用户层主题文件（详情，按需读）
└── rules/
    └── memory-index.md                 # 用户层索引（会话自动加载）✅

<project>/.catpaw/                      # 项目层
├── memory/topics/                      # 项目层主题文件（详情，按需读）
└── rules/
    ├── memory-index.md                 # 项目层索引（会话自动加载）✅
    └── memory-user-index.md            # 用户层索引副本（会话自动加载）✅
```

> `rules/` 下所有 `.md` 文件都在 CatPaw 会话启动时自动注入，项目层新增 `memory-user-index.md` 后，用户记忆无需 AI 主动读取即可加载。

---

## 自动记忆的四种类型

每条记忆必须归入以下四类之一，**类型决定写入哪一层**：

| 类型 | 英文键 | 存什么 | 写入哪层 |
|------|--------|--------|----------|
| 用户偏好 | `user` | 用户身份、工作习惯、工具偏好 | 用户层 |
| 行为反馈 | `feedback` | 纠正 AI 行为的指令（"用 bun 不用 npm"）| 用户层 |
| 项目上下文 | `project` | 无法从代码推导的业务背景 | 项目层 |
| 稳定参考 | `reference` | 不会频繁变化的技术事实 | 项目层 |

> ⚠️ 不存储可从代码库或版本历史推导的内容（架构、目录结构等）

---

## 三步保存不变式

**所有写入必须遵循此顺序，不得颠倒：**

1. **先写主题文件** → `<层>/memory/topics/<name>.md`
2. **再追加索引行** → `<层>/rules/memory-index.md`
3. **（仅 user/feedback）双写到项目层用户索引副本** → `.catpaw/rules/memory-user-index.md`（使用绝对路径）

崩溃最坏结果：孤儿主题文件，索引保持一致。运行 `scripts/memory-cleanup.js` 清理。Step 3 失败为非致命错误（副本可通过重新初始化重建）。

---

## 索引格式规范

`memory-index.md` 由两部分组成：

**① 文件头（初始化生成，含 AI 行为指令）：**

```markdown
# CatPaw 记忆索引（用户层）

本索引存储：用户的跨项目偏好与行为反馈（`user` / `feedback` 类）
自动维护，请勿手动大幅编辑。上限：200 行 / 25,000 字节

## ⚡ AI 强制行动指令（每轮对话必须执行，不可跳过）

扫描下方用户层条目，判断哪些条目与当前请求相关，对相关条目主动读取主题文件获取完整细节。
尤其关注：工具偏好、编码风格、工作流习惯、AI 行为纠正、项目约束、用户身份背景。
```

**② 记忆条目（每行一条）：**

```
- [标题](../memory/topics/<filename>.md)｜<type>｜<一句话摘要（≤80字符）>
```

示例：
```
- [用 bun 不用 npm](../memory/topics/use-bun.md)｜feedback｜用户要求包管理器统一使用 bun
- [项目使用 React 18 + Vite](../memory/topics/tech-stack.md)｜project｜主框架版本信息
```

索引触达上限时追加截断警告：
```
<!-- ⚠️ 索引已达上限（200行/25KB），运行 /memory-review 清理 -->
```

---

## Skill 层 vs Harness 层的边界

| 能力 | 实现位置 | 备注 |
|------|---------|------|
| 记忆的读/写/提升 | Skill（本技能） | 通过 AI 行为指令实现 |
| 索引自动注入上下文 | Harness（CatPaw 运行时） | `rules/*.md` 自动加载 ✅ |
| 主题文件按需加载 | Skill（AI 主动读取） | 看到索引后按需读取详情 |
| 提取器工具级隔离 | Harness（CatPaw 运行时） | Skill 只能做行为约束 |
