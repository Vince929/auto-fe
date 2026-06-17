---
name: fe-archaeology
description: 对前端项目进行深度考古，生成完整项目知识库：AI 自动加载的 project-context.md + 按需生成的专题文档（docs/）+ 知识盲区探测发现的项目特有扩展文档。当用户希望分析前端项目、生成项目知识库、了解项目技术栈架构、为 AI 建立项目背景记忆时使用。触发词：前端考古、fe-archaeology、分析前端项目、生成项目文档、项目考古、建立项目知识库、让AI了解这个项目。

metadata:
  skillhub.creator: "qiuwenjing03"
  skillhub.updater: "qiuwenjing03"
  skillhub.version: "V5"
  skillhub.source: "FRIDAY Skillhub"
  skillhub.skill_id: "15899"
  skillhub.high_sensitive: "false"
---

# fe-archaeology 前端考古器

前端专项知识库生成工具，深度扫描项目源码，为 AI 建立完整的项目背景记忆：

| 产物         | 路径                                | 说明                                                          |
| ------------ | ----------------------------------- | ------------------------------------------------------------- |
| 项目上下文   | `.catpaw/rules/project-context.md` | AI 自动加载，包含完整背景+技术栈+规范+文档索引，无需二次跳转  |
| 必读专题文档 | `docs/required/`                    | 始终生成的核心文档（命名规范/命令等）+ 必读型扩展文档（宿主参数/私有SDK等），AI 每次启动必须读取 |
| 按需专题文档 | `docs/on-demand/`                   | 满足条件才生成，按触发条件按需读取（组件/路由/状态管理等）+ 按需型扩展文档（特定场景才需要的项目特有知识） |

---

## 执行流程

### 阶段一：前置检查

1. 确认项目根目录存在 `package.json`。
   - **不存在** → 输出「❌ 未检测到 package.json，fe-archaeology 仅支持前端工程化项目」并终止。
2. 检查是否已存在 `.catpaw/rules/project-context.md`，若存在询问用户：
   - 「检测到已有考古记录，是否执行**增量考古**（仅更新变更部分）？」
   - 用户选择「增量」→ 跳至**阶段六（增量更新）**
   - 用户选择「全量」→ 继续执行

---

### 阶段二：项目扫描

运行扫描脚本（Windows 需先设置编码，避免中文乱码）：

```bash
# Windows PowerShell（必须设置编码，否则中文乱码）
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $OutputEncoding = [System.Text.Encoding]::UTF8; node .claude/skills/fe-archaeology/scripts/scan_project.js .
# macOS / Linux
node .claude/skills/fe-archaeology/scripts/scan_project.js .
```

> ⚠️ 禁止加 `| more` 等分页管道（会导致命令挂起）。

脚本输出：项目类型/框架版本/状态管理/路由/HTTP客户端、目录树（4层）、关键文件清单、文件类型统计。

同时读取 `package.json` 完整内容，提取 dependencies/devDependencies（版本）、scripts、engines。

输出：「✓ 扫描完成：[框架] + [构建工具] + [状态管理] + [包管理器]」

---

### 阶段三：深度分析

| 分析项             | 操作                                                                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **3.1 架构与目录** | 分析 `src/` 一二级目录，识别 pages/components/hooks/utils/api/store/router/types/const；判断 Feature-based / Type-based / 混合；识别是否多入口（`src/entries/` 多个子目录） |
| **3.2 命名规范**   | 扫描前 20 个 `.tsx/.ts/.vue` 文件名，统计 PascalCase/kebab-case/camelCase；读取 `.eslintrc.*` / `eslint.config.*` / `.prettierrc.*` 提取关键规则                            |
| **3.3 路由结构**   | 按优先级查找：① `src/entries/` ② `src/router/index.ts(.js)` ③ `src/routes/` ④ `src/App.tsx(.jsx)`（`<Route>` 或 `createBrowserRouter`）⑤ `src/App.vue`                      |
| **3.4 状态管理**   | 读取 `src/store/` 或 `src/stores/` 入口文件，收集切片/模块名称及职责                                                                                                        |
| **3.5 API 通讯**   | 检查 `src/api/` / `src/services/` / `src/request/`，读取 1-2 个典型文件，提取封装方式、拦截器、错误处理                                                                     |
| **3.6 公共组件**   | 扫描 `src/components/` 所有子目录，每个组件提取：名称、JSDoc/推断用途、Props 接口                                                                                           |
| **3.7 工具函数**   | 扫描 `src/utils/` 所有 `.ts/.tsx/.js/.jsx`，提取 export 函数签名（函数名/参数类型/返回类型）                                                                                |

