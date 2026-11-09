---
name: memory-review
description: catpaw-memory 的审计子模块（/memory-review 命令）。同时扫描用户层和项目层，分组呈现提升建议，等待用户确认后才写入。永远不自动修改。
---

## /memory-review 审计流程

**黄金法则：** 只提议，不自动执行。所有提升操作必须用户明确确认后才写入。

### Step 1：扫描所有记忆层

**用户层（跨项目）：**
1. `~/.catpaw/rules/memory-index.md` — 用户层自动记忆索引（`user`/`feedback` 类）

**项目层（当前项目）：**
2. `.catpaw/rules/memory-index.md` — 项目层自动记忆索引（`project`/`reference` 类）

如果两个 `memory-index.md` 都不存在，提示用户先运行 `scripts/memory-init.js` 初始化。

---

### Step 2：读取所有主题文件详情

从两层索引中获取主题文件路径（索引中的相对路径是相对 `rules/` 的），读取 `memory/topics/<file>.md`。
标注每条来源：`[用户层]` 或 `[项目层]`。

---

### Step 3：生成分组提议报告

按以下五类分组呈现，**先展示报告，不执行任何操作**：

---

#### 📋 /memory-review 审计报告

**共扫描：用户层 X 条 + 项目层 Y 条 = Z 条自动记忆**

---

**🔼 建议提升到项目规范**

适合：应写入项目的 `project.md` 或其他规范文件（项目自己维护，将记忆内容固化到项目规范）。通常来自项目层 `project`/`reference` 类。

```
[ ] [项目层] <标题> — <摘要>
    原因：<为什么应该成为项目规范>
```

---

**🌐 建议固化为用户常驻规则** （写入 `.catpaw/rules/user-memory.md` 的固定规则区）

适合：跨所有项目都适用的个人偏好（通常来自用户层 `user`/`feedback` 类），值得在每次会话开始就直接生效而不依赖按需读取。

```
[ ] [用户层] <标题> — <摘要>
    原因：<为什么应该每次会话直接注入>
```

---

**🗑️ 建议清理**（满足以下任一条件的有效自动记忆条目）

判断标准：
- 内容**可从代码库直接推导**（如"项目用 React"，看 package.json 即知）
- 内容**已过时**（如旧的 API 地址、已废弃的约定）
- 内容是**一次性上下文**（如"今天帮我用 ES5 写"，已不再适用）
- 内容与**已提升到 rules 的规则重复**（自动记忆里有、rules 里也有）

```
[ ] [用户层/项目层] <标题> — <摘要>
    原因：<具体是哪条标准触发>
```

---

**❓ 待观察**（存在但价值不明确）

```
[ ] [用户层/项目层] <标题> — 已保存 <X> 天，尚未触发
```

---

**✅ 保留**（无需操作）

```
用户层 X 条 + 项目层 Y 条记忆状态良好，继续保留。
```

---

### Step 4：等待用户指令

报告呈现后，等待用户：

1. **确认提升**：用户说"提升第 1、3 条到项目规范"
2. **确认删除**：用户说"删除第 2 条"
3. **全部接受**：用户说"全部按建议操作"
4. **忽略**：用户不回应，结束审计

---

### Step 5：执行被确认的操作

#### 提升到指令层

提升不属于记忆系统的内部操作，而是将记忆内容**拷贝到用户自己维护的规范文件**：

- 用户层记忆（`user`/`feedback`） → 提议用户写入 `~/.catpaw/rules/global.md` 或项目内的 `rules/` 文件
- 项目层记忆（`project`/`reference`） → 提议用户写入 `.catpaw/rules/project.md`

展示要追加的内容，用户确认后写入对应文件。

完成后从对应 `memory-index.md` 删除对应行，并删除主题文件（已提升的不需要两份）。

#### 删除自动记忆

1. 从对应 `memory-index.md` 删除对应行
2. 删除对应 `memory/topics/<file>.md`

---

### Step 6：同步报告结果

每执行一步，同步告知：

> ✅ 已将 **<标题>** [用户层] 提升建议已展示
> 
> ✅ 已将 **<标题>** [项目层] 提升到 `.catpaw/rules/project.md`
> 
> 🗑️ 已删除自动记忆：**<标题>**

---

## 孤儿文件检查

审计结束后，额外检查两层是否有孤儿主题文件：

> 在 `memory/topics/` 下存在但未被 `rules/memory-index.md` 引用的文件（两步保存中途崩溃留下）

如有，提示：

> ⚠️ 发现 X 个孤儿主题文件（用户层 A 个，项目层 B 个）。是否运行清理？

**两种"清理"的区别：**

| 清理方式 | 清理什么 | 怎么执行 |
|---------|---------|---------|
| `/memory-review` 审计中的"建议清理" | 过时/可推导的**有效**自动记忆条目 | AI 直接操作（本模块 Step 5） |
| `memory-cleanup.js` | 孤儿主题文件（崩溃残留，索引里没有引用） | 手动运行脚本 |

孤儿文件可以让 AI 直接 `delete_file` 删除，也可以运行脚本（支持 `--scope user|project`）：

```bash
# 清理项目层孤儿文件（dry-run）
node <skill路径>/scripts/memory-cleanup.js --root . --scope project --dry-run

# 清理用户层孤儿文件（dry-run）
node <skill路径>/scripts/memory-cleanup.js --scope user --dry-run

# 确认后执行
node <skill路径>/scripts/memory-cleanup.js --root . --scope project
node <skill路径>/scripts/memory-cleanup.js --scope user
```

> `<skill路径>` 是 `catpaw-memory` skill 的安装路径，通常是 `.claude/skills/catpaw-memory`

---

## 索引上限处理

如果任一 `memory-index.md` 已达上限（200行/25000字节），在报告顶部标注：

> ⚠️ **用户层索引已满**：当前 X 行 / Y 字节，已达上限。建议优先清理或提升条目。

> ⚠️ **项目层索引已满**：当前 X 行 / Y 字节，已达上限。建议优先清理或提升条目。
