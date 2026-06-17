---
name: auto-fe-dev
chineseName: 前端自动化 - 第二步：代码开发与部署
description: 基于 tec-doc.md 完成代码开发、Spec Review、Git 推送、Talos 部署全流程。支持断点恢复，中断后重新启动自动从未完成的步骤继续。
---

## 🔒 前置检查（spec 依赖）

| 检查项 | 通过条件 | 不通过时的处理 |
|--------|----------|---------------|
| `result/spec/spec-tasks.md` 所有阶段均为 `[x]` | 所有条目已勾选 | ⛔ 提示用户先完成 spec |
| `result/spec/tec-doc.md` 存在 | 文件存在且非空 | ⛔ 提示 tec-doc.md 缺失 |

---

## 🗒️ 输出执行计划（启动后第一步，不可跳过）

在做任何事情之前，先在对话中输出以下执行计划（直接文字输出，不加代码块）：

📋 执行计划：

  前置检查：确认 spec-tasks.md 所有阶段均 [x] + tec-doc.md 存在

  步骤 1：生成 result/dev/dev-tasks.md

  步骤 2：多轮工作流并行开发
    - 读取 parallelGroups，按 phase 顺序逐轮执行
    - 每轮 spawn sub-agent（满足门槛则并行，否则串行）
    - 所有 sub-agent 返回后解析 TASK_RESULT，更新 dev-tasks.md

  步骤 3：Spec Compliance Review（spawn spec-reviewer sub-agent）

  🔴 Review 门：等待用户确认推送

  步骤 4：git push

  步骤 5：同步项目文档（可选）

  步骤 6：dev 归档（commit + push）

  步骤 7：Talos 发布（可选）

> ⛔ **必须严格按照上述顺序执行每一个步骤，不得跳过、不得合并、不得重排。**
>
> ⛔ **每进入一个新步骤时，必须先在对话中输出一行声明，格式为：**
> - `▶ 开始执行 步骤1：生成 dev-tasks.md`
> - `▶ 开始执行 步骤2：多轮工作流并行开发`
> **禁止在未输出声明的情况下直接执行操作。**

输出完毕后，立即执行前置检查，再进入断点恢复入口。

---

## 🔁 断点恢复入口

启动时读取 `requirement/<需求名>/result/dev/dev-tasks.md`，从第一个 `[ ]` 继续；文件不存在则从步骤 1 全新开始。

> ⚠️ 严禁在已完成步骤存在的情况下重新执行，避免重复创建分支/重复推送

---

## 📋 dev-tasks.md 结构

启动时生成 `result/dev/dev-tasks.md`，含两节：

| 节 | 内容 |
|----|------|
| 第 1 节 | 开发阶段（按轮工作流分组，每轮工作流末含 `✅ 第N轮工作流全部完成` 行） |
| 第 2 节 | Spec Review（对比 result/spec/analysis.json 验证实现是否符合设计） |

## ⚠️ 进度更新规则（强制执行）

**Sub-agent（只在内部维护任务列表）：**
- Sub-agent 在内部维护本次任务完成情况（不写入任何文件），完成所有改动点后，在 return 消息中附上以下格式的任务完成列表：
  ```
  TASK_RESULT:
  - [x] <改动点描述>（已完成）
  - [x] <改动点描述>（已完成）
  - [⏳] <改动点描述>（blocked，跳过）
  ```
- **不创建任何 dev-agentN-tasks.md 文件**

**主 agent（await 所有 sub-agent 返回后更新）：**
- 同一轮工作流的 sub-agent **并行 spawn，然后 await 全部返回**，不轮询
- 每个 phase 的并行数量由 `parallelGroups.phases[N].groups` 数组长度决定，**有几个 group 就 spawn 几个 sub-agent**
- 所有 sub-agent 返回后：
  1. 从各 sub-agent 的 return 消息中解析 `TASK_RESULT` 块，将 `result/dev/dev-tasks.md` 本轮工作流各行改为 `[x]`（blocked 项标为 `[⏳]`）
  2. 立即 commit `result/dev/dev-tasks.md`（格式：`chore: [第<N>轮工作流完成] 更新任务进度`）
  3. 启动下一轮工作流
- sub-agent 遇到阻塞时将问题写入 `result/dev/dev-questions.md` 后 **主动 return**
- `dev-tasks.md` 只由主 agent 写

---

## 📊 完整流程