输出：「✓ 深度分析完成」

---

### 阶段三点五：知识盲区探测（⭐ 防止遗漏项目特有知识）

> **核心理念**：固定模板只能覆盖"标准项目"的通用维度。本阶段以"一个初级开发者接手此项目时，最容易踩坑、最难从固定文档维度中找到答案的知识点"为视角，主动发现超出固定模板的项目特有知识。

#### 执行方式

对以下每个探测维度，**主动读取相关源码文件**进行判断（不能只依赖扫描脚本输出）：

| 探测维度 | 检测方式 | 若发现则... |
| -------- | -------- | ----------- |
| **宿主/容器环境参数** | 读取入口文件（`app.ts`/`main.ts`/`index.ts`）和页面初始化生命周期，检查是否有 URL query 解析、宿主注入的全局对象（如 `window.__APP_CONFIG__`、`App.globalData`）、宿主专属 API 调用 | 记录参数字段含义、注入时机、在业务中的透传链路 |
| **内部私有 SDK / 非开源包** | 检查 `package.json` 中以公司前缀开头的私有包（如 `@company/`、`@internal/` 等），读取其在项目中的实际调用方式 | 记录包的用途、核心 API、初始化方式、与标准库的差异 |
| **非标准跨组件通信** | 搜索全局事件总线（自定义 `EventBus`、`mitt`、`pubsub`）、全局状态对象、`window` 上挂载的共享方法、自定义发布订阅模式 | 记录通信机制、事件/方法命名约定、触发方与监听方 |
| **特殊数据格式与协议** | 检查是否有非 JSON 序列化（Base64 编解码、protobuf、私有二进制协议）、特殊字段命名约定、数据脱敏/转换规则 | 记录格式规范、编解码规则、在哪个层处理 |
| **多环境/多平台差异逻辑** | 搜索 `process.env.*`、`import.meta.env.*`、`platform`、`__ENV__` 等环境变量，检查是否有多套 host/API 配置、多端适配分支（Web/小程序/App/桌面端） | 记录各环境/平台的差异点、判断条件、配置入口 |
| **约定大于配置的隐式规则** | 检查是否存在：特定目录下文件被自动注册（页面、路由、store 模块等）、特定命名触发框架行为、特定字段必须存在才能正常运行 | 记录约定规则，说明"为什么这样命名/放置" |
| **已知坑与版本 Breaking Change** | 读取 `CHANGELOG.md`、`README.md`，扫描代码注释中的 `FIXME` / `HACK` / `⚠️` / `TODO`，以及依赖版本被强制锁定的注释 | 记录坑点描述、触发条件、规避方案 |
| **启动/构建的特殊前置步骤** | 读取 `scripts/` 目录脚本、`package.json` 的 `pre*`/`post*` 钩子、CI 配置文件（`.github/workflows/`、`Jenkinsfile`），检查是否有代码生成、密钥注入、环境初始化等必须先跑的步骤 | 记录步骤名称、执行时机、跳过后的后果 |
| **框架/库的扩展生命周期** | 检查项目使用的框架是否提供了超出标准生命周期的扩展钩子（如插件系统、中间件、Hook 注入点、自定义 Renderer），读取项目实际注册和使用的位置 | 记录扩展钩子名称、执行时机、项目中的用途 |

#### 输出格式

探测完成后，列出发现的**盲区知识点清单**：

```
🔍 知识盲区探测结果：
  ✅ 已被固定模板覆盖，无额外处理
  
  📌 发现 [N] 个超出固定模板的项目特有知识点：
  1. [知识点名称]：[一句话描述] → 计划追加到 [目标文档名]（必读/按需）
  2. [知识点名称]：[一句话描述] → 需新建专题文档 docs/required/[filename].md（必读）
  3. [知识点名称]：[一句话描述] → 需新建专题文档 docs/on-demand/[filename].md（按需：[触发条件]）
  ...
```

**必读 vs 按需 判断标准**：

| 类型     | 判断标准                                                                                                          | 放置目录           |
| -------- | ----------------------------------------------------------------------------------------------------------------- | ------------------ |
| **必读** | 不读就无法正确开发的知识：宿主/容器环境初始化参数、内部私有 SDK 的核心使用方式、项目必须遵守的隐式约定、已知高频坑点（> 3 条） | `docs/required/`   |
| **按需** | 特定场景才需要的知识：某类功能的通信机制、特殊数据格式、多端差异（只在对应改动时才需读）                            | `docs/on-demand/`  |

