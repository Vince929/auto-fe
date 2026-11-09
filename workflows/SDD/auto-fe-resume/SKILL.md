---
name: auto-fe-resume
chineseName: 前端自动化 - 渐进补全模式
description: 收到外部新信息后，解锁此前因信息缺口标记为 partial/blocked 的改动点，更新技术文档后直接开始补充开发，完成 CR 后提交代码和归档。适用于前后端并行开发场景下的渐进式需求交付。
---

## 触发场景

- 后端接口文档更新，之前 blocked 的功能可以开始实现了
- 外部参数/配置值已确认，之前 mock 的地方可以替换为真实值
- 产品/设计补充了缺失的信息，之前无法确定的逻辑现在明确了

**触发方式：**
```
/auto-fe-resume <需求名>
```

或：「帮我继续 <需求名>，后端接口出来了，活动 ID 是 "act_20240501"」

---

## 前置检查

| 检查项 | 通过条件 | 不通过时 |
|--------|----------|---------|
| `requirement/<需求名>` 存在 | 目录存在 | ⛔ 告知用户 |
| `result/spec/analysis.json` 存在 | 文件存在且非空 | ⛔ 提示先完成 spec |
| 存在 `readiness` 为 `partial` 或 `blocked` 的 changePoint | 至少一项 | ⛔ 提示没有待解锁项 |

---

### 🗒️ 输出执行计划（启动后第一步，不可跳过）

在做任何事情之前，先在对话中输出以下执行计划（直接文字输出，不加代码块）：

📋 执行计划：

  Step 1：注入项目上下文
    - Step 1-A：读取 project-context.md
    - Step 1-B：读取 docs/required/ 所有必读文档
    - Step 1-C：逐条判断按需文档触发条件，输出判断清单
    - Step 1-D：读取所有命中的按需文档

  Step 2：读取 delay 清单（result/spec/delay.md + result/spec/analysis.json）

  Step 3：AI 判断哪些 delay 项可被新信息解锁

  🔴 澄清门：展示解锁判断，等用户确认

  Step 4：更新文档产物（analysis.json / tec-doc.md / delay.md / dev-tasks.md）

  Step 5：补充开发（每个改动点完成后立即 commit）

  🔴 Review 门：停下让用户 CR

  Step 6：commit 归档 → push

> ⛔ **必须严格按照上述顺序执行每一个步骤，不得跳过、不得合并、不得重排。**
>
> ⛔ **每进入一个新步骤时，必须先在对话中输出一行声明，格式为：**
> - `▶ 开始执行 Step 1：注入项目上下文`
> - `  ▷ Step 1-A：读取 project-context.md`
> **禁止在未输出声明的情况下直接执行操作。**

输出完毕后，立即开始执行 Step 1。

---

### Step 1：注入项目上下文

检查 `.catpaw/rules/project-context.md` 是否存在：
- **不存在** → 跳过，直接进入 Step 2
- **存在** → 按以下三步加载：

**Step 1-A：读取 `project-context.md`**（必须）

**Step 1-B：读取 `docs/required/` 下所有文档**（必须）

**Step 1-C：逐条判断 `docs/on-demand/` 触发条件，输出判断清单**

读取 `project-context.md` 的「按需阅读文档」表，**必须对每一条文档逐一判断其触发条件**，不可整体跳过。

> ⚠️ **匹配判断不能只看「是否新增/修改」，还要看「是否使用/读取」**：改动中只要涉及某个模块的数据读取、调用或依赖（即使不新增也不修改该模块本身），对应文档也应触发读取。

判断完毕后，**立即在对话中输出完整清单**（每条单独占一行，条目之间必须有空行），格式如下：

📚 已加载项目上下文：

  ✅ project-context.md

  ✅ docs/required/conventions.md（始终）

  --- 按需阅读文档逐条判断 ---

  ✅ docs/on-demand/[文档名]（命中：[触发条件]）

  ⏭️ docs/on-demand/[文档名]（跳过：[触发条件]，本次不涉及）

  ...（每条都要列出，不可省略）

> ⚠️ Step 1-C 只做判断和输出清单，**不读取任何文件**，读取在 Step 1-D 统一执行。

**Step 1-D：读取所有命中的按需文档**

遍历 Step 1-C 清单中所有标记为 `✅` 的 `docs/on-demand/` 条目，**逐一调用 read_file 读取**（可并行）。

> ⛔ **每一条 `✅` 条目都必须有对应的 read_file 调用，不得跳过任何一条。**

---

### Step 2：读取 delay 清单

读取 `result/spec/analysis.json`，过滤出所有 `delayStatus` 为 `pending` 的 changePoint，在对话中展示：

```
📋 当前待解锁改动点：

[partial] cp-003 活动入口按钮
  Mock 内容：activityId 暂用 "activity_mock_001"
  等待：活动中台确认真实活动 ID

[blocked] cp-005 活动详情页跳转
  原因：后端跳转协议和参数格式未定
  等待：后端接口文档 v2 确认
```

---

### Step 3：AI 自动判断解锁范围

结合用户提供的新信息，逐条对比所有 `pending` 的 delay 项，判断：

