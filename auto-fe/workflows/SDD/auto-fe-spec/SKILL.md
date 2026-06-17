---
name: auto-fe-spec
chineseName: 前端自动化 - 第一步：需求理解与技术文档生成
description: 用户直接描述需求 + 粘贴学城链接，从前端视角解析拆解，生成完整的前端技术文档（tec-doc.md）。覆盖改动点分析、接口变动、实现方案、完整开发流程。
---

## 🚦 启动模式判断（最高优先级，优先于一切流程）

**启动时第一件事**：判断用户是否提供了需求描述或文档链接等需求信息。

### 情况一：未提供任何需求信息 → 进入【介绍模式】

> 触发条件：用户仅调用 `/auto-fe-spec` 或类似命令，**未提供需求描述、链接等任何需求相关信息**。

此时**不执行任何流程**，直接输出以下使用说明后**停止**，等待用户操作：

---

👋 你好！这是 **auto-fe-spec**，负责从前端视角分析需求、生成技术文档。

要启动本 Skill，只需按以下方式告诉我需求信息：

**方式一（最简单）：直接描述 + 粘贴链接**

```
帮我 spec，这是一个 SPU 标签展示需求
PRD：https://km.sankuai.com/collabpage/123456
接口文档：https://km.sankuai.com/collabpage/789012
```

**方式二：只描述需求**（无学城文档时）

```
帮我 spec，这个需求是在商品详情页新增一个标签展示区域，
规则是 A 展示，B 时隐藏...（描述越详细越好）
```

> 💡 所有学城文档链接、设计稿截图都可以直接粘贴到对话框，AI 会自动读取解析。

---

### 情况二：已提供需求信息 → 进入【正常流程】

继续执行以下【断点恢复入口】及后续完整流程。

---

### 🗒️ 输出执行计划（进入正常流程后第一步，不可跳过）

在做任何事情之前，先在对话中输出以下执行计划（直接文字输出，不加代码块）：

📋 执行计划：

  阶段 0：整理需求输入清单

  阶段 1：spawn 第1段 spec sub-agent
    - S1-0：初始化需求目录（按需）
    - S1-1：加载项目上下文（Step 1~4）
    - S1-2：读取 URL 内容
    - S1-3：前端视角深度分析
    - S1-4：生成 spec-questions.md（如有待确认问题）
    - S1-5：生成草稿文档

  阶段 2：用户填写 spec-questions.md（有问题时）

  阶段 3：spawn 第2段 spec sub-agent（定稿，有问题时）

  阶段 4：🔴 Review 门 & 可选上传学城

  阶段 5：归档（commit + push）

> ⛔ **必须严格按照上述顺序执行每一个步骤，不得跳过、不得合并、不得重排。**
>
> ⛔ **每进入一个新阶段或新步骤时，必须先在对话中输出一行声明，格式为：**
> - 进入阶段：`▶ 开始执行 阶段0：整理需求输入清单`
> - 进入子步骤：`  ▷ S1-1：加载项目上下文`
> **禁止在未输出声明的情况下直接执行操作。**

输出完毕后，立即检查断点恢复入口。

---

## 🔁 断点恢复入口

启动时读取 `requirement/<需求名>/result/spec/spec-tasks.md`，从第一个 `[ ]` 继续；文件不存在则从阶段 0 全新开始。

> ⚠️ 严禁在已完成步骤存在的情况下重新执行，避免重复上传

---

## 📋 spec-tasks.md 标准格式

spec 完成阶段 0 后生成 `result/spec/spec-tasks.md`：

```markdown
## spec 任务进度

- [x] 阶段 0：整理需求输入清单
- [ ] 阶段 1：spawn 第1段 spec sub-agent（初始化 + 分析 + 草稿）
- [ ] 阶段 2：用户填写 spec-questions.md（有问题时）
- [ ] 阶段 3：spawn 第2段 spec sub-agent（定稿，有问题时）
- [ ] 阶段 4：Review 门 & 上传学城（可选）
```

> ⚠️ 归档（阶段 5）不记录在 spec-tasks.md 中，避免 commit 后再修改文件产生额外 commit。