对每个发现的知识点，**决策写入策略**：
- **可归类到现有文档**（如属于"API通讯"、"架构"等）→ 在对应文档末尾追加独立章节
- **无法归类** → 根据上方判断标准决定放 `docs/required/` 还是 `docs/on-demand/`，新建专题文档并在 `project-context.md` 对应索引表中添加条目

输出：「✓ 知识盲区探测完成，发现 [N] 个特有知识点」

---

### 阶段四：生成 .catpaw/rules/project-context.md（项目上下文完整内容）

> ⚠️ 本文件直接写入完整的项目背景、技术栈、规范和文档索引。系统会自动将 rules 文件注入 AI 上下文，AI 无需再跳转读取其他文件。

写入以下内容（将所有占位符替换为实际内容，替换规则见下方 4.2）：

````markdown
---
ruleType: Always
description: [项目名称] 前端项目。涉及此项目的任何提问、开发、修改、调试，AI 必须基于本文件内容作答。
---

# [项目名称]-dev

## 📌 项目背景

| 字段         | 内容              |
| ------------ | ----------------- |
| **项目名称** | <project-name>    |
| **项目描述** | <description>     |
| **目标平台** | <platform>        |
| **架构类型** | <arch-type>       |
| **业务领域** | <business-domain> |

## 🛠 技术栈

| 分类     | 技术          | 版本      |
| -------- | ------------- | --------- |
| 框架     | <framework>   | <version> |
| 构建     | <bundler>     | <version> |
| 状态管理 | <state-lib>   | <version> |
| 路由     | <router-lib>  | <version> |
| HTTP     | <http-lib>    | <version> |
| 包管理   | <pkg-manager> | —         |

## 🔩 框架关键特性

> 仅记录本项目**实际用到**的特性，通用知识不在此列。

<framework-key-features>

**⚠️ 版本注意事项**（已知坑 / Breaking Change）：
<framework-warnings>

## 📁 目录结构

```
src/
<directory-tree>
```

## ⚡ 快速启动

```bash
<install-command>   # 安装依赖
<dev-command>       # 启动开发
<build-command>     # 生产构建
```

## 📐 核心规范（必须遵守）

- **命名风格**：<naming-rules>
- **API 规范**：所有 HTTP 请求封装在 `src/api/`，**禁止在组件中直接请求**
- **状态管理**：切片职责单一，跨域状态才进 store，UI 临时状态用 useState
- **组件复用门槛**：≥2处使用才抽取为公共组件

## 📚 文档索引（分级加载）

> **必读文档**（`docs/required/`）：每次启动后立即读取，包含始终适用的核心规范。
> **按需阅读文档**（`docs/on-demand/`）：根据当前任务的触发条件判断是否读取；触发条件命中则读取，否则跳过。

### 必读文档

| 文档                                                            | 用途                                   | 触发条件 |
| --------------------------------------------------------------- | -------------------------------------- | -------- |
| **必读** [conventions.md](docs/required/conventions.md)         | 命名约定与代码风格（所有开发必须遵守）  | 始终     |
| **必读** [commands.md](docs/required/commands.md)               | 开发/构建/调试命令全量参考              | 始终     |

### 按需阅读文档

| 文档                                                                          | 用途                                                                    | 触发条件                                             |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------- |
| [framework.md](docs/on-demand/framework.md)                                   | 多框架架构边界（关键特性已内嵌「🔩 框架关键特性」章节）                  | 多框架/微前端项目，或框架相关坑点 > 5 条             |
| [state-management.md](docs/on-demand/state-management.md)                     | 状态管理详细用法与切片说明                                               | 任务涉及状态管理/store/切片读写                      |
| [architecture.md](docs/on-demand/architecture.md)                             | 整体架构与设计模式                                                       | 任务涉及新模块/整体架构调整/数据流理解               |
| [practices-page.md](docs/on-demand/practices-page.md)                         | 页面层开发规范（组件结构/副作用/错误边界/性能）                          | 任务涉及新增/修改页面组件                            |
| [practices-component.md](docs/on-demand/practices-component.md)               | 通用组件开发规范（Props/模板/样式）                                      | 任务涉及新增/修改公共组件                            |
| [practices-data.md](docs/on-demand/practices-data.md)                         | 数据层开发规范（切片/异步/错误处理）                                     | 任务涉及数据层/异步逻辑/store 切片                   |
| [api-communication.md](docs/on-demand/api-communication.md)                   | HTTP 通讯封装与规范                                                      | 任务涉及接口请求/API 封装/拦截器                     |
| [directory-structure.md](docs/on-demand/directory-structure.md)               | 目录说明与模块依赖图                                                     | 任务涉及新增目录/模块/理解复杂目录结构               |
| [routes.md](docs/on-demand/routes.md)                                         | 路由配置表                                                               | 任务涉及路由新增/修改/权限守卫                       |
| <components-index-entries>                                                                                                                                                                           |
| [utils.md](docs/on-demand/utils.md)                                           | 工具函数签名与示例                                                       | 任务涉及工具函数调用/新增/修改                       |