- 新信息完整覆盖某项的 `waitingFor` → 标记为「可解锁」，推断解锁后的实现方案
- 新信息部分覆盖某 `partial` 项 → 判断是否已足够替换 mock，或仍需保持 partial
- 新信息与某项无关 → 保持 `pending`

---

### 🔴 澄清门：确认解锁范围

输出解锁判断结果，**等用户明确确认后再继续**：

```
🔓 根据你提供的信息，我判断可以解锁以下改动点：

✅ cp-003 活动入口按钮（partial → ready）
   activityId 替换为真实值：<用户提供的值>

⏳ cp-005 活动详情页跳转（仍 blocked）
   用户提供的信息尚不覆盖跳转协议，继续等待

请确认以上判断是否正确？有补充请告知，确认后我将开始更新文档和写代码。
```

用户确认后继续；用户有补充 → 修正判断后重新展示，再等确认。

---

### Step 4：更新文档产物

按用户确认的解锁结果，依次更新：

**4-A：更新 `result/spec/analysis.json`**

对每个解锁的 changePoint：
- `readiness`: `partial`/`blocked` → `ready`
- `delayStatus`: `pending` → `done`
- `mockItems` 中对应字段的 `mockValue` → 替换为真实值（partial 项）
- `blockedReason` → 清空（blocked 项）

**4-B：更新 `result/spec/tec-doc.md`**（⚠️ 必须执行，不可跳过）

在对应改动点章节补充/修正实现说明：
- partial 项：将 mock 值替换为真实值，删除「待确认」备注
- blocked 项：补充完整的实现方案描述

> ⛔ **4-B 未完成前禁止进入 Step 5 写代码。**

**4-C：更新 `result/spec/delay.md`**

将已解锁项的「状态」从 `pending` 改为 `done`，并补充解锁信息：

```markdown
### [partial → done] cp-003 活动入口按钮
- **状态**：done（已于 <日期> 解锁）
- **解锁信息**：activityId 已确认为 "act_20240501"
```

**4-D：更新 `result/dev/dev-tasks.md`**

为本次解锁的改动点追加新任务行（在第 2 节末尾新增一个「resume 补充轮」）：

```markdown
### 🔁 resume 补充轮（<日期>）
- [ ] cp-003 活动入口按钮 - 替换 mock activityId 为真实值
- [ ] cp-005 活动详情页跳转 - 完整实现跳转逻辑（如已解锁）
```

---

### Step 5：补充开发

**主 agent 直接写代码，不 spawn sub-agent。**

按 Step 4 中更新的 tec-doc.md 实现方案，逐项处理：

**partial 项（替换 mock）：**
1. 读取 `result/spec/delay.md` 中该条目的「涉及文件」字段，优先在列出的文件中搜索 `// TODO(mock):` 注释定位 mock 值所在行；若未找到则全局搜索兜底
2. 将 mock 值替换为真实值
3. 删除该行的 `// TODO(mock): ...` 注释
4. 检查是否有其他地方引用了该 mock 值，一并替换

**blocked 项（完整实现）：**
1. 找到 `// TODO(blocked): ...` 注释所在位置
2. 删除注释，在该位置实现完整逻辑
3. 按 result/spec/tec-doc.md 中的 implementPlan 完成该改动点

**每个改动点完成后立即 commit：**
```
feat/fix: [resume] <中文简述改动>
```
> commit 范围：业务代码文件，**必须使用中文描述，严禁英文**

完成后更新 `result/dev/dev-tasks.md` 中对应行为 `[x]`。

---

### 🔴 Review 门：停下让用户确认

> ⛔ **所有改动点完成后必须停在此处，在用户明确说"没问题"/"确认"之前，禁止执行 Step 6 归档和 push。**

输出以下内容后等待用户回复（不加代码块，直接作为回复文字输出）：

✅ 补充开发完成！

已解锁并实现：
  ✅ cp-003 活动入口按钮（mock 已替换为真实值）
  ✅ cp-005 活动详情页跳转（完整逻辑已实现）

请查看代码确认没问题，告诉我后我将：
  1. commit 归档（result/spec/delay.md + result/spec/analysis.json + result/spec/tec-doc.md 更新）
  2. push 到远程

---

### Step 6：归档 & push（两次 commit）

**第一次 commit（已在 Step 5 逐个完成）** — 业务代码，每个改动点一次

**第二次 commit（归档）：**

```bash
git add requirement/<需求名>/
git commit -m "docs: resume 归档 - <需求名>（解锁：<改动点简述>）"
```

归档内容：`result/spec/analysis.json`、`result/spec/tec-doc.md`、`result/spec/delay.md`、`result/dev/dev-tasks.md`

**push：**

```bash
git push origin <当前分支名>
```

---

## ✅ 完成标志

本次 resume 涉及的所有 changePoint `delayStatus` 均为 `done`，两次 commit 已推送。

若 `result/spec/delay.md` 中仍有 `pending` 项 → 提示用户，等待下一次外部信息到位后再次执行 `/auto-fe-resume`。

```
🎉 resume 完成！

已解锁：cp-003, cp-005
仍待解锁：cp-007（等待：<waitingFor>）

待所有 delay 项完成后，可继续执行 auto-fe-notifying 发送验收通知。
```
