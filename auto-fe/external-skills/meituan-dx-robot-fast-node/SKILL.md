---
name: meituan-dx-robot-fast-node
description: 通过大象开放平台 HTTP API 以机器人身份发送文本消息或图片消息、管理大象群。支持发送给个人、群聊，发送图片时自动上传到 Venus 图片服务，支持群聊中 @ 指定人或 @ 所有人。群管理支持：拉群/建群（用户自动成为群主）、添加/踢出成员、查看群成员/群信息、判断用户是否在群、获取/更新群公告、更新群名称/简介、设置/取消管理员、设置成员自定义角色。基于 Node.js 实现，零外部依赖。触发词：大象发消息、机器人发消息、发图片到群、发文本到群、大象群发图片、robot message、发送图片消息、发送文本消息到大象、给某人发消息、发大象、拉群、建群、创建大象群、拉个群、建个群、添加群成员、加人进群、把某人加进群、踢人、踢出群、群公告、更新群名、查看群成员、群信息、设置管理员、角色名、搜索大象联系人、查找联系人、找一下某人的mis。
---

# 大象机器人：消息发送 + 群管理（Node.js 版）

通过大象开放平台 HTTP API，以机器人身份发送文本/图片消息，并管理大象群聊。**零外部依赖，仅需 Node.js 运行环境。**

---

## 执行原则

**优先用脚本建群**：MCP `dx_group_create_group` 权限受限（返回 30002），建群统一走脚本。其他查询类操作优先用 MCP。

**能并行的绝不串行**：多 mis 转 uid 一次性批量完成。注意：大象网页版只有一个实例，**按人名搜索时必须逐个串行**，不能并行。

**脚本路径**（在 auto-fe 场景中，路径由 `group-notifier.js` 动态推导，无需手动指定）：
- 消息发送：`<auto-fe>/third/meituan-dx-robot-fast-node/scripts/dx_robot_msg.js`
- 群管理：`<auto-fe>/third/meituan-dx-robot-fast-node/scripts/dx_group.js`

调用时始终使用绝对路径，通过 `path.join(__dirname, ...)` 推导，不要 hardcode。

**凭证及用户配置**：`~/.catpaw/meituan-dx-robot-fast.config.json`

---

## 快速开始（消息发送）

**首次使用**：先保存凭证到配置文件，之后调用无需再传凭证参数：

```bash
node <auto-fe>/third/meituan-dx-robot-fast-node/scripts/dx_robot_msg.js \
  --save-config \
  --client_id <DX_APP_ID> --client_secret <DX_APP_KEY> \
  --venus_client_id <VENUS_CID> --venus_client_secret <VENUS_KEY> \
  --venus_bucket <BUCKET>
```

配置保存后（`~/.catpaw/meituan-dx-robot-fast.config.json`），后续调用只需：

```bash
node <auto-fe>/third/meituan-dx-robot-fast-node/scripts/dx_robot_msg.js \
  --gid <GROUP_ID> --type text --content "Hello"
```

---

## 多机器人支持

当需要管理多个机器人时，使用 `--bot <别名>` 参数区分。**不传 `--bot` 时行为与之前完全一致**，单机器人用户无需任何改动。

### 配置文件结构

```json
{
  "client_id": "默认机器人AppID",
  "client_secret": "默认机器人AppSecret",
  "ownerUid": 123456,
  "bots": {
    "ad-robot": {
      "client_id": "广告机器人AppID",
      "client_secret": "广告机器人AppSecret"
    },
    "notify-bot": {
      "client_id": "通知机器人AppID",
      "client_secret": "通知机器人AppSecret"
    }
  }
}
```

`venus`、`ownerUid` 等字段始终从顶层读取，所有机器人共享。

### 保存具名机器人凭证

```bash
node <auto-fe>/third/meituan-dx-robot-fast-node/scripts/dx_robot_msg.js \
  --save-config --bot ad-robot \
  --client_id <DX_APP_ID_2> --client_secret <DX_APP_SECRET_2>
```

### 使用具名机器人发消息 / 建群