## ✏️ docs 维护规则

> 代码改动完成后，AI 根据改动点判断是否涉及**项目公共知识**的变化（新增公共组件/路由/API封装等），若是则主动更新对应 docs 文件的相关章节。纯业务逻辑改动、bug 修复、样式调整无需更新 docs。

| 代码变更类型                                       | 需回写的文档                                                                            |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 新增/删除/修改路由                                 | `docs/on-demand/routes.md`                                                              |
| 新增/修改/删除公共组件，或 Props 变化              | `docs/on-demand/components.md`（或对应分类文件：`components-ui.md` / `components-business.md` / `components-layout.md` 等） |
| 新增/修改/删除 utils 函数，或函数签名变化          | `docs/on-demand/utils.md`                                                               |
| 替换/升级 HTTP 库，或修改请求封装、拦截器          | `docs/on-demand/api-communication.md` + 本文件技术栈表                                  |
| 替换/升级状态管理库，或新增/删除 store 切片        | `docs/on-demand/state-management.md` + 本文件技术栈表                                   |
| 替换/升级框架或核心依赖                            | 本文件技术栈表 + 「🔩 框架关键特性」章节                                                |
| 修改构建配置、新增/删除构建脚本                    | `docs/required/commands.md` + 本文件快速启动章节                                        |
| 修改目录结构，或新增/删除核心目录                  | `docs/on-demand/directory-structure.md` + 本文件目录结构章节                            |
| 修改命名规范、ESLint/Prettier 配置                 | `docs/required/conventions.md` + 本文件核心规范章节                                     |
| 修改整体架构设计、引入新模式                       | `docs/on-demand/architecture.md` + 本文件项目背景章节                                   |
| 修改页面层开发规范                                 | `docs/on-demand/practices-page.md`                                                      |
| 修改组件层开发规范                                 | `docs/on-demand/practices-component.md`                                                 |
| 修改数据层开发规范                                 | `docs/on-demand/practices-data.md`                                                      |
| **任何涉及项目背景、技术栈、核心规范的根本性变化** | **同步更新 `.catpaw/rules/project-context.md` 对应章节**                               |
````

**4.2 替换所有占位符**（从阶段三的分析结果提取）：
- `<project-name>` → 项目名称
- `<description>` / `<platform>` / `<arch-type>` / `<business-domain>` → 项目背景信息
- `<framework>` / `<bundler>` / `<state-lib>` / `<router-lib>` / `<http-lib>` / `<pkg-manager>` → 技术栈各项（含版本）
- `<directory-tree>` → `src/` 下目录树（2层深度 + 一句话注释）
- `<install-command>` / `<dev-command>` / `<build-command>` → 实际命令
- `<naming-rules>` → 项目实际命名风格（一行）
- `<framework-key-features>` → 本项目实际用到的特殊框架特性（每条：`- **特性名**：[使用场景/位置]`）；通用框架介绍一律不写；无特殊用法则填「无」
- `<framework-warnings>` → 当前框架版本已知坑/Breaking Change（每条一行，写坑+规避方案），无则填「无」
- `<components-index-entries>` → 根据 **5.12 实际生成的文件**动态填充，填入「按需阅读文档」表中，规则如下：
  - 单文件策略（只生成了 `components.md`）：
    ```
    | [components.md](docs/on-demand/components.md) | 公共组件 Props 与使用示例 | 任务涉及公共组件调用/新增/修改 |
    ```
  - 拆分文件策略（生成了总索引 + 分类文件）：先写总索引行，再逐一追加**实际生成的**分类文件行，跳过未生成的分类：
    ```
    | [components.md](docs/on-demand/components.md)             | 公共组件总索引（Props 详情见分类文件）    | 任务涉及公共组件调用/新增/修改 |
    | [components-ui.md](docs/on-demand/components-ui.md)       | 通用 UI 组件 Props 与使用示例            | 任务涉及通用 UI 组件 |  ← 仅在实际生成时写
    | [components-business.md](docs/on-demand/components-business.md) | 业务组件 Props 与使用示例           | 任务涉及业务组件 |  ← 仅在实际生成时写
    | [components-layout.md](docs/on-demand/components-layout.md) | 布局/功能组件 Props 与使用示例        | 任务涉及布局/功能组件 |  ← 仅在实际生成时写
    | [components-form.md](docs/on-demand/components-form.md)   | 表单组件 Props 与使用示例                | 任务涉及表单组件 |  ← 仅在实际生成时写
    ```
  > ⚠️ **严禁**写入未实际生成的分类文件条目，避免产生悬空引用