```
0. 前置检查（spec 依赖）
   ↓
1. 生成 result/dev/dev-tasks.md
   - 读取 result/spec/analysis.json.parallelGroups，按轮工作流/Agent 格式生成第 1 节
   - parallelGroups 不存在 → 退化为串行，按改动点顺序生成 1.1/1.2...
   ↓
2. 多轮工作流并行开发

   主 agent 职责（调度）：
   - 按 result/spec/analysis.json.parallelGroups.phases 轮工作流顺序执行
   - 每轮工作流读取当前 phase 的 `groups` 数组，按以下**并行门槛**决定是否 spawn sub-agent：

   **并行门槛（同时满足以下条件才 spawn 多个 sub-agent）：**
   1. groups 数量 ≥ 2
   2. 各 group 的 `files` 集合互不相交（文件无交叉，避免 git 冲突）
   3. 每个 group 满足以下任一：涉及文件数 ≥ 3，或 implementPlan 步骤数 ≥ 3

   **不满足门槛时退化**：spawn 单个 sub-agent（groupIndex=1），将本轮所有改动点串行交给它执行

   - 满足门槛 → 并行 spawn 本轮工作流所有 sub-agent，然后 await 全部返回
   - 所有 sub-agent 返回后从 return 消息解析 TASK_RESULT，将 dev-tasks.md 本轮工作流各行标为 [x]
   - sub-agent 提前 return 时检查 result/dev/dev-questions.md，处理后重新 spawn
   - 每个 sub-agent 的 prompt 必须包含：
     ① 任务定位：需求名、需求文件夹绝对路径、轮工作流编号（phase）、groupIndex、回写规则（return 消息中附 TASK_RESULT 块）
     ② 本次改动点定位（sub-agent 自行读取，主 agent 不传内容）：
        - 对应 changePoint 的 id 列表（sub-agent 自行读取 `result/spec/analysis.json` 获取完整字段）
        - 对应 tec-doc.md 章节标题（sub-agent 自行读取 `result/spec/tec-doc.md` 获取叙事上下文）
     ③ 项目上下文加载指令（sub-agent 启动后第一步执行）：
        检查 `.catpaw/rules/project-context.md` 是否存在，存在则按以下三步加载：
        - Step 1：读取 `project-context.md`
        - Step 2：读取 `docs/required/` 下所有文档（始终必读，通常包含 conventions.md、commands.md）
        - Step 3：**必须逐条判断** `project-context.md` 「按需阅读文档」表中每一条文档的触发条件（不可整体跳过），判断完后立即在对话中输出完整清单（每条单独占一行，条目之间必须有空行）。⚠️ **匹配判断不能只看「是否新增/修改」，还要看「是否使用/读取」**：改动中只要涉及某个模块的数据读取、调用或依赖，对应文档也应触发读取。⚠️ Step 3 只做判断和输出清单，不读取任何文件，读取在 Step 4 执行。
        - Step 4：遍历 Step 3 清单中所有标记为 `✅` 的 `docs/on-demand/` 条目，**逐一调用 read_file 读取**（可并行）。⛔ **每一条 `✅` 条目都必须有对应的 read_file 调用，不得跳过任何一条。**
     ④ 安全约束：允许修改的文件列表（来自 changePoints.files），**严禁修改列表外文件**

   sub-agent 职责（执行）：

   > ⛔ **启动后第一件事（优先级最高，先于一切操作）：在对话中输出以下执行计划（直接文字输出，不加代码块），然后按计划严格执行：**
   >
   > 📋 dev sub-agent 执行计划（第\<N\>轮工作流 - Group\<groupIndex\>）：
   >
   >   Step 1：输出本执行计划
   >
   >   Step 2：读取 analysis.json 和 tec-doc.md，确认本次改动点列表
   >
   >   Step 3：加载项目上下文（project-context.md + docs/required/ + docs/on-demand/）
   >
   >   Step 4：深入阅读涉及改动的现有代码文件
   >
   >   Step 5：按 implementPlan 顺序逐项实现代码（跳过 blocked 项）
   >
   >   Step 6：每个改动点完成后立即 commit
   >
   > ⛔ **必须严格按照上述顺序执行每一个步骤，不得跳过、不得合并、不得重排。**
   >
   > ⛔ **每进入一个新步骤时，必须先在对话中输出一行声明，格式为：**
   > - `▶ 开始执行 Step 2：读取 analysis.json 和 tec-doc.md`
   > - `▶ 开始执行 Step 5：实现改动点 <id> - <描述>`
   >
   > **禁止在未输出声明的情况下直接执行操作。**

   - 执行前先读取每个改动点的 `readiness` 字段，按以下规则处理：
     - `ready` → 正常实现
     - `partial` → 正常实现，但 mockItems 中的字段用 mock 值占位，并在该行紧跟注释：
       `// TODO(mock): <waitingFor>，待 auto-fe-resume 替换为真实值`
     - `blocked` → **不写任何实现代码**，仅在预计涉及文件的适当位置插入：
       `// TODO(blocked): <blockedReason>，待 auto-fe-resume 实现`
       在内部任务列表中将该项标为 `[⏳]`（而非 `[x]`），表示跳过而非完成
   - 按 implementPlan 顺序逐项实现代码（跳过 blocked 项）
   - 实现过程中遇到信息不足时，优先自主读取 tec-doc.md 查阅完整技术文档，再决定是否需要提问
   - 遇到无法自行决策的问题 → 追加写入 result/dev/dev-questions.md，**立即 return**
   - 每个改动点完成（或标记 `[⏳]` 跳过）后：
     1. 将业务代码 commit（格式：`feat/fix/refactor: [第<N>轮-Group<groupIndex>] <中文简述改动>`，**必须使用中文描述，严禁英文**）
   - ⚠️ commit 范围：业务代码文件，**不携带任何 requirement/ 和 references/ 变更**
   - 所有改动点完成（或跳过）后，在 return 消息中附上 TASK_RESULT 块：
     ```
     TASK_RESULT:
     - [x] <改动点id> <改动点描述>（已完成）
     - [⏳] <改动点id> <改动点描述>（blocked，跳过）
     ```
   ↓
