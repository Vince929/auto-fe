---
name: auto-fe-talos
description: auto-fe 的 Talos 发布 Sub-Agent，负责触发流水线、持续轮询构建状态，并将结果直接返回给主 agent。
---

# 工具：auto-fe-talos（Talos 发布 Sub-Agent）

## 概述

独立负责 Talos 发布全流程的 sub-agent：**触发发布 → 持续轮询 → 直接返回结果给主 agent**。
主 agent 从 sub-agent 的返回消息中提取所需信息，**无需写入任何中间文件**。

---

## 调用方式

主 agent 通过 `task` 工具 spawn，prompt 包含以下参数：

```
talos 配置:
  appId: <从用户提供的 Talos URL 提取，或用户直接告知>
  templateId: <从用户提供的 Talos URL 提取，或用户直接告知>
branchName: <当前功能分支名>
operator (myMis): <从用户记忆读取；记忆无记录则询问用户>
```

> 💡 **参数获取优先级**：
> - `appId` / `templateId`：优先从用户提供的 Talos 发布页 URL 自动提取（`?appId=xxx&templateId=yyy`），URL 格式示例：`https://talos-better.sankuai.com/release?appId=1234&templateId=5678`
> - `target`：**不需要用户提供**，由 sub-agent 在 Step 1 前自动查询获取（见下文）
> - `myMis`：**从用户记忆主题文件读取**。读取步骤：
 >   1. 读取 `.catpaw/rules/memory-user-index.md`，查找包含 MIS / mis / 账号 的条目
 >   2. 若有，读取对应主题文件获取完整值
 >   3. 若无记录，询问用户：「请告诉我你的 MIS 账号（用于 Talos operator）」
> - 任何参数缺失时，**直接提示用户需要哪些信息，等待用户补充后再继续**，禁止猜测或跳过

---

## Sub-Agent 执行流程

### Step 1：查询模板信息，自动获取 target

调用 MCP 工具查询模板列表，自动获取发布环境 `target`：

```
mcp_tool_auto_fe_talos_better_get_app_templates
  appId: <appId>
```

从返回结果中找到 `templateId` 匹配的模板，读取其 `target` 字段作为发布环境（如 `newtest`、`test01` 等）。

> ⚠️ 若查询失败或找不到匹配模板，**暂停提示用户手动告知发布环境**，不得猜测。

---

### Step 2：触发 Talos 发布

调用 MCP 工具触发发布：

```
mcp_tool_auto_fe_talos_v2_publish
  appId: <appId>
  templateId: <templateId>
  target: <target>
  type: "branch"
  publishConfig:
    gitConfig:
      branch: <branchName>
```

记录返回的 `flowId`（在响应 `data.id` 字段）。

---

### Step 3：轮询构建状态

> ⚠️ **强制要求**：每次 MCP 查询后，**必须等待 60 秒**，再进行下一次查询。禁止跳过等待连续调用 MCP。

每轮流程：

**① 调用 MCP 查询状态：**
```
mcp_tool_auto_fe_talos_better_get_app_publish_info
  参数：{ appId, flowId }
```

**② 判断状态（`data.status`）：**
- `success` / `SUCCESS` → 进入 Step 4（成功）
- `failed` / `FAILED` / `error` → 进入 Step 4（失败）
- 其他（running / pending / waiting 等）→ 打印进度，执行 ③

**③ 等待 60 秒（真实 sleep）：**
```bash
sleep 60
```
等待完成后，返回 ① 进行下一轮查询。

**超时控制：** 超过 20 次轮询（约 20 分钟）仍未终结 → 视为失败，附 `timeout: true`。

---

### Step 4：直接 return 结果给主 agent

根据 Step 2 的 MCP 查询结果，**无需写入任何文件**，直接在最终消息中返回结构化信息。

**成功时，return 消息格式：**

```
✅ Talos 发布成功
RESULT_JSON:
{
  "success": true,
  "flowId": "<Step 2 获得的 flowId>",
  "target": "<Step 1 查询到的 target>",
  "branch": "<prompt 传入的 branchName>",
  "publishUrl": "https://talos-better.sankuai.com/publish-log?appId=<appId>&flowId=<flowId>&templateId=<templateId>",
  "completedAt": "<当前 ISO 时间>",
  "errorLog": null
}
```

**失败时**，先调用 `mcp_tool_auto_fe_talos_better_get_plugin_log` 获取日志摘要，再 return：

```
❌ Talos 发布失败
RESULT_JSON:
{
  "success": false,
  "flowId": "<Step 2 获得的 flowId>",
  "target": "<Step 1 查询到的 target>",
  "branch": "<prompt 传入的 branchName>",
  "publishUrl": "https://talos-better.sankuai.com/publish-log?appId=<appId>&flowId=<flowId>&templateId=<templateId>",
  "completedAt": "<当前 ISO 时间>",
  "errorLog": "<失败阶段名称 + 关键错误日志摘要（不超过 500 字）>"
}
```

---

## 主 agent 接收返回后的处理

从 sub-agent 返回消息的 `RESULT_JSON` 块中解析结果：

**成功（`success: true`）：**
1. 输出 publishUrl 和测试环境链接
2. 继续执行 dev 流程后续步骤（同步项目文档 → 归档 commit + push）

**失败（`success: false`）：**
1. 输出 `errorLog` 内容和 `publishUrl`（构建日志链接）
2. **暂停，等待用户处理**（不自动重试）