输出：「✓ 生成 .catpaw/rules/project-context.md」

---

### 阶段五：生成 docs/ 详细文档（分级生成层）

**在项目根目录创建 `docs/required/` 和 `docs/on-demand/` 目录（若不存在）。**

> 📁 **目录规则**：
> - `docs/required/`：始终生成的核心文档（命名规范/命令），AI 每次启动必须读取
> - `docs/on-demand/`：按条件生成的专题文档，AI 按触发条件按需读取

> 🔑 **核心原则：做减法，不为了生成而生成**
>
> 每个文档都有"生成条件"，**条件不满足则直接跳过，不生成空洞文件，不写"未检测到"占位符**。
> 文档总数不固定，取决于项目实际情况，可能只生成 3-4 个，也可能生成 10 个以上。

> ⚠️ **文档精简铁律（每个文档生成时必须遵守）**：
>
> | 铁律                       | 执行                                                                   |
> | -------------------------- | ---------------------------------------------------------------------- |
> | 先判断再生成               | 检查"生成条件"，不满足则直接跳过，**不生成内容空洞的占位文件**        |
> | 只写项目特有内容           | 通用框架介绍/设计模式理论/「为什么」解释 → 不写                        |
> | 代码示例取自实际代码       | 无可提取实例则省略，不造通用示例                                       |
> | 章节内容不足时删除整章节   | 某章节无实质内容（如"未使用"/"未配置"）→ 删除该章节，不写占位文字     |
> | 散文改表格                 | 规则对比/技术矩阵/命名规范 → 用表格                                    |
> | 禁止废话句型               | 「通常来说」「一般情况下」「最佳实践是」→ 直接删                       |

**5.1 【按需】生成 `docs/on-demand/framework.md`**

> **生成条件**（满足任一即生成，否则跳过）：
> - 项目存在多套框架（微前端/跨框架入口）
> - 框架相关已知坑数量 > 5 条，project-context.md 放不下
> - 用户明确要求生成
>
> 关键特性已内嵌 project-context.md「🔩 框架关键特性」章节，标准单框架项目无需重复生成。

若需生成，包含：多框架架构边界表（框架/负责区域/入口文件/通讯方式）、扩展版本注意事项

输出：「✓ 生成 docs/on-demand/framework.md」或「⏭️ 跳过 docs/on-demand/framework.md（单框架项目，关键特性已在 project-context.md）」

**5.2 【按需】生成 `docs/on-demand/state-management.md`**

> **生成条件**（满足任一即生成，否则跳过）：
> - 存在 `src/store/`、`src/stores/` 目录，或检测到 Redux/Zustand/Pinia/Vuex/MobX 等状态管理库
> - 存在至少 2 个以上状态切片/模块值得文档化

若满足条件，包含：状态管理库版本、在组件中的使用方式（从项目现有代码提取示例）、项目现有切片/模块详细说明（名称/文件路径/职责/State 结构/主要 actions）。**只写实际存在的切片，不造示例。**

输出：「✓ 生成 docs/on-demand/state-management.md（[N] 个切片）」或「⏭️ 跳过 docs/on-demand/state-management.md（无集中状态管理）」

**5.3 【按需】生成 `docs/on-demand/architecture.md`**

> **生成条件**（满足任一即生成，否则跳过）：
> - 项目目录结构复杂（超过 3 层主要目录分支）
> - 存在非标准架构（微前端、多入口、monorepo 子包等）
> - 核心数据流不直观，新人容易搞错调用链路
>
> 简单单页应用、结构扁平的项目通常不需要此文档。

若满足条件，包含：架构类型（一行）、代码组织方式（目录示例）、核心数据流（Mermaid 流程图）、关键架构决策表（技术选型 + 一句话理由）。**设计模式列表：只写项目中实际体现的，无则省略整个章节。**

