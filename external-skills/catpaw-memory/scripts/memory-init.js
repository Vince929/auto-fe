#!/usr/bin/env node
/**
 * memory-init.js
 * 初始化记忆系统目录结构
 *
 * 用法：
 *   node scripts/memory-init.js [--root <project-root>]
 *
 * 创建内容：
 *   ~/.catpaw/memory/topics/          用户层主题文件目录
 *   ~/.catpaw/rules/memory-index.md   用户层索引（会话自动加载）
 *
 *   <project>/.catpaw/memory/topics/              项目层主题文件目录
 *   <project>/.catpaw/rules/memory-index.md       项目层索引（会话自动加载）
 *   <project>/.catpaw/rules/memory-user-index.md  用户层索引副本（从 ~/.catpaw/rules/memory-index.md 复制）
 *
 * 幂等：重复运行不会覆盖已有内容
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ─── 配置 ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const rootIdx = args.indexOf('--root');
const projectRoot = rootIdx !== -1 ? args[rootIdx + 1] : process.cwd();

// 用户层路径
const USER_CATPAW_DIR  = path.join(os.homedir(), '.catpaw');
const USER_MEMORY_DIR  = path.join(USER_CATPAW_DIR, 'memory');
const USER_TOPICS_DIR  = path.join(USER_MEMORY_DIR, 'topics');
const USER_RULES_DIR   = path.join(USER_CATPAW_DIR, 'rules');
const USER_MEM_INDEX   = path.join(USER_RULES_DIR, 'memory-index.md');

// 项目层路径
const PROJ_CATPAW_DIR       = path.join(projectRoot, '.catpaw');
const PROJ_MEMORY_DIR       = path.join(PROJ_CATPAW_DIR, 'memory');
const PROJ_TOPICS_DIR       = path.join(PROJ_MEMORY_DIR, 'topics');
const PROJ_RULES_DIR        = path.join(PROJ_CATPAW_DIR, 'rules');
const PROJ_MEM_INDEX        = path.join(PROJ_RULES_DIR, 'memory-index.md');
const PROJ_USER_MEM_INDEX   = path.join(PROJ_RULES_DIR, 'memory-user-index.md');

// ─── 辅助函数 ────────────────────────────────────────────────────────────────

function ensureDir(dir, label) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`  ✅ 创建目录：${label || dir}`);
  } else {
    console.log(`  ✓  已存在：${label || dir}`);
  }
}

function ensureFile(filePath, content, label) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ 创建文件：${label || filePath}`);
  } else {
    console.log(`  ✓  已存在：${label || filePath}`);
  }
}

// ─── 索引初始内容 ────────────────────────────────────────────────────────────

function makeUserIndexContent() {
  const homeDir = os.homedir().replace(/\\/g, '/');
  const userCatpaw = `${homeDir}/.catpaw`;
  const topicsBase = `${userCatpaw}/memory/topics/`;

  return `---
ruleType: Always
description: CatPaw 记忆系统 - 用户层记忆索引，会话自动加载。
---

# CatPaw 记忆索引（用户层）

> 本索引存储：用户的跨项目偏好与行为反馈（\`user\` / \`feedback\` 类）
> 自动维护，请勿手动大幅编辑。上限：200 行 / 25,000 字节（触达时运行 \`/memory-review\` 清理）

## ⚡ AI 强制行动指令（每轮对话必须执行，不可跳过）

1. **扫描下方用户层条目**：判断哪些条目与当前请求相关，对相关条目主动读取主题文件（\`${topicsBase}<filename>.md\`）获取完整细节。
2. 尤其关注：工具偏好、编码风格、工作流习惯、AI 行为纠正、用户身份背景。
`;
}

function makeProjectIndexContent() {
  const homeDir = os.homedir().replace(/\\/g, '/');
  const userCatpaw = `${homeDir}/.catpaw`;
  const topicsBase = '.catpaw/memory/topics/';

  return `---
ruleType: Always
description: CatPaw 记忆系统 - 项目层记忆索引，会话自动加载。
---

# CatPaw 记忆索引（项目层）

> 本索引存储：当前项目的业务上下文与技术约定（\`project\` / \`reference\` 类）
> 自动维护，请勿手动大幅编辑。上限：200 行 / 25,000 字节（触达时运行 \`/memory-review\` 清理）

## ⚡ AI 强制行动指令（每轮对话必须执行，不可跳过）

1. **扫描下方项目层条目**：判断哪些条目与当前请求相关，对相关条目主动读取主题文件（\`${topicsBase}<filename>.md\`）获取完整细节。
2. **同时关注用户层记忆**：已加载 \`memory-user-index.md\`，其中包含用户跨项目偏好，读取相关条目主题文件（路径：\`${userCatpaw}/memory/topics/<filename>.md\`）。
3. 尤其关注：工具偏好、编码风格、工作流习惯、AI 行为纠正、项目约束、用户身份背景。
`;
}

// ─── 用户层索引副本 ──────────────────────────────────────────────────────────

/**
 * 将用户层 memory-index.md 整个复制到项目层，作为 memory-user-index.md
 * 幂等：文件已存在时跳过（内容由双写机制保持同步）
 */
