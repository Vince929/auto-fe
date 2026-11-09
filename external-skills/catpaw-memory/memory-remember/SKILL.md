---
name: memory-remember
description: catpaw-memory 的写入子模块。当用户明确要求记住某件事时执行：收集信息、分类、按类型路由到用户层或项目层、执行两步保存。
---

## 写入记忆流程

### Step 1：确认内容与分类

收到"记住 X"请求后，确认：

1. **内容是什么**（一句话概括）
2. **属于哪个类型**（决定写哪一层）：

| 类型 | 写哪里 |
|------|--------|
| `user` — 用户身份、工具偏好、工作习惯 | **用户层** `~/.catpaw/` |
| `feedback` — 纠正 AI 行为的指令 | **用户层** `~/.catpaw/` |
| `project` — 无法从代码推导的业务背景 | **项目层** `.catpaw/` |
| `reference` — 不频繁变化的技术事实 | **项目层** `.catpaw/` |

如不确定，优先写自动记忆，后续通过 `/memory-review` 审计提升。

---

### Step 2：确定写入路径

| 类型 | 主题文件目录 | 索引文件 |
|------|------------|----------|
| `user` / `feedback` | `~/.catpaw/memory/topics/` | `~/.catpaw/rules/memory-index.md` |
| `project` / `reference` | `.catpaw/memory/topics/` | `.catpaw/rules/memory-index.md` |

确认目标目录存在，不存在则运行：
```bash
node <skill路径>/scripts/memory-init.js
```

---

### Step 3：确定文件名 & 判断新增 or 更新

规则：`<kebab-case-标题>.md`，例如：
- "用 bun 不用 npm" → `use-bun-not-npm.md`
- "项目使用 React 18" → `tech-stack-react18.md`

**检查目标 `topics/` 目录中是否已存在同名或语义相关的文件：**

| 情况 | 处理方式 |
|------|---------|
| **不存在** | 新建文件，继续 Step 4（完整三步保存） |
| **已存在，内容需要补充/修正** | **更新**已有文件：直接编辑主题文件内容，**不新增索引行**（索引行已存在，无需重复追加），完成后告知用户更新了哪个文件 |
| **已存在，内容完全一样** | 告知用户「该记忆已存在，无需重复记录」，终止流程 |

> 💡 判断"语义相关"：文件名相似（如 `mis-account.md` vs `mis-id.md`）或摘要描述高度重叠，均视为同一主题，应更新而非新建。

---

### Step 4：执行三步保存（顺序不可颠倒，仅新增时执行）

#### 步骤 A：先写主题文件

在 `<层>/memory/topics/<filename>.md` 写入：

```markdown
---
name: <标题>
type: <user|feedback|project|reference>
created: <YYYY-MM-DD>
---

<完整内容，可多段，无字数限制>
```

#### 步骤 B：再追加索引行

在 `<层>/rules/memory-index.md` 末尾追加一行：

```
- [<标题>](../memory/topics/<filename>.md)｜<type>｜<≤80字符摘要>
```

#### 步骤 C（双写）：user / feedback 类型额外同步到项目层用户索引副本

仅当 type 为 `user` 或 `feedback` 时执行：在项目层 `.catpaw/rules/memory-user-index.md` 末尾追加同一条目，路径使用**绝对路径**指向用户层 topic 文件（topic 文件始终存放在用户目录）：

```
- [<标题>](<~/.catpaw/memory/topics/<filename>.md 的绝对路径>)｜<type>｜<≤80字符摘要>
```

- `.catpaw/rules/memory-user-index.md` 不存在时跳过此步骤（非致命，不影响用户层写入）

> **为什么双写？** `memory-user-index.md` 是用户层索引的项目内副本，由 CatPaw 会话启动时自动加载，无需 AI 主动执行 `read_file` 读取用户目录中的文件（该行为不可靠）。

---

### Step 5：检查索引上限

追加后检查 `memory-index.md` 是否超限（200 行 / 25,000 字节，任一触发）：

超限时追加：
```
<!-- ⚠️ 索引已达上限，运行 /memory-review 进行清理 -->
```

---

### Step 6：确认写入

告知用户：

> ✅ 已记住：**<标题>**（类型：`<type>`）
>
> - 主题文件：`<层>/memory/topics/<filename>.md`
> - 索引已更新：`<层>/rules/memory-index.md`（会话自动加载）
> - （`user`/`feedback` 类）已同步到项目层 `.catpaw/rules/memory-index.md`

示例：
- `user` 类 → `~/.catpaw/memory/topics/use-bun.md`，双写：用户层 + 项目层索引同步更新
- `project` 类 → `.catpaw/memory/topics/tech-stack.md`，索引在 `.catpaw/rules/memory-index.md`

---

## ⚠️ 关键约束

- **保存顺序不可颠倒**：A（主题文件）→ B（用户层索引）→ C（项目层双写，仅 user/feedback）
- **类型决定写入层**：`user`/`feedback` → 用户层 + 双写到项目层，`project`/`reference` → 仅项目层
- **双写使用绝对路径**：`memory-user-index.md` 中 user/feedback 条目的 topic 文件链接必须是绝对路径
- **不存储可推导内容**：文件结构、代码架构、git 历史等
- **不把会话内的临时状态写入记忆**（计划、TODO 清单等）