输出：「✓ 生成 docs/on-demand/architecture.md」或「⏭️ 跳过 docs/on-demand/architecture.md（结构简单，已在 project-context.md 目录结构章节覆盖）」

**5.4 【按需】生成 `docs/on-demand/practices-page.md`**

> **生成条件**（满足任一即生成，否则跳过）：
> - 项目存在 `src/pages/` 目录，且有 3 个以上页面组件
> - 项目有明确的页面层开发约定（如特定文件组织方式、必须使用的 HOC/装饰器等）
>
> 仅 1-2 个页面的小项目通常不需要此文档。

若满足条件，包含：文件组织结构（目录树）、典型页面组件结构（从项目实际代码提炼）、副作用管理规范（**仅项目实际约束，无约束则省略整章节**）、错误边界用法（**有实际组件才写，否则省略**）、性能优化规范（**仅项目实际已用方案，无则省略**）。

输出：「✓ 生成 docs/on-demand/practices-page.md」或「⏭️ 跳过 docs/on-demand/practices-page.md（页面数量少/无特殊约定）」

**5.5 【按需】生成 `docs/on-demand/practices-component.md`**

> **生成条件**（满足任一即生成，否则跳过）：
> - `src/components/` 存在 5 个以上公共组件
> - 项目有明确的组件开发规范（如统一 Props 命名、禁止特定写法等）
>
> 无明确规范且组件少的项目通常不需要此文档，组件信息已在 components.md 中覆盖。

若满足条件，包含：Props 设计原则（表格：✅做法 vs ❌避免，**必须基于项目实际代码，无实例则省略整章节**）、组件结构模板（基于项目实际风格）、样式管理规范（方案 + 关键约束）、组件复用门槛规则。

输出：「✓ 生成 docs/on-demand/practices-component.md」或「⏭️ 跳过 docs/on-demand/practices-component.md（组件少/无特殊规范，已被 components.md 覆盖）」

**5.6 【按需】生成 `docs/on-demand/practices-data.md`**

> **生成条件**（满足任一即生成，否则跳过）：
> - 项目有集中状态管理（store），且有明确的数据层开发规范
> - 异步逻辑处理有特殊约定（如统一 loading 管理、错误上报机制等）
>
> 无状态管理或数据处理逻辑散落各处（无统一规范）的项目直接跳过。

若满足条件，包含：数据切片开发规范（表格）、异步逻辑处理方式（**从项目实际代码提取，无实例则省略**）、统一错误处理模式（**有实际实现位置才写**）、通讯逻辑归属规则（MUST/MUST NOT）。

输出：「✓ 生成 docs/on-demand/practices-data.md」或「⏭️ 跳过 docs/on-demand/practices-data.md（无集中数据层规范）」

**5.7 生成 `docs/required/conventions.md`**（始终生成，但内容按实际情况删减）

> **始终生成**（每个项目都有命名和代码风格），但章节内容严格按实际情况取舍：
> - **命名规则表**：从实际文件名扫描提取，**无法统计规律时省略**
> - **代码风格关键规则**：**只从 ESLint/Prettier 配置文件中提取已启用的规则**，无配置文件则仅写"未检测到代码风格配置"一行，不展开

包含：命名规则表（文件类型 → 命名风格 → 示例，从项目实际文件名提取）、代码风格关键规则（从 ESLint/Prettier 配置提取，只写已启用的规则）。

输出：「✓ 生成 docs/required/conventions.md」

**5.8 【按需】生成 `docs/on-demand/api-communication.md`**

> **生成条件**（满足任一即生成，否则跳过）：
> - 存在 `src/api/`、`src/services/`、`src/request/` 等 API 封装目录
> - 存在统一的 HTTP 请求封装（自定义 axios 实例、fetch 封装等）
> - 存在拦截器、统一错误处理等值得文档化的通讯规范
>
> API 调用散落在各组件中、无统一封装的项目直接跳过（在 conventions.md 中加一行禁止说明即可）。

若满足条件，包含：HTTP 客户端（一行）、API 封装目录结构（目录树）、请求封装示例（**从实际文件提取，无则省略**）、通讯规范（MUST/MUST NOT，每条一行）。

输出：「✓ 生成 docs/on-demand/api-communication.md」或「⏭️ 跳过 docs/on-demand/api-communication.md（无统一 API 封装层）」

**5.9 生成 `docs/required/commands.md`**（始终生成）