⚠️ 每完成一个阶段**必须立即**调用 `string_replace` 将对应行 `[ ]` → `[x]`，禁止批量回写。

---

## 🔁 完整工作流程

### 阶段 0：整理需求输入清单

**主 agent 职责（纯整理，不读文档，不分析）：**

将用户对话中的所有输入原样整理成「需求输入清单」，准备嵌入后续 sub-agent prompt：
- 用户的文字描述（需求背景、功能说明等）
- 用户提供的所有 URL（学城链接、接口文档链接等，**原样传入，由 sub-agent 自行读取**）
- 用户粘贴的设计稿截图（**直接传图，由 sub-agent 自行分析**）

若对话中**完全没有**任何需求描述、链接或截图 → 提示用户补充后暂停等待。

⛔ 整理完成后立即将 `spec-tasks.md` 阶段 0 标为 `[x]`，写入后进入阶段 1。

---

### 阶段 1：spawn 第1段 spec sub-agent（初始化 + 分析 + 草稿）

**主 agent 职责（调度）：** spawn 一个 `auto-fe-spec` 类型子 agent，prompt 包含：

```
① 任务类型：spec 第1段（初始化 + 分析 + 草稿生成）
② 需求输入清单：用户描述原文 + 所有 URL + 设计稿截图
③ 工作区根目录绝对路径
④ 目录状态：requirement/<需求文件夹名> 是否已存在（主 agent 用 glob_file_search 检查后告知）
⑤ 执行指令：按本文件【第1段 sub-agent 执行规范】完成工作
```

**主 agent await sub-agent 返回后：**
- 检查 `result/spec/spec-tasks.md` 阶段 1 是否已标为 `[x]`：
  - 否 → sub-agent 失败，读取 spec-questions.md 最新错误内容告知用户处理
  - 是 → 用 `glob_file_search` 检查 `result/spec/spec-questions.md` 是否存在（**不读取内容**）：
    - 存在 → 进入阶段 2（用户填写问题）
    - 不存在 → 草稿即最终稿，**必须立即将阶段 2、3 标为 `[x]`**（跳过也要标完成，不可直接略过），再进入阶段 4

---

### 【第1段 sub-agent 执行规范】

> ⚠️ 本节是给 sub-agent 读的执行指令，主 agent 将其嵌入 spawn prompt。

> ⛔ **必须严格按照下述顺序执行每一个步骤，不得跳过、不得合并、不得重排。每进入一个新步骤，必须先在对话中输出一行声明：进入大步骤用 `▶ 开始执行 S1-0：初始化需求目录`，进入子步骤用 `▷ Step 1：读取 project-context.md`。禁止在未输出声明的情况下直接执行操作。**

#### 🗒️ sub-agent 执行前：输出执行计划（第一步，不可跳过）

在做任何事情之前，先在对话中输出以下执行计划（直接文字输出，不加代码块）：

📋 第1段 sub-agent 执行计划：

  S1-0：初始化需求目录（按需）
  S1-1：加载项目上下文
    Step 1：读取 project-context.md
    Step 2：读取 docs/required/ 所有必读文档
    Step 3：逐条判断按需文档触发条件，输出判断清单
    Step 4：读取所有命中的按需文档
  S1-2：读取 URL 内容
  S1-3：前端视角深度分析（含 readiness 判断）
  S1-4：生成 spec-questions.md（如有待确认问题）
  S1-5：生成草稿文档（analysis.json + tec-doc.md）

---

#### S1-0：初始化需求目录（按需执行）

> 主 agent 在 prompt 中会告知「目录状态」：
> - **已存在** → 跳过本步，直接进入 S1-1
> - **不存在** → 执行以下初始化操作：

1. 根据需求描述自动推断 kebab-case 文件夹名（中文 → 英文 + 中横线，如「SPU标签展示」 → `spu-badge-display`）
2. 根据需求类型推断分支名：功能改动 → `feature/<文件夹名>`，仅样式/文案 → `style/<文件夹名>`
3. 创建需求目录结构：
   ```bash
   mkdir -p <根目录>/requirement/<文件夹名>/result/spec
   mkdir -p <根目录>/requirement/<文件夹名>/result/dev
   ```