5. Spec Compliance Review（**必须 spawn spec-reviewer sub-agent，严禁主 agent 自行执行**）

   所有开发轮次完成后，主 agent 调用 `task` 工具 spawn 一个 spec-reviewer sub-agent，**主 agent 自身不做任何代码审查**：

   **sub-agent prompt 必须包含：**
   - 任务类型：Spec Compliance Review
   - 需求文件夹绝对路径（sub-agent 自行读取 `result/spec/analysis.json` 和 `result/spec/tec-doc.md`）
   - 当前 feature 分支名（主 agent 执行 `git rev-parse --abbrev-ref HEAD` 获取后传入）
   - sub-agent 自行执行 `git diff $(git merge-base HEAD main) HEAD` 获取**整个 feature 分支**相对主干的全量改动（若主干分支名为 master 则替换 main；多轮 commit 均包含）
   - 审查目标：逐条对比每个 changePoint，验证实现是否符合设计

   **spec-reviewer sub-agent 职责：**
   逐条检查每个 changePoint，输出审查结论：

   | 检查项 | 说明 |
   |--------|------|
   | 覆盖率 | 每个 `ready`/`partial` changePoint 是否都有对应的代码改动？漏实现的标 ❌；`blocked` 项有 TODO 注释即视为正常，不标 ❌ |
   | 准确性 | MODIFIED 类型的 before → after 是否按设计实现？偏差标 ⚠️ |
   | 范围符合 | 是否有改动了 changePoints.files 列表之外的文件？标 ⚠️ |
   | 接口对齐 | apiChanges 里的接口变动是否在代码中正确调用？漏接的标 ❌ |
   | 场景覆盖 | scenarios 里的关键验收场景是否在代码逻辑中有对应处理？ |

   **结论分级：**
   - ✅ 通过：所有 changePoint 均符合设计，无 ❌ 项
   - ⚠️ 有偏差：存在 ⚠️ 项，需主 agent 判断是否需要修复
   - ❌ 不通过：存在漏实现或严重偏差，**必须修复后重新 review**

   **主 agent 处理逻辑：**
   - ✅ 通过 → 直接进入步骤 6
   - ⚠️ 有偏差 → 将偏差内容展示给用户，等用户确认是接受偏差还是修复；用户要求修复则按 ❌ 逻辑处理
   - ❌ 不通过 → 按 groupIndex 定位问题所在 group，spawn `auto-fe-dev` 类型修复 sub-agent，prompt 必须包含：
     ① 任务定位：需求名、需求文件夹绝对路径、轮工作流编号（phase）、groupIndex
     ② 修复问题清单：spec-reviewer 输出的所有 ❌ 项（问题描述 + 对应 changePoint id）
     ③ 对应 changePoint 的 id 列表（sub-agent 自行读取 `result/spec/analysis.json` 获取完整字段）
     ④ 对应 tec-doc.md 章节标题（sub-agent 自行读取 `result/spec/tec-doc.md` 获取叙事上下文）
     ⑤ 项目上下文加载指令（同正常开发 sub-agent，执行 project-context.md 三步加载）
     ⑥ 安全约束：允许修改的文件列表（来自 changePoints.files）
     修复 sub-agent 返回后，**重新 spawn spec-reviewer** 做全量复查，直至通过

   ⛔ 通过后立即将 result/dev/dev-tasks.md 2.1 改为 [x]，确认写入后再继续

   > ⚠️ Spec Review 通过后，dev-tasks.md 的任务已全部完结。后续 git push / Talos / config.json 回写 / 归档均由主 Agent 直接执行，**不写入 dev-tasks.md**。
   ↓

   🔴 Review 门：代码已就绪，等待你确认推送
   ─────────────────────────────────────────
   所有改动点已完成、Spec Review 已通过。
   在你明确说"推送"或"没问题"之前，禁止执行步骤 4。
   ─────────────────────────────────────────
   ↓