```bash
# 发消息
node <auto-fe>/third/meituan-dx-robot-fast-node/scripts/dx_robot_msg.js \
  --bot ad-robot --gid <GROUP_ID> --type text --content "Hello"

# 建群
node <auto-fe>/third/meituan-dx-robot-fast-node/scripts/dx_group.js \
  --bot ad-robot create --uids <uid1>,<uid2> --owner <ownerUid>
```

---

## 消息发送参数说明

### 大象机器人凭证（可从配置文件读取，无需每次传入）

| 参数 | 说明 |
|:---|:---|
| `--client_id` | 大象机器人的 App ID |
| `--client_secret` | 大象机器人的 App 密钥（由用户提供，脚本不内置） |
| `--bot` | 机器人别名（多机器人场景，不传则使用默认机器人） |

### 发送目标（至少提供一个）

| 参数 | 说明 |
|:---|:---|
| `--mis` | 接收人 mis，多人用 `,` 分隔 |
| `--gid` | 大象群聊 ID，多个群用 `,` 分隔 |

### 消息内容

| 参数 | 说明 |
|:---|:---|
| `--type` | 消息类型：`text` 或 `image` |
| `--content` | 文本消息内容（type=text 时必填） |
| `--file` | 图片文件路径，会自动上传到 Venus（type=image 时使用） |
| `--image_url` | 已有的图片 URL，跳过上传（type=image 时使用，与 --file 二选一） |

### Venus 凭证（可从配置文件读取）

| 参数 | 说明 |
|:---|:---|
| `--venus_client_id` | Venus 账号 client_id |
| `--venus_client_secret` | Venus 账号密钥（由用户提供，脚本不内置） |
| `--venus_bucket` | Venus bucket 名称 |
| `--venus_env` | Venus 环境：`prod`（默认）或 `test` |

### 可选参数

| 参数 | 说明 |
|:---|:---|
| `--at` | 群聊中 @ 人：`all` 表示 @ 所有人；或 mis 用逗号分隔。支持 `mis:姓名` 格式但**不要猜测姓名**，建议只传 mis，如 `zhangsan,lisi` |
| `--save-config` | 将当前凭证参数保存到 `~/.catpaw/meituan-dx-robot-fast.config.json` |

---

## 发消息给人名（非 mis）的处理

用户说"给张三发消息"时，需先搜索确定 mis，再发送：

1. `catdesk daxiang search --keyword "张三"` 搜索联系人
2. 按智能过滤规则筛选：只剩 1 人直接使用，2+ 人才用 `AskQuestion` 确认，0 人则请用户提供 mis
3. mis 确定后，用 `--mis <mis>` 发送消息

---

## 消息发送示例

### 发送文本消息到群聊

```bash
node <auto-fe>/third/meituan-dx-robot-fast-node/scripts/dx_robot_msg.js \
  --gid <GROUP_ID> \
  --type text --content "Hello World"
```

### 发送图片消息到群聊（自动上传 Venus）

```bash
node <auto-fe>/third/meituan-dx-robot-fast-node/scripts/dx_robot_msg.js \
  --gid <GROUP_ID> \
  --type image --file /path/to/image.png
```

### 发送图片消息（已有 URL，跳过上传）

```bash
node <auto-fe>/third/meituan-dx-robot-fast-node/scripts/dx_robot_msg.js \
  --gid <GROUP_ID> \
  --type image --image_url "http://p0.meituan.net/bucket/xxx.jpg"
```

### 发送文本消息给个人

```bash
node <auto-fe>/third/meituan-dx-robot-fast-node/scripts/dx_robot_msg.js \
  --mis zhangsan \
  --type text --content "Hello"
```

### 发送消息并 @ 人

```bash
node <auto-fe>/third/meituan-dx-robot-fast-node/scripts/dx_robot_msg.js \
  --gid <GROUP_ID> \
  --type text --content "请查看" \
  --at "zhangsan,lisi"
```

### 发送消息并 @ 所有人