4. 创建并切换分支：`git checkout -b <分支名>`（不存在时）或 `git checkout <分支名>`（已存在时）
5. 失败时将错误写入 `requirement/<文件夹名>/result/spec/spec-questions.md`，严禁改 checkbox，直接 return

#### S1-1：加载项目上下文（第一步）

检查 `.catpaw/rules/project-context.md` 是否存在：
- **不存在** → 跳过，直接进入 S1-2
- **存在** → 按以下三步加载：

**Step 1：读取 `project-context.md`**（必须）

**Step 2：读取 `docs/required/` 下所有文档**（必须）

**Step 3：逐条判断 `docs/on-demand/` 触发条件，输出判断清单**

读取 `project-context.md` 的「按需阅读文档」表，**必须对每一条文档逐一判断其触发条件**，不可整体跳过，不可合并为"其余都跳过"。

> ⚠️ **匹配判断不能只看「是否新增/修改」，还要看「是否使用/读取」**：改动中只要涉及某个模块的数据读取、调用或依赖，对应文档也应触发读取。

判断完毕后，**立即在对话中输出完整清单**（每条单独占一行，条目之间必须有空行），格式如下：

📚 已加载项目上下文：

  ✅ project-context.md

  ✅ docs/required/conventions.md（始终）

  ✅ docs/required/commands.md（始终）

  --- 按需阅读文档逐条判断 ---

  ✅ docs/on-demand/[文档名]（命中：[触发条件]）

  ⏭️ docs/on-demand/[文档名]（跳过：[触发条件]，本次不涉及）

  ...（每条都要列出，不可省略）

> ⚠️ Step 3 只做判断和输出清单，**不读取任何文件**，读取在 Step 4 统一执行。

**Step 4：读取所有命中的按需文档**

遍历 Step 3 清单中所有标记为 `✅` 的 `docs/on-demand/` 条目，**逐一调用 read_file 读取**（可并行）。

> ⛔ **每一条 `✅` 条目都必须有对应的 read_file 调用，不得跳过任何一条。**

#### S1-2：读取 URL 内容

对 prompt 中的每一个 URL，按以下优先级读取文本内容（**多个 URL 并行读取**）：

1. **首先用 `web_fetch`** 读取
2. 若失败（报错 / 返回空 / 需要登录）→ **改用 `mcp_tool_km_user_get_collaboration_markdown_by_sso`**，从 URL 中提取 contentId（`collabpage/` 后的数字）
3. 若两种方式均失败 → 在 `result/spec/spec-questions.md` 中追加一条「文档无法读取」问题，继续处理其他 URL

将读取到的所有文本与用户描述、截图合并，作为后续分析的完整输入。

#### S1-3：前端视角深度分析

将 S1-2 收集到的所有需求内容（用户描述、文档文本、截图分析）**统一作为输入**进行分析：

> ⚠️ 每个改动点必须明确归类为以下三种操作之一：

| 类型 | 定义 | 必填额外信息 |
|------|------|------------|
| **ADDED** | 全新功能/组件/页面 | 无 |
| **MODIFIED** | 现有功能/UI/逻辑变化 | **必须**描述「改前状态」和「改后状态」 |
| **REMOVED** | 删除现有功能/组件/路由 | **必须**描述「删除原因」和「前端清理范围」 |

**MODIFIED 改前状态获取规则：**
- 优先从 PRD/文档中提取已有描述
- 文档无描述 → **直接读取项目代码推断**（读相关组件/页面文件）
- 代码也无法确认 → 在 `result/spec/spec-questions.md` 中提问，先用「推断值」占位继续

**输出 `changePoints` 初始列表（含 type/desc/before/after/scenarios）：**
- 本次需求功能目标（1-3 句）
- 涉及页面/模块，每个标注 ADDED/MODIFIED/REMOVED
- MODIFIED：改前 → 改后；REMOVED：删除原因 + 清理范围
- 每个改动点至少 **2 个验收场景**（主流程 + 至少 1 个边界）

**同时提取 `apiChanges` 列表（如文档中有接口信息）：**
- 接口列表（路径、方法），标注 ADDED/MODIFIED/REMOVED
- MODIFIED：改前/改后入参出参结构；REMOVED：前端调用方需删除的代码范围
- 新增/废弃字段、枚举值变化（是否需要兼容旧值）

