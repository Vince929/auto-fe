---
name: auto-fe-git
description: auto-fe 的 Git 操作指引，直接执行 git 命令完成分支管理、提交、推送等操作，无需脚本。
---

# 工具：Git 操作指引

## 概述

直接执行 git 命令完成常用操作，无需额外脚本。分支名由 AI 根据 tec-doc.md 内容推断（功能改动 `feature/<需求名>`，纯样式 `style/<需求名>`），或用户直接告知。

## 常用命令

```bash
# 查看当前分支
git rev-parse --abbrev-ref HEAD

# 基于当前分支创建功能分支
git checkout -b <分支名>

# 分支已存在时直接切换
git checkout <分支名>

# 提交代码（git add . 然后 commit）
git add .
git commit -m "feat: <中文简述改动>"

# 精确归档 commit（只提交 requirement 文件夹）
git add requirement/<需求名>/
git commit -m "docs: dev 归档 - <需求名>"

# 推送到远程（首次推送用 --set-upstream）
git push origin <分支名>
git push --set-upstream origin <分支名>  # 首次
```

## 使用规范

- **commit message 必须使用中文描述**，格式：`<type>: <中文简述>`
  - 例如：`feat: 新增用户头像上传功能`、`fix: 修复订单翻页后滚动条不重置`
  - 严禁使用英文描述
- **分支创建**：基于当前分支 `checkout -b`，不依赖 baseBranch
- **推送前检查**：`git status` 确认改动范围符合预期

> 💡 Git 操作均为直接执行命令，AI 根据上下文自行判断参数，无需配置文件。