```bash
node <auto-fe>/third/meituan-dx-robot-fast-node/scripts/dx_robot_msg.js \
  --gid <GROUP_ID> \
  --type text --content "请所有人注意" \
  --at all
```

---

## 群管理：接口可用性（实测）

以下接口被大象网关**显式封锁 HTTP 访问**（所有 method 均返回 `30004: http method not allowed`），**无法通过脚本调用**，需用户在大象客户端手动操作：

| 接口 | 状态 | 替代方案 |
|---|---|---|
| `dismissGroup`（解散群） | ❌ HTTP 封锁 | 群主在大象客户端手动解散 |
| `transGroupOwner`（转让群主） | ❌ HTTP 封锁 | 群主在大象客户端手动转让 |
| `removeGroupBot`（机器人退群） | ❌ HTTP 封锁 | 在大象客户端操作 |
| `updateGroupInfo`（修改群名/简介） | ❌ HTTP 封锁 | 在大象客户端手动修改 |
| `updateGroupNotice`（更新群公告） | ❌ HTTP 封锁 | 在大象客户端手动设置 |

---

## 群管理：能力分工

| 操作 | 方式 | 备注 |
|---|---|---|
| mis → uid 转换 | MCP `get_uid_and_empid_by_mis` | |
| 创建群 | 脚本 `create` | MCP 权限不足（30002） |
| 添加群成员 | MCP `dx_group_add_group_member_by_bot` | |
| 查看群成员列表 | MCP `dx_group_get_group_members` | |
| uid → mis/empId 反查 | MCP `dx_query_user_identity_by_uid` | |
| 踢出群成员 | 脚本 `remove-members` | |
| 转让群主 | ❌ 不可用 | 客户端手动操作 |
| 解散群 | ❌ 不可用 | 客户端手动操作 |
| 机器人退出群 | ❌ 不可用 | 客户端手动操作 |
| 获取群信息 | 脚本 `info` | |
| 判断用户是否在群 | 脚本 `in-group` | |
| 获取群公告 | 脚本 `get-notice` | |
| 更新群公告 | ❌ 不可用 | HTTP 封锁，客户端手动设置 |
| 更新群名称/简介 | ❌ 不可用 | HTTP 封锁，客户端手动修改 |
| 设置/取消管理员 | 脚本 `set-role` | 机器人须为群主 |
| 设置成员自定义角色名 | 脚本 `set-role-name` | 机器人须为群主或管理员 |

---

## 拉群流程（最高频操作）

### 情况 A：用户提供的是人名

**目标：最少交互轮次完成建群。**

#### 第一步：逐个搜索（网页只有一个，无法并行）

```bash
catdesk daxiang search --keyword "<姓名1>"
# 等结果返回后再搜下一个
catdesk daxiang search --keyword "<姓名2>"
```

#### 第二步：智能过滤候选人

搜索结果中只保留 `type=user` 且有 `mis` 字段的条目，然后按以下规则过滤：

- **保留**：`name == query`（完全匹配）
- **保留**：`name` 包含 `query` 且 `query` 是完整的名字部分
- **过滤**：字符相似但不包含完整搜索词的

过滤后的处理逻辑：
- **只剩 1 人** → 直接使用，无需确认
- **剩余 2+ 人** → 用 `AskQuestion` 一次性让用户确认（所有需要确认的人合并到同一次 `AskQuestion` 调用中）
- **0 人** → 告知用户未找到匹配结果，请提供 mis

#### 第三步：批量转换 mis → uid

```
CallMcpTool: get_uid_and_empid_by_mis
{ "misList": ["mis1", "mis2", "mis3"] }   ← 所有人一次传入，不要逐个查
```

#### 第四步：建群

```bash
node <auto-fe>/third/meituan-dx-robot-fast-node/scripts/dx_group.js create --uids <uid1>,<uid2> --owner <用户uid>
```

### 情况 B：用户提供的是 misId

无需确认，直接两步完成：

```
步骤1: CallMcpTool get_uid_and_empid_by_mis  { misList: ["zhangsan", "lisi", ...] }
步骤2: node <auto-fe>/third/meituan-dx-robot-fast-node/scripts/dx_group.js create --uids <uid1>,<uid2> --owner <用户uid>
```