function syncUserIndexToProject() {
  if (fs.existsSync(PROJ_USER_MEM_INDEX)) {
    console.log(`  ✓  已存在：.catpaw/rules/memory-user-index.md`);
    return;
  }

  if (fs.existsSync(USER_MEM_INDEX)) {
    fs.copyFileSync(USER_MEM_INDEX, PROJ_USER_MEM_INDEX);
    console.log(`  ✅ 已复制用户层索引 → .catpaw/rules/memory-user-index.md`);
  } else {
    // 用户层索引不存在（刚初始化），写入空副本（仅含文件头）
    fs.writeFileSync(PROJ_USER_MEM_INDEX, makeUserIndexContent(), 'utf8');
    console.log(`  ✅ 创建文件：.catpaw/rules/memory-user-index.md（用户层暂无记忆，已创建空副本）`);
  }
}

// ─── 主逻辑 ─────────────────────────────────────────────────────────────────

console.log('\n🧠 CatPaw 记忆系统初始化\n');
console.log(`用户主目录：${os.homedir()}`);
console.log(`项目根目录：${projectRoot}\n`);

// ── 用户层 ──────────────────────────────────────────────────────────────────

console.log('【用户层】跨项目（~/.catpaw/）');
ensureDir(USER_MEMORY_DIR, `~/.catpaw/memory/`);
ensureDir(USER_TOPICS_DIR, `~/.catpaw/memory/topics/`);
ensureDir(USER_RULES_DIR,  `~/.catpaw/rules/`);
ensureFile(USER_MEM_INDEX, makeUserIndexContent(), `~/.catpaw/rules/memory-index.md`);

// ── 项目层 ──────────────────────────────────────────────────────────────────

console.log('\n【项目层】当前项目（.catpaw/）');
ensureDir(PROJ_MEMORY_DIR, `.catpaw/memory/`);
ensureDir(PROJ_TOPICS_DIR, `.catpaw/memory/topics/`);
ensureDir(PROJ_RULES_DIR,  `.catpaw/rules/`);
ensureFile(PROJ_MEM_INDEX, makeProjectIndexContent(), `.catpaw/rules/memory-index.md`);
syncUserIndexToProject();

// ─── 完成 ────────────────────────────────────────────────────────────────────

console.log('\n✨ 初始化完成！\n');
console.log('目录结构：');
console.log('  ~/.catpaw/');
console.log('  ├── memory/topics/         ← 用户层主题文件');
console.log('  └── rules/memory-index.md ← 用户层索引（会话自动加载）');
console.log('');
console.log('  .catpaw/');
console.log('  ├── memory/topics/         ← 项目层主题文件');
console.log('  └── rules/');
console.log('      ├── memory-index.md          ← 项目层索引（会话自动加载）');
console.log('      └── memory-user-index.md     ← 用户层索引副本（会话自动加载）');
console.log('');
console.log('记忆同步机制：');
console.log('  • memory-user-index.md 是用户层索引的副本，CatPaw 会话启动时自动加载');
console.log('  • 新增 user/feedback 类记忆时，自动双写：~/.catpaw/rules/memory-index.md + .catpaw/rules/memory-user-index.md');
console.log('');
console.log('使用方式：');
console.log('  对 AI 说"记住 X"           → 双写：用户层 + 项目层副本同步更新');
console.log('  对 AI 说"提取记忆"         → 扫描对话，确认后双写');
console.log('  对 AI 说"/memory-review"   → 审计并提升记忆层级');