**UI 细节回填（如有设计稿输入）：**
- 将 UI 细节回填到 changePoints（补全 before/after/scenarios/techPoints）
- 交互状态（hover/点击/loading/空状态），特殊样式需求

**合并 & 交叉验证：**
- 每个 ADDED/MODIFIED changePoint 有接口支撑（无接口 → 见下方 readiness 判断）
- 整理最终 `implementPlan`（顺序：基础组件 → 页面组装 → 联调接口）和 `techPoints`

**Readiness 判断（对每个 changePoint 逐一判断）：**

| 情况 | readiness | 处理方式 |
|------|-----------|---------|
| 信息完整，可直接实现 | `ready` | 正常写入 implementPlan |
| 可以实现但某个值/字段需外部告知（AI 可推断合理 mock） | `partial` | 写入 mockItems，注明 mock 值和等待内容 |
| 接口结构/参数/跳转协议等关键信息缺失，无法合理 mock | `blocked` | 写入 blockedReason，注明等待内容 |
| 可以实现，但某个具体参数值（颜色/文案/阈值等）明确标注为暂定，后续需外部确认后替换 | `partial` | 写入 mockItems，注明暂定值和等待确认的来源（如「待 UI 确认最终色值」） |

#### S1-3：技术决策收集

判断当前 changePoints 中是否存在**有多种合理实现路径**的技术决策点：

**触发条件（满足任意一条即触发）：**
- 新增组件/页面涉及**状态管理方案选择**
- 涉及**组件拆分边界**
- 涉及**数据获取策略**（客户端请求 / SSR / 缓存方案等）
- 涉及**复用 vs 新建**的取舍
- 其他 AI 判断有两种以上合理方案、且选择会影响后续开发量或可维护性的决策

**处理方式：** 不暂停，直接给出推荐方案并记入 implementPlan/techPoints，**同时**将决策点作为一个 question 写入 `result/spec/spec-questions.md`，格式如下：

```markdown
### Q<N>（技术决策）
- **问题**：状态管理方案选择：推荐使用 Zustand 局部 store，因为该页面状态独立、无需全局共享。另一选项是 Context，适合更简单的场景。
- **AI 决策**：Zustand
- **理由**：<理由>
- **如需调整请修改 answer 字段**
- **answer**:
- **status**:
```

用户无需回复即可继续，`answer` 为空表示接受 AI 决策。

#### S1-4：生成 spec-questions.md

汇总所有需要用户确认的内容，写入 `result/spec/spec-questions.md`：

**问题来源（按优先级排列）：**
1. PRD 描述模糊 / 接口字段含义不明
2. 设计稿缺失或 UI 规则不明确
3. 逻辑冲突 / 边界条件不确定
4. MODIFIED 改前状态无法从代码推断
5. partial/blocked 候选项的 delay 确认
6. 技术决策点（AI 已给出推荐，用户可覆盖）

**文件格式：**

```markdown
## spec 待确认问题 — <需求名>

> 请在每个问题的 `answer:` 字段后填写你的回答，填完后告诉 AI「填好了」继续。
> 技术决策类问题（标注「AI 决策」）无需回答，留空表示接受 AI 推荐方案。

### Q1
- **问题**：活动详情页跳转协议是 deeplink 还是 H5？
- **来源**：cp-005，blocked，关键信息缺失
- **answer**:
- **status**:

### Q2
- **问题**：按钮文案「立即参与」还是「去参与」？PRD 第3节描述不一致。
- **来源**：cp-003，PRD 模糊
- **answer**:
- **status**:

### Q3（技术决策 / 多方案对比）
- **选项 A**：使用 SWR 缓存——列表在多页面复用且更新频率低，可减少重复请求
- **选项 B**：每次进入页面重新请求——实现最简单，不引入额外依赖
- **建议**：**A（SWR 缓存）**。理由：提升页面切换流畅度，缓存 TTL 可按需配置。
- **默认决策**：如不回复，按**选项 A** 执行。
- **answer**:
- **status**:

### Q4（技术决策）
- **问题**：列表数据获取推荐使用 SWR 缓存，因为该列表在多个页面复用且更新频率低。另一选项是每次进入页面重新请求。
- **AI 决策**：SWR 缓存
- **理由**：减少重复请求，提升页面切换流畅度
- **answer**:
- **status**:
```