### 群主规则（重要）

- **必须将发起操作的用户设为群主**，严禁让机器人当群主。
- 原因：`dismissGroup`、`transGroupOwner`、`removeGroupBot` 均被网关封锁，机器人一旦成为群主，群将无法解散（死锁）。
- 用户 uid 从配置文件 `~/.catpaw/meituan-dx-robot-fast.config.json` 读取（字段：`ownerUid`）。
- **若 `ownerUid` 字段不存在**：
  1. 从 `<sandbox_context>` 或对话上下文中获取用户 mis（`User MisId`）
  2. 调用 `CallMcpTool get_uid_and_empid_by_mis` 查询 uid
  3. 将 `ownerUid` 字段追加写入 `~/.catpaw/meituan-dx-robot-fast.config.json`
  4. 后续直接读取，无需重复查询

### 群名规则

- 用户**指定了群名** → 传 `--name` 参数
- 用户**未指定群名** → 不传，大象自动用成员名拼接

### 建群后立即操作的注意事项

建群成功后若立即执行添加成员、设置管理员等操作，可能遇到"机器人不在该群"错误（主从同步延迟）。遇到此错误时等待 1 秒后重试一次，通常可解决。

---

## 添加群成员流程

### 情况 A：用户提供的是人名

与拉群流程相同：逐个搜索 → 智能过滤 → AskQuestion 确认（有歧义时）→ 批量转 uid → 调用 MCP 添加：

```
CallMcpTool: dx_group_add_group_member_by_bot
{ "gid": <群ID>, "users": ["uid1", "uid2"] }
```

### 情况 B：用户提供的是 misId

```
步骤1: CallMcpTool get_uid_and_empid_by_mis  { misList: ["zhangsan", "lisi"] }
步骤2: CallMcpTool dx_group_add_group_member_by_bot  { "gid": <群ID>, "users": ["uid1", "uid2"] }
```

> 一次不超过 50 人；若报"机器人不在该群"，等待 1 秒后重试。

---

## 群管理：MCP 工具调用示例

### 添加群成员

```json
CallMcpTool: dx_group_add_group_member_by_bot
{
  "gid": 64014641136,
  "users": ["uid1", "uid2"]    // 一次不超过 50 人
}
```

### 查看群成员列表

```json
CallMcpTool: dx_group_get_group_members
{
  "gid": 64014641136,
  "pageNumber": 0,
  "pageSize": 100
}
```

返回字段含 `hasMore`，若为 true 需继续翻页（pageNumber 递增）。

---

## 群管理：脚本命令速查

### 建群

```bash
node <auto-fe>/third/meituan-dx-robot-fast-node/scripts/dx_group.js create --uids <uid1>,<uid2> --owner <群主uid> [--name "群名"] [--bot-admin]
```

> `--bot-admin`：建群时将机器人加入群聊，通过建群接口的 `bots` 字段（值为 client_id 列表）实现。**注意：此操作不会赋予机器人管理员权限**，仅是把机器人作为成员拉进群以便后续发消息。如需设置管理员权限，需另行调用 `set-role` 子命令。

### 踢出群成员

```bash
node <auto-fe>/third/meituan-dx-robot-fast-node/scripts/dx_group.js remove-members --gid <群ID> --uids 111111,222222
```

> 一次不超过 50 人；机器人须为群主或管理员。

### 解散群 / 转让群主 / 机器人退群

> ❌ **这三个操作均不可用**（HTTP 接口被网关封锁，返回 30004）。需由群主在**大象客户端**手动操作。

### 获取群信息

```bash
node <auto-fe>/third/meituan-dx-robot-fast-node/scripts/dx_group.js info --gid <群ID>
```

### 判断用户是否在群里

```bash
node <auto-fe>/third/meituan-dx-robot-fast-node/scripts/dx_group.js in-group --gid <群ID> --uid <成员uid>
```

### 获取群公告