4. 推送到 Git
   → git push origin <当前分支名>（spec 归档时已用 --set-upstream 建立上游关联，此处直接 push 即可）
   ↓
5. 同步项目文档（可拔插）
   💡 `.catpaw/rules/project-context.md` 存在 → 直接读取 `requirement/<需求名>/result/spec/analysis.json` 中的 `changePoints`，自主判断：
   - 本次改动是否新增了公共组件/路由/API 封装等影响全局的公共知识？
   - 若是 → 按 `project-context.md` 中「✏️ docs 维护规则」表格，更新对应 docs 文件的相关章节；**同时**若涉及技术栈/规范/架构的根本性变化，直接更新 `.catpaw/rules/project-context.md` 对应章节
   - 若否（纯业务逻辑改动、bug 修复、样式调整）→ 跳过，无需更新 docs
   > ⚠️ 此步骤无 checkbox，执行完直接进入步骤 7。
   ↓
7. dev 归档（commit + push）
   > ⚠️ 仅在 dev 全部完成后执行一次，**不记录在 dev-tasks.md 中**（避免 commit 后再修改 tasks 产生额外 commit）。
   > 归档内容包含：`result/dev/dev-tasks.md`、`result/spec/analysis.json`、`result/spec/delay.md`（如有）等 requirement 目录下所有产物。
   > ⚠️ **必须用 `git add requirement/<需求名>/` 覆盖整个目录**，严禁逐文件列举。
   > ⚠️ **commit message 必须使用中文**，严禁写 flowId、英文或其他无关信息。

   → git add requirement/<需求名>/
   → git commit -m "docs: dev 归档 - <需求名>"
   → git push origin <当前分支名>
   ↓
7. Talos 发布（可选，归档完成后触发）

   **如果用户在对话中已提供 Talos 信息** → 直接触发：

   主 agent 调用 task 工具 spawn sub-agent：
   - subagent_type: "auto-fe-talos"
   - prompt 包含：需求名、需求文件夹绝对路径、talos 配置（appId/templateId）、当前分支名（`git rev-parse --abbrev-ref HEAD`）、myMis（读取 `.catpaw/rules/memory-user-index.md` 定位条目 → 读取对应主题文件获取值；无记录则询问用户）
   - sub-agent 职责：触发发布 → 持续轮询 → 直接将 `RESULT_JSON` 通过返回消息传回，**不写入任何文件**
   - **主 agent 直接 await sub-agent 返回**

   **如果用户未提供 Talos 信息** → 停下提示：

   🚀 Talos 发布（可选）

   如需发布，请提供以下信息：
   • Talos 发布页面 URL（打开 Talos 复制地址栏链接即可）
     示例：https://talos-better.sankuai.com/release?appId=1234&templateId=5678

   告诉我以上信息后，我会自动提取 appId / templateId、查询发布环境并触发发布，持续等待结果。
   如不需要 Talos 发布，告诉我"跳过发布"即可。

   sub-agent 返回后，从返回消息的 `RESULT_JSON` 块中解析结果：
   - 成功（`success: true`）→ 输出 publishUrl 和测试链接
   - 失败（`success: false`）→ 输出 errorLog 和 publishUrl，**暂停**等待用户处理
   ↓
[完成] ✅
```

---

## 🛠️ Talos MCP 工具速查

| 操作 | MCP 工具 |
|------|---------|
| 触发发布 | `mcp_tool_auto_fe_talos_v2_publish` |
| 查询流水线模板 | `mcp_tool_auto_fe_talos_better_get_app_templates` |
| 查询构建状态 | `mcp_tool_auto_fe_talos_better_get_app_publish_info` |
| 获取构建日志 | `mcp_tool_auto_fe_talos_better_get_plugin_log` |

---

---

## 📣 完成后：大象通知（可选）

dev 全部完成后，如需通知相关人员验收，调用 `/auto-fe-notify`。

由于当前已有需求上下文，提示用户时可直接附上以下信息供 `auto-fe-notify` 使用：

💡 当前需求信息（供 /auto-fe-notify 拉群/发消息使用）：
• 需求名称：<从 result/spec/tec-doc.md 提取的中文需求名>
• 改动点摘要：<从 result/spec/analysis.json 提取的 changePoints 简述>
• 建议群名：<中文需求名>-前端

用户可直接复制上方内容触发通知，或告知群成员 MIS 和测试环境 URL 即可。