> ⚠️ **铁律：不论问题格式如何（简单问题 / 技术决策 / 多方案对比 / 设计确认），每道问题的末尾都必须保留 `answer:` 和 `status:` 两个字段**（初始均为空），供用户填写答案、供第2段 sub-agent 标记处理状态，实现幂等处理。**禁止生成没有 `answer:` 字段的问题条目。**

**无问题时：** 不生成此文件（或文件为空），sub-agent 直接生成草稿文档后 return。

#### S1-5：生成草稿文档

无论是否有待确认问题，都必须生成草稿文档：

**生成草稿 `result/spec/analysis.json`：**
- 结构同正式版，partial/blocked 项的 readiness 已标注
- MODIFIED 改前状态若为推断值，在对应字段加后缀 `（推断值，待确认）`

> ⚠️ **写入格式铁律：写入 analysis.json 时必须使用 2-space 缩进格式化 JSON（等价于 `JSON.stringify(obj, null, 2)`），严禁压缩为单行。写入前必须确认 JSON 结构完整（最外层 `}` 存在），写入后立即用 read_file 验证首尾行确认文件完整性。**

**生成草稿 `result/spec/tec-doc.md`：**
- 按正式模板生成，待确认内容处用 `[NEEDS CLARIFICATION: <问题编号>]` 标注
- 技术决策处标注 `[AI 决策: <方案>，见 Q<N>]`

⛔ 生成完毕后 return，**不做 commit**，由主 agent 在阶段归档时统一处理。

---

### 阶段 2：用户填写 spec-questions.md

**主 agent 职责：** 直接输出以下固定文案（不加代码块，直接作为回复文字输出），**不读取 spec-questions.md，不汇总问题内容**：

📝 spec 分析完成！请打开以下文件，在每个 answer: 字段后填写你的回答：

  result/spec/spec-questions.md

技术决策类问题留空表示接受 AI 推荐方案。填完后告诉我「填好了」继续。

**用户在此期间提出任何疑问（不只是填答案）** → 主 agent 立即 spawn `auto-fe-spec` 类型临时 question sub-agent：

```
prompt 包含：
① 任务类型：临时问答
② 用户的问题原文
③ 需求文件夹绝对路径
④ 执行指令：
   - 读取 result/spec/tec-doc.md（草稿）
   - 读取 result/spec/analysis.json（草稿）
   - 读取 result/spec/spec-questions.md
   - 直接回答用户问题
   - 如需补充新问题则追加到 result/spec/spec-questions.md
   - 然后 return
```

> ⚠️ **主 agent 不读取上述文件内容**，由 sub-agent 自行读取。

⛔ 用户明确说「填好了」后，**直接**将 `spec-tasks.md` 阶段 2 改为 `[x]`，spawn 第2段 sub-agent（阶段 3）。**不读取任何文件，不汇总答案内容。**

---

### 阶段 3：spawn 第2段 spec sub-agent（定稿）

> ⚠️ **仅在阶段 1 产出了 `spec-questions.md` 时执行**。若无问题，阶段 1 结束后直接跳入阶段 4，本阶段不执行。

**主 agent 职责（调度）：** spawn `auto-fe-spec` 类型第2段 sub-agent，prompt 包含：

```
① 任务类型：spec 第2段（定稿）
② 需求名和需求文件夹绝对路径
③ 读取文件指令：
   - 读取 result/spec/tec-doc.md（草稿）
   - 读取 result/spec/analysis.json（草稿）
   - 读取 result/spec/spec-questions.md（含用户 answers）
④ 不读原始需求文档，不重新加载 project-context
   （例外：answer 中提到了需要判断的项目约定 → 按需读取对应 docs/on-demand/ 文件）
⑤ 执行指令：按本文件【第2段 sub-agent 执行规范】完成工作
```