```bash
node <auto-fe>/third/meituan-dx-robot-fast-node/scripts/dx_group.js get-notice --gid <群ID>
```

### 更新群公告 / 群名称/简介

> ❌ **不可用**（HTTP 接口被网关封锁，返回 30004 / 405）。需在**大象客户端**手动操作。

### 设置/取消管理员

```bash
# 机器人须为群主；人员+机器人管理员合计不超过 3 个
node <auto-fe>/third/meituan-dx-robot-fast-node/scripts/dx_group.js set-role --gid <群ID> --role ADMIN --uids 111111,222222
node <auto-fe>/third/meituan-dx-robot-fast-node/scripts/dx_group.js set-role --gid <群ID> --role NORMAL --uids 111111
```

### 设置成员自定义角色名

```bash
# 机器人须为群主或管理员；角色名最多 6 个汉字或 12 个字符；每次最多 10 个
node <auto-fe>/third/meituan-dx-robot-fast-node/scripts/dx_group.js set-role-name \
  --gid <群ID> \
  --user-roles '[{"id":111111,"roleName":"产品"},{"id":222222,"roleName":"研发"}]'
```

---

## 消息发送工作流程

### 文本消息

1. 从缓存或网络获取大象 access_token（取票 + 换票）
2. **并行**：如有 `--mis` 或 `--at`，token 就绪后立即查询 uid（与其他操作并行）
3. 构建消息体（含 @ 文本和 extension）
4. 调用 `sendGroupMsgByRobot`（群聊）或 `sendChatMsgByRobot`（个人）发送

### 图片消息（token 获取与图片上传并行）

1. **并行启动**：
   - 获取大象 access_token（取票 + 换票）
   - 上传图片到 Venus（如果提供了 `--file`）
2. 两者均完成后，构建 image 消息体
3. 调用大象接口发送

---

## 鉴权说明

### 大象鉴权

1. 使用 JWT HS256 方式取票：`POST https://ssosv.sankuai.com/sson/auth/oidc/v1/token`
2. TokenExchange 换票到 audience `xm-xai`
3. 使用换票后的 access_token 调用大象开放平台接口
4. **Token 本地缓存**：有效期内自动复用，避免重复取票
5. **时钟偏差容忍**：JWT 的 iat/nbf 提前 5 秒，防止本机时间略快于服务器导致 401

### Venus 鉴权（上传图片时）

1. 构造签名字符串：`POST /storage/{bucket}\n{Date}`
2. HMAC-SHA1 + 密钥计算签名
3. Authorization 头：`MWS {client_id}:{signature}`

---

## 凭证配置文件

配置文件路径：`~/.catpaw/meituan-dx-robot-fast.config.json`，权限自动设为 `600`（Windows 下跳过）。

包含字段：大象机器人的 AppID 和 AppSecret、Venus 的 ClientID 和密钥、Bucket 名称及环境（prod/test）、用户 uid（`ownerUid`，建群时用于设置群主）。首次使用时通过 `--save-config` 参数自动生成，无需手动创建。

命令行参数优先级高于配置文件，可随时覆盖单个参数。

---

## 安全说明

所有鉴权信息均通过命令行参数或本地配置文件传入，脚本内不内置任何硬编码凭证。配置文件权限为 `600`，仅当前用户可读，不会上传或共享到任何远端服务。

---

## 注意事项

- 机器人必须已加入目标群聊，否则会报 `70003 机器人不在该群`
- 接口限流 QPS < 5，多群发送或批量群操作时请注意频率
- 图片消息的 thumbnail/normal/original 使用同一 URL（大象客户端会自动处理缩略图）
- `--at` 参数仅在群聊消息中生效
- 图片上传与 token 获取**并行执行**，发图片时整体耗时约等于两者中较慢的一个
- 仅支持美团企业内部在职员工，离职用户或跨企业操作会报错
- 踢出成员、设置管理员要求机器人是群主或管理员
- 一次添加/踢出成员不超过 50 人

---

## 依赖

```bash
# 无需安装任何 npm 包，仅需 Node.js（建议 v16+）
node --version
```
