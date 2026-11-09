#!/usr/bin/env node
/**
 * memory-write.js
 * 执行三步保存不变式：先写主题文件，再更新索引，最后双写到项目层副本
 *
 * 用法：
 *   node scripts/memory-write.js --title "标题" --type user --content "内容" [--root <project-root>]
 *   node scripts/memory-write.js --json '{"title":"...","type":"...","content":"..."}' [--root <project-root>]
 *
 * type 可选值：user | feedback | project | reference
 *   - user / feedback → 写用户层（~/.catpaw/memory/）+ 双写到 .catpaw/rules/memory-user-index.md
 *   - project / reference → 写项目层（.catpaw/memory/）
 *
 * --scope 参数（可选）：
 *   --scope user    强制写用户层（覆盖 type 推导）
 *   --scope project 强制写项目层（覆盖 type 推导）
 *
 * 退出码：
 *   0 - 成功
 *   1 - 参数错误
 *   2 - 目录未初始化（先运行 memory-init.js）
 *   3 - 索引已达上限
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ─── 常量 ────────────────────────────────────────────────────────────────────

const INDEX_MAX_LINES = 200;
const INDEX_MAX_BYTES = 25000;
const SUMMARY_MAX_CHARS = 80;

const VALID_TYPES = ['user', 'feedback', 'project', 'reference'];

// type → scope 路由表
const TYPE_SCOPE = {
  user: 'user',
  feedback: 'user',
  project: 'project',
  reference: 'project',
};

// ─── 参数解析 ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
}

const rootArg = getArg('--root');
const projectRoot = rootArg || process.cwd();
const scopeArg = getArg('--scope'); // user | project（可选，覆盖 type 推导）

// 解析输入
let title, type, content, summary;

const jsonArg = getArg('--json');
if (jsonArg) {
  try {
    const parsed = JSON.parse(jsonArg);
    title = parsed.title;
    type = parsed.type;
    content = parsed.content;
    summary = parsed.summary;
  } catch (e) {
    console.error('❌ --json 参数解析失败：', e.message);
    process.exit(1);
  }
} else {
  title = getArg('--title');
  type = getArg('--type');
  content = getArg('--content');
  summary = getArg('--summary');
}

// ─── 参数校验 ────────────────────────────────────────────────────────────────

if (!title || !type || !content) {
  console.error('❌ 缺少必要参数：--title、--type、--content');
  console.error('用法：node memory-write.js --title "标题" --type user --content "内容"');
  process.exit(1);
}

if (!VALID_TYPES.includes(type)) {
  console.error(`❌ 无效的 type：${type}。可选值：${VALID_TYPES.join(' | ')}`);
  process.exit(1);
}

if (scopeArg && !['user', 'project'].includes(scopeArg)) {
  console.error(`❌ 无效的 --scope：${scopeArg}。可选值：user | project`);
  process.exit(1);
}

// ─── 路径解析（按 scope 路由）────────────────────────────────────────────────

// 确定写入哪层
const scope = scopeArg || TYPE_SCOPE[type];

let MEMORY_DIR, TOPICS_DIR, MEMORY_INDEX, displayRoot;

if (scope === 'user') {
  MEMORY_DIR   = path.join(os.homedir(), '.catpaw', 'memory');
  TOPICS_DIR   = path.join(MEMORY_DIR, 'topics');
  MEMORY_INDEX = path.join(os.homedir(), '.catpaw', 'rules', 'memory-index.md');
  displayRoot  = path.join(os.homedir(), '.catpaw').replace(/\\/g, '/');
} else {
  MEMORY_DIR   = path.join(projectRoot, '.catpaw', 'memory');
  TOPICS_DIR   = path.join(MEMORY_DIR, 'topics');
  MEMORY_INDEX = path.join(projectRoot, '.catpaw', 'rules', 'memory-index.md');
  displayRoot  = '.catpaw';
}

// 项目层路径（双写时用）
const PROJ_RULES_DIR      = path.join(projectRoot, '.catpaw', 'rules');
const PROJ_USER_MEM_INDEX = path.join(PROJ_RULES_DIR, 'memory-user-index.md');

// ─── 目录检查 ────────────────────────────────────────────────────────────────

if (!fs.existsSync(TOPICS_DIR) || !fs.existsSync(MEMORY_INDEX)) {
  console.error(`❌ ${displayRoot} 未初始化，请先运行：node scripts/memory-init.js`);
  process.exit(2);
}

// ─── 文件名生成 ──────────────────────────────────────────────────────────────

function toKebabCase(str) {
  // 判断是否主要是中文
  const chineseChars = (str.match(/[\u4e00-\u9fa5]/g) || []).length;
  const totalChars = str.replace(/\s/g, '').length;
  const isMostlyChinese = chineseChars / totalChars > 0.3;

  if (isMostlyChinese) {
    // 中文标题：提取英文字母和数字部分，拼接时间戳前缀
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const ascii = str.replace(/[\u4e00-\u9fa5\s]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20);
    return ascii ? `${datePart}-${ascii}` : datePart;
  }

  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

function generateFilename(title) {
  const base = toKebabCase(title);
  let filename = `${base}.md`;
  let counter = 1;
  while (fs.existsSync(path.join(TOPICS_DIR, filename))) {
    filename = `${base}-${counter}.md`;
    counter++;
  }
  return filename;
}

// ─── 摘要生成 ────────────────────────────────────────────────────────────────

function generateSummary(content, providedSummary) {
  if (providedSummary) {
    return providedSummary.slice(0, SUMMARY_MAX_CHARS);
  }
  const firstLine = content.split('\n')[0].slice(0, SUMMARY_MAX_CHARS);
  return firstLine;
}

// ─── 索引上限检查 ────────────────────────────────────────────────────────────

function checkIndexLimit() {
  const indexContent = fs.readFileSync(MEMORY_INDEX, 'utf8');
  const lines = indexContent.split('\n').filter(l => l.startsWith('- [')).length;
  const bytes = Buffer.byteLength(indexContent, 'utf8');

  return {
    lines,
    bytes,
    atLimit: lines >= INDEX_MAX_LINES || bytes >= INDEX_MAX_BYTES,
    nearLimit: lines >= INDEX_MAX_LINES * 0.9 || bytes >= INDEX_MAX_BYTES * 0.9,
  };
}

// ─── 主逻辑（两步保存不变式）────────────────────────────────────────────────

const today = new Date().toISOString().split('T')[0];
const filename = generateFilename(title);
const topicPath = path.join(TOPICS_DIR, filename);
const summaryText = generateSummary(content, summary);

console.log(`\n📝 写入记忆：${title}`);
console.log(`   层级：${scope === 'user' ? '用户层（跨项目）' : '项目层'} → ${displayRoot}/\n`);

// ── 检查索引容量 ──
const limitCheck = checkIndexLimit();
if (limitCheck.atLimit) {
  console.error(`❌ 索引已达上限（${limitCheck.lines} 行 / ${limitCheck.bytes} 字节）`);
  console.error('   请先运行 /memory-review 清理或提升记忆条目');
  process.exit(3);
}

if (limitCheck.nearLimit) {
  console.warn(`⚠️  索引接近上限（${limitCheck.lines}/${INDEX_MAX_LINES} 行 / ${limitCheck.bytes}/${INDEX_MAX_BYTES} 字节），建议运行 /memory-review 清理`);
}

// ── Step A：先写主题文件 ──
const topicContent = `---
name: ${title}
type: ${type}
created: ${today}
---

${content}
`;

try {
  fs.writeFileSync(topicPath, topicContent, 'utf8');
  console.log(`  ✅ Step A：主题文件已写入 → ${displayRoot}/memory/topics/${filename}`);
} catch (e) {
  console.error(`  ❌ Step A 失败：无法写入主题文件`, e.message);
  process.exit(1);
}

// ── Step B：再更新索引 ──
// 索引从 rules/ 指向 memory/topics/，需要计算相对路径
const rulesDir = scope === 'user'
  ? path.join(os.homedir(), '.catpaw', 'rules')
  : path.join(projectRoot, '.catpaw', 'rules');
const relTopicPath = path.relative(rulesDir, topicPath).replace(/\\/g, '/');
const indexLine = `- [${title}](${relTopicPath})｜${type}｜${summaryText}\n`;

try {
  fs.appendFileSync(MEMORY_INDEX, indexLine, 'utf8');
  console.log(`  ✅ Step B：索引已更新 → ${displayRoot}/rules/memory-index.md`);
} catch (e) {
  console.error(`  ❌ Step B 失败：无法更新索引`, e.message);
  console.error(`  ⚠️  主题文件已写入但索引未更新，产生孤儿文件：${displayRoot}/memory/topics/${filename}`);
  console.error(`  💡 运行 memory-cleanup.js 可修复此问题`);
  process.exit(1);
}

// ── Step C（双写）：user/feedback 类型同步追加到项目层用户索引副本 ────────────
if (scope === 'user' && fs.existsSync(PROJ_USER_MEM_INDEX)) {
  // topic 文件在用户目录，使用绝对路径确保从任意项目都能读取
  const absTopicPath = topicPath.replace(/\\/g, '/');
  const projIndexLine = `- [${title}](${absTopicPath})｜${type}｜${summaryText}\n`;

  try {
    fs.appendFileSync(PROJ_USER_MEM_INDEX, projIndexLine, 'utf8');
    console.log(`  ✅ Step C：已同步到用户层副本 → .catpaw/rules/memory-user-index.md`);
  } catch (e) {
    console.warn(`  ⚠️  Step C（双写）失败，用户层副本未同步：`, e.message);
    // 非致命错误，不 exit
  }
}

// ── 二次检查上限 ──
const afterCheck = checkIndexLimit();
if (afterCheck.atLimit) {
  fs.appendFileSync(MEMORY_INDEX, '\n<!-- ⚠️ 索引已达上限，运行 /memory-review 进行清理 -->\n', 'utf8');
  console.warn('\n⚠️  索引已达上限，已追加警告。请运行 /memory-review 清理记忆。');
}

// ─── 输出结果 ────────────────────────────────────────────────────────────────

console.log(`\n✨ 记忆写入成功！`);
console.log(`   标题：${title}`);
console.log(`   类型：${type}（${scope === 'user' ? '用户层，跨项目有效' : '项目层'}）`);
console.log(`   文件：${displayRoot}/memory/topics/${filename}`);
console.log(`   索引：${displayRoot}/rules/memory-index.md`);
console.log(`   摘要：${summaryText}`);