> **始终生成**（每个项目都需要知道怎么跑起来）。
> - **前置要求表**：只写工具名和版本要求，无特殊要求则省略此章节
> - **scripts**：所有 `package.json` scripts 都列出，附一句话说明
> - **调试方法**：**只写项目实际配置**（如 launch.json、特殊环境变量），无则省略
> - **常见问题**：**只写项目已知坑**，无则省略整个章节（不写"暂无"）

输出：「✓ 生成 docs/required/commands.md」

**5.10 【按需】生成 `docs/on-demand/directory-structure.md`**

> **生成条件**（满足任一即生成，否则跳过）：
> - 项目目录层级超过 3 层，或存在非显而易见的特殊目录用途
> - 目录组织方式有特殊约定（如按 feature 分组、特定目录自动扫描等）
>
> 结构简单（`src/` 下就是 `pages/components/utils`）的项目无需此文档，目录树已在 project-context.md 中覆盖。

若满足条件，包含：目录树（2-3 层，每行附职责注释）、目录职责说明表（目录 → 职责 → 典型文件示例）、模块依赖关系图（**复杂项目才画 Mermaid，简单项目省略**）。

输出：「✓ 生成 docs/on-demand/directory-structure.md」或「⏭️ 跳过 docs/on-demand/directory-structure.md（结构简单，已在 project-context.md 覆盖）」

**5.11 【按需】生成 `docs/on-demand/routes.md`**

> **生成条件**（满足任一即生成，否则跳过）：
> - 检测到路由配置（React Router、Vue Router、Next.js pages 目录等），且路由数量 ≥ 5 条
> - 路由有动态参数、权限守卫、懒加载等需要特别说明的特性
>
> 路由少于 5 条、或无标准路由配置（如使用小程序框架原生页面机制）的项目直接跳过。

若满足条件，按 3.3 相同优先级查找路由配置，提取每条路由：完整路径（含父路由前缀）、页面组件文件路径、standalone 标志（若有）。输出为路由表格，含维护规则说明。

输出：「✓ 生成 docs/on-demand/routes.md（[N] 条路由）」或「⏭️ 跳过 docs/on-demand/routes.md（路由少/无标准路由配置）」

**5.12 【按需】生成 `docs/on-demand/components.md`（或分类文件）**

> **生成条件**（满足任一即生成，否则跳过）：
> - `src/components/`（或等价目录）存在 3 个以上公共组件
>
> 无公共组件目录，或组件完全内嵌在各 page 中的项目直接跳过。

若满足条件，扫描 `src/components/` 下所有子目录，每个子目录为一个组件：

- 定位主文件（index.tsx > index.vue > index.ts > 同名文件）
- 提取用途（JSDoc 或推断）、Props 接口、导出名称
- 生成组件文档（路径/用途/Props 表/使用示例）

**根据组件数量选择生成策略：**

- **≤ 15 个组件**：单文件策略，生成 `docs/on-demand/components.md`，超过 10 个时按功能分类并在顶部提供锚点索引
- **> 15 个组件**：拆分文件策略：
  1. 将所有组件按功能归类（通用 UI / 表单 / 布局 / 业务组件 / 其他）
  2. 每个分类生成独立文件：`docs/on-demand/components-ui.md` / `docs/on-demand/components-form.md` / `docs/on-demand/components-layout.md` / `docs/on-demand/components-business.md`（类别无组件则跳过）
  3. 生成 `docs/on-demand/components.md` 作为**总索引文件**，只含：各分类文件链接 + 每个组件一行简介（组件名 / 文件路径 / 一句话用途），不含 Props 详情
  4. 总索引文件顶部注明：「Props 详情见各分类文件」

输出：「✓ 生成 docs/on-demand/components.md」（单文件）或「✓ 生成 docs/on-demand/components.md（总索引）+ docs/on-demand/components-ui.md 等分类文件」或「⏭️ 跳过 docs/on-demand/components.md（无公共组件目录）」

**5.13 【按需】生成 `docs/on-demand/utils.md`**

> **生成条件**（满足任一即生成，否则跳过）：
> - `src/utils/` 或等价目录存在 5 个以上工具函数
>
> 工具函数少于 5 个的项目直接跳过（函数列表在 project-context.md 核心规范中一并提及即可）。

若满足条件，扫描 `src/utils/` 下所有文件及子目录：

- 提取所有 export 函数签名（函数名/参数类型/返回类型）
- 提取 JSDoc 注释，无注释则推断用途
- 生成函数文档（函数名/签名/参数表/代码示例）
- 顶部提供目录索引（文件名 → 说明）

输出：「✓ 生成 docs/on-demand/utils.md（[N] 个函数）」或「⏭️ 跳过 docs/on-demand/utils.md（工具函数少，已在 conventions.md 中覆盖）」