**主 agent await sub-agent 返回后：**
- 检查 `result/spec/spec-tasks.md` 阶段 3 是否已标为 `[x]`：
  - 否 → sub-agent 失败，告知用户
  - 是 → 用 `glob_file_search` 检查是否有新追加的 `status:` 为空的问题（**不读内容**）：
    - 有 → **将阶段 2 checkbox 重置为 `[ ]`**，回到阶段 2 等用户补充回答
    - 无 → 进入阶段 4

---

### 【第2段 sub-agent 执行规范】

> ⚠️ 本节是给 sub-agent 读的执行指令，主 agent 将其嵌入 spawn prompt。

> ⛔ **必须严格按照下述顺序执行每一个步骤，不得跳过、不得合并、不得重排。每进入一个新步骤，必须先在对话中输出一行声明：`▶ 开始执行 S2-1：读取输入文件`。禁止在未输出声明的情况下直接执行操作。**

#### 🗒️ sub-agent 执行前：输出执行计划（第一步，不可跳过）

在做任何事情之前，先在对话中输出以下执行计划（直接文字输出，不加代码块）：

📋 第2段 sub-agent 执行计划：

  S2-1：读取输入文件（tec-doc.md / analysis.json / spec-questions.md）
  S2-2：逐条处理 answers，更新文档
  S2-3：生成最终文档（analysis.json + tec-doc.md + delay.md）

---

#### S2-1：读取输入文件

按 prompt 指令依次读取：
1. `result/spec/tec-doc.md`（草稿）
2. `result/spec/analysis.json`（草稿）
3. `result/spec/spec-questions.md`（含用户 answers）

