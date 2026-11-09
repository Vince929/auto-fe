---
name: auto-fe-notify
description: auto-fe 的大象通知工具，支持拉群和发消息两种模式。触发词：/auto-fe-notify、帮我拉群、大象通知、发消息到群。
---

## 概述

独立工具，随时按需调用，无需 requirement 文件夹，不属于 SDD 流程。

底层依赖 `external-skills/meituan-dx-robot-fast-node/` 中的脚本。**MIS → UID 转换通过 `dx_robot_msg.js --mis` 脚本实现**，凭证直接内置，无需 MCP。

**两种模式：**
- **拉群模式**：提供群成员 MIS 列表 + 群名 → 创建大象群，返回 groupId
- **发消息模式**：提供 groupId + 消息内容 → 发送文本消息到群（可 @ 指定成员）

---

## 模式一：拉群

### 需要用户提供

| 信息 | 说明 |
|------|------|
| 群成员 MIS 列表 | 如：`["zhangsan", "lisi", "wangwu"]` |
| 群名（可选） | 默认不填，由用户自行决定 |

> ℹ️ **用户自身的 ownerMis 从用户记忆中读取，不询问用户。**
> - 读取 `.catpaw/rules/memory-user-index.md`，查找包含 MIS / mis / 账号的条目，再读取对应主题文件获取 misId 值
> - 若无记录，尝试读取 `~/.catpaw/meituan-dx-robot-fast.config.json` 中的 `ownerUid`
> - 仍找不到则暂停告知用户

### 执行步骤

1. **从用户记忆读取 ownerMis**（禁止询问用户，见上方说明）

2. **MIS → UID 批量转换**（通过脚本查询，所有人一次性批量传入）
   ```bash
   node <auto-fe>/external-skills/meituan-dx-robot-fast-node/scripts/dx_robot_msg.js \
     --client_id 54a700ab53 \
     --client_secret 5d7f5094a34d40c89ad85a7212197f17 \
     --mis <ownerMis>,<mis1>,<mis2>,... \
     --type text --content "uid-query"
   ```
   从输出的 `uids=[...]` 中按顺序提取每个 MIS 对应的 uid，拼出：
   - `ownerUid`：ownerMis 对应的 uid
   - `memberUids`：所有成员 MIS 对应的 uid（逗号分隔字符串）

3. **建群**（传入 UID）
   ```bash
   node <auto-fe>/external-skills/meituan-dx-robot-fast-node/scripts/dx_group.js create \
     --client_id 54a700ab53 \
     --client_secret 5d7f5094a34d40c89ad85a7212197f17 \
     --uids <memberUids> \
     --owner <ownerUid> \
     [--name "<群名>"]
   ```
   > 群名用户未提供时不传 `--name` 参数（大象默认会自动生成群名）
   > `<auto-fe>` 为本 SKILL 所在的 `auto-fe/` 目录绝对路径

4. 从命令输出中提取 **groupId（gid）**，告知用户

---

## 模式二：发消息

### 需要用户提供

| 信息 | 说明 |
|------|------|
| groupId（gid） | 目标群 ID |
| 消息内容 | 纯文本，支持多行 |
| @ 成员（可选） | MIS 列表，如 `["zhangsan"]`；不填则不 @ 任何人 |

### 执行步骤

1. **发送消息**（`--at` 直接传 MIS，脚本自动转 UID）
   ```bash
   node <auto-fe>/external-skills/meituan-dx-robot-fast-node/scripts/dx_robot_msg.js \
     --client_id 54a700ab53 \
     --client_secret 5d7f5094a34d40c89ad85a7212197f17 \
     --gid <groupId> \
     --type text \
     --content "<消息内容>" \
     --at "<mis1,mis2,...>"
   ```

---

## 触发示例

```
帮我拉个群，成员：zhangsan、lisi、wangwu，群名叫「首页改版-前端」
```

```
帮我发消息到群 12345678，内容是：前端已发布测试环境，请开始验收 🙏，@zhangsan @lisi
```

```
/auto-fe-notify
```
（直接触发时，AI 询问用户要拉群还是发消息，然后收集对应信息）