**5.14 处理阶段三点五发现的盲区知识点（⭐ 扩展文档）**

> 本步骤处理固定模板无法覆盖的项目特有知识。扩展文档直接归入 `docs/required/` 或 `docs/on-demand/`，不单独设品类。

对阶段三点五列出的每个知识点，按决策策略执行：

**策略 A：追加到现有文档**

在对应文档末尾追加独立章节，格式：

```markdown
## [知识点标题]

> 本章节为项目特有内容，超出标准模板范围。

[具体内容，来自源码的实际代码示例]
```

**策略 B：新建专题文档**

根据「必读 vs 按需」判断标准决定目录：

- **必读型**（不读就会出错的知识）→ 新建 `docs/required/[topic].md`，在 `project-context.md` 的「必读文档」表追加条目：
  ```markdown
  | **必读** [topic.md](docs/required/topic.md) | [一句话描述该文档的用途] | 始终 |
  ```
- **按需型**（特定场景才需要的知识）→ 新建 `docs/on-demand/[topic].md`，在 `project-context.md` 的「按需阅读文档」表追加条目：
  ```markdown
  | [topic.md](docs/on-demand/topic.md) | [一句话描述该文档的用途] | [该文档的触发条件] |
  ```

文档包含：
- 简要说明（这是什么、为什么重要）
- 详细机制（结合实际源码说明）
- 使用示例（从项目实际代码中提取）
- 常见错误与规避

> ⚠️ 扩展文档数量不设上限，有多少发现就生成多少。宁可多一个专题文档，也不要让知识点消失在固定模板里。

输出：「✓ 生成扩展文档 [N] 个（必读 [X] 个放入 docs/required/，按需 [Y] 个放入 docs/on-demand/），追加章节 [M] 处」

---

### 阶段六（增量更新）

> 仅在用户选择「增量考古」时执行。

1. 运行扫描脚本获取当前项目状态
2. 逐一对比已有 `.catpaw/rules/project-context.md` 和 `docs/` 文档，识别变更维度
3. 仅重新生成有变更的文件（注意保持 docs/required/ 和 docs/on-demand/ 目录结构）
4. **重新执行阶段三点五（知识盲区探测）**，检查是否有新的特有知识点未被覆盖，若发现则追加扩展文档或章节
5. 在文件头部更新 `最近考古时间` 字段

输出：「✓ 增量考古完成，已更新 [N] 个文件，新增扩展文档 [M] 个」

---

### 阶段七：完成输出

```
✅ fe-archaeology 前端考古完成！

.catpaw/rules/project-context.md  ← AI 自动加载，含完整项目背景+技术栈+规范+文档索引

docs/required/（始终读取层）← AI 每次启动必读：
  ✓ conventions.md（命名规范/代码风格）
  ✓ commands.md（启动/构建/调试命令）
  ✓ [必读型扩展文档，如宿主环境参数/私有SDK等...]（若有）

docs/on-demand/（按需读取层）← 本次实际生成 [N] 个专题文档：
  ✓ [满足生成条件的专题文档...]
  ✓ [按需型扩展文档...]（若有）
  ⏭️ 跳过：[未生成的文档名]（原因：[跳过原因]）

后续开发：AI 自动加载 project-context.md，无需额外触发，即获完整项目背景。
```

---

## 错误处理

| 情况 | 处理方式 |
|------|---------|
| `src/` 目录不存在 | 跳过所有依赖 `src/` 的文档，在完成输出中说明 |
| 路由配置无法识别 / 路由少于 5 条 | **直接跳过 `routes.md`**，不生成占位文件 |
| ESLint/Prettier 配置不存在 | `conventions.md` 中命名规则章节正常生成，代码风格章节写"未检测到代码风格配置"一行后省略 |
| `store/` 目录不存在 / 无状态管理库 | **直接跳过 `state-management.md`**，不生成占位文件 |
| `api/` 目录不存在 / 无统一 HTTP 封装 | **直接跳过 `api-communication.md`**，不生成占位文件 |
| 某章节无可提取的项目特有内容 | 删除该章节，不写"暂无"或"未使用"等占位文字 |
| 文档预估超过 500 行 | 分批生成（每批 500 行），自动继续，不询问用户 |

---

## 相关资源

- **扫描脚本**：`.claude/skills/fe-archaeology/scripts/scan_project.js`
- **docs 模板**：`.claude/skills/fe-archaeology/docs-templates/` 目录