判断是否需要补充读取项目文档：
- 扫描所有 answer 内容，若涉及项目规范/组件/路由等约定 → 按需读取对应 `docs/on-demand/` 文件
- 其余情况不读，**严禁重新加载 project-context.md 或 docs/required/**

#### S2-2：处理 answers，更新文档

> ⚠️ **只处理 `status:` 为空的问题，`status: resolved` 的问题直接跳过，不重新解析。** 这保证多次 spawn 时幂等，不会覆盖已生效的结果。

逐条扫描 `result/spec/spec-questions.md`，对每道问题：

**跳过条件（满足任意一条则跳过）：**
- `status: resolved`（已处理）

**处理逻辑（status 为空时执行）：**

- **answer 非空** → 按用户回答更新 `result/spec/analysis.json` 和 `result/spec/tec-doc.md` 草稿：
  - blocked → ready/partial（根据 answer 完整程度）
  - 技术决策被覆盖 → 按用户意见修改 implementPlan/techPoints
  - `[NEEDS CLARIFICATION: Q<N>]` 标注 → 替换为真实内容
  - 处理完毕后，将该问题的 `status:` 更新为 `status: resolved`
- **answer 为空（技术决策类）** → 保持 AI 决策，移除 `[NEEDS CLARIFICATION]` 标注，将 `status:` 更新为 `status: resolved`
- **answer 为空（非技术决策类）** → 保持 partial/blocked 状态，`[NEEDS CLARIFICATION]` 保留但改为 `[PENDING: Q<N>]`，**不写 resolved**（等待用户补充 answer 后下次处理）

发现草稿中有 **answer 未能覆盖的新问题** → 追加到 `result/spec/spec-questions.md`（新增 Q<N>，`status:` 留空），继续处理其余项，最后 return。

#### S2-3：生成最终文档

**生成最终 `result/spec/analysis.json`：**
- 写入完整字段：`requirementName`、`requirementDesc`、`branchName`、`changeScope`、`changePoints`（含 readiness/delayStatus/mockItems/blockedReason）、`apiChanges`、`implementPlan`、`techPoints`、`questions`、`parallelGroups`

> ⚠️ **写入格式铁律：写入 analysis.json 时必须使用 2-space 缩进格式化 JSON（等价于 `JSON.stringify(obj, null, 2)`），严禁压缩为单行。写入前必须确认 JSON 结构完整（最外层 `}` 存在），写入后立即用 read_file 验证首尾行确认文件完整性。**

**`parallelGroups` 生成规则（严格遵守）：**

1. **先按依赖关系分 phase**：有依赖关系的改动点必须分属不同 phase；无依赖关系的改动点优先放在同一 phase。
2. **再按文件隔离分 group**：同一 phase 内，若两个改动点涉及文件完全不相交，可拆为不同 group；文件有交叉的必须合并为同一 group。
3. **合并门槛（同时满足才拆 group）**：每个独立 group 需满足以下任一：涉及文件数 ≥ 3，或 implementPlan 步骤数 ≥ 3。**不满足则合并到同一 group 串行执行**。

**生成最终 `result/spec/tec-doc.md`：**（读模板 + 填充规则同原有设计）

1. 读取模板 `.claude/skills/auto-fe/workflows/SDD/auto-fe-spec/tec-doc.tpl.md`
2. 按 analysis.json 填充所有占位符
3. `[PENDING: Q<N>]` 标注的内容保留在「九、待确认问题」章节

**生成 `result/spec/delay.md`（有 delay 项时必须）：**

检查是否存在 `readiness` 为 `partial` 或 `blocked` 的 changePoint：
- **无 delay 项** → 跳过
- **有 delay 项** → 生成 `result/spec/delay.md`

⛔ 生成完毕后 return，不做 commit。

---

### 阶段 4：Review 门 & 上传学城（可选）

> ### 🔴 Review 门：tec-doc.md 已生成，等待你确认
>
> **在用户明确确认之前，禁止进入归档步骤。**
>
> 请检查：需求描述是否准确？改动点分类是否正确？MODIFIED 的改前/改后是否到位？接口变动是否完整？验收场景是否覆盖主流程和边界？
>
> **确认没问题后直接回复"确认"即可完成归档。如需同步上传到学城，请提供学城父文档链接，例如：**
> `https://km.sankuai.com/collabpage/2758682091`

**用户回复后处理：**

- **用户提出修改意见**（如"第3个改动点描述不对"、"这里少了一个场景"等）→
  1. 将修改意见追加到 `result/spec/spec-questions.md`（新增 Q<N>，格式同其他问题，answer 字段填入用户的修改意见）
  2. **回到阶段 3**，重置阶段 3 checkbox 为 `[ ]`，spawn 第2段 sub-agent 重新定稿
  3. sub-agent 返回后重新回到阶段 4 Review 门

  > ⚠️ **主 agent 严禁直接修改 result/spec/tec-doc.md / result/spec/analysis.json**，所有文档修改必须通过 sub-agent 执行。

- **用户提供学城父文档链接** → spawn `auto-fe-spec` 类型学城上传 sub-agent：
  ```
  prompt 包含：
  ① 任务类型：上传技术文档到学城
  ② 需求文件夹绝对路径
  ③ 学城父文档链接（原始 URL，sub-agent 自行提取 parentId）
  ④ 执行指令：
     - 读取 result/spec/tec-doc.md
     - 读取 result/spec/analysis.json 获取 requirementName
     - 调用 mcp_tool_km_user_add_collaboration_content_by_sso
       （title：前端技术文档 - <requirementName>；parentId；markdown 内容）
     - 将返回的学城链接追加写入 result/spec/spec-questions.md 末尾
     - return
  ```
  sub-agent 返回后主 agent 读取 spec-questions.md 末尾获取学城链接，告知用户
- **用户说"确认"或其他确认性回复（未提供链接，无修改意见）** → 跳过上传，直接进入阶段 5

⛔ 阶段 4 的 checkbox 由主 agent 负责（这个阶段本质是用户确认门，不是 sub-agent 任务）。用户说「确认」或提供学城链接并处理完毕后，立即将阶段 4 改为 `[x]`，进入阶段 5。

---

### 阶段 5：归档（commit + push）

**主 agent 直接执行，无需 spawn sub-agent：**

**commit + push**

```bash
git add requirement/<需求名>/
git commit -m "docs: spec 归档 - <需求名>"
git push --set-upstream origin <当前分支名>
```

> 💡 spec 阶段是功能分支首次推送，必须用 `--set-upstream` 关联远程分支。
> ⚠️ **commit message 必须使用中文需求名**，严禁英文。

成功后告知用户可进入 **auto-fe-dev：开发 & 部署**。
失败时告知用户错误信息。
