#!/usr/bin/env node
/**
 * memory-cleanup.js
 * 清理孤儿主题文件（存在于 topics/ 但未被 MEMORY.md 引用的文件）
 *
 * 用法：
 *   node scripts/memory-cleanup.js [--root <project-root>] [--dry-run]
 *
 * --dry-run  只列出，不实际删除
 *
 * 退出码：
 *   0 - 成功（包括无孤儿的情况）
 *   1 - 错误
 *   2 - 目录未初始化
 */

const fs = require('fs');
const path = require('path');

// ─── 参数解析 ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
}

const rootArg = getArg('--root');
const projectRoot = rootArg || process.cwd();

const MEMORY_DIR = path.join(projectRoot, '.catpaw', 'memory');
const TOPICS_DIR = path.join(MEMORY_DIR, 'topics');
const MEMORY_INDEX = path.join(MEMORY_DIR, 'MEMORY.md');

// ─── 目录检查 ────────────────────────────────────────────────────────────────

if (!fs.existsSync(MEMORY_DIR) || !fs.existsSync(MEMORY_INDEX)) {
  console.error('❌ 记忆目录未初始化，请先运行：node scripts/memory-init.js');
  process.exit(2);
}

if (!fs.existsSync(TOPICS_DIR)) {
  console.log('✓ topics 目录不存在，无需清理');
  process.exit(0);
}

// ─── 主逻辑 ─────────────────────────────────────────────────────────────────

console.log('\n🧹 CatPaw 记忆清理\n');
if (dryRun) {
  console.log('  [dry-run 模式：只检查，不删除]\n');
}

// 1. 解析索引，提取所有被引用的文件名
const indexContent = fs.readFileSync(MEMORY_INDEX, 'utf8');
const referencedFiles = new Set();
const refPattern = /\(topics\/([^)]+\.md)\)/g;
let match;
while ((match = refPattern.exec(indexContent)) !== null) {
  referencedFiles.add(match[1]);
}

// 2. 扫描 topics 目录下的所有 .md 文件
const allTopicFiles = fs.readdirSync(TOPICS_DIR).filter(f => f.endsWith('.md'));

// 3. 找出孤儿文件
const orphans = allTopicFiles.filter(f => !referencedFiles.has(f));

// ─── 报告 ────────────────────────────────────────────────────────────────────

console.log(`  📊 统计：`);
console.log(`    topics 目录文件数：${allTopicFiles.length}`);
console.log(`    索引引用文件数：${referencedFiles.size}`);
console.log(`    孤儿文件数：${orphans.length}`);

if (orphans.length === 0) {
  console.log('\n✅ 没有孤儿文件，记忆目录干净！');
  process.exit(0);
}

console.log('\n  孤儿文件列表：');
for (const orphan of orphans) {
  const orphanPath = path.join(TOPICS_DIR, orphan);
  const stat = fs.statSync(orphanPath);
  const sizeKB = (stat.size / 1024).toFixed(1);
  console.log(`    - ${orphan}  (${sizeKB} KB, 修改于 ${stat.mtime.toISOString().split('T')[0]})`);

  // 读取标题
  try {
    const content = fs.readFileSync(orphanPath, 'utf8');
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    if (nameMatch) {
      console.log(`      标题：${nameMatch[1].trim()}`);
    }
  } catch (e) {
    // 读取失败不影响流程
  }
}

// ─── 执行清理 ────────────────────────────────────────────────────────────────

if (dryRun) {
  console.log(`\n💡 dry-run 模式，如需实际删除，去掉 --dry-run 参数重新运行`);
  process.exit(0);
}

console.log('\n  正在删除孤儿文件...');
let deletedCount = 0;
let errorCount = 0;

for (const orphan of orphans) {
  const orphanPath = path.join(TOPICS_DIR, orphan);
  try {
    fs.unlinkSync(orphanPath);
    console.log(`    ✅ 已删除：${orphan}`);
    deletedCount++;
  } catch (e) {
    console.error(`    ❌ 删除失败：${orphan}  (${e.message})`);
    errorCount++;
  }
}

// ─── 同时清理索引中的截断警告（如果空间已释放）────────────────────────────

const afterContent = fs.readFileSync(MEMORY_INDEX, 'utf8');
const indexLines = afterContent.split('\n').filter(l => l.startsWith('- [')).length;
const indexBytes = Buffer.byteLength(afterContent, 'utf8');

if (indexLines < 180 && indexBytes < 22000) {
  // 空间充足，清理截断警告注释
  const cleaned = afterContent.replace(/\n<!-- ⚠️ 索引已达上限.*?-->\n/g, '\n');
  if (cleaned !== afterContent) {
    fs.writeFileSync(MEMORY_INDEX, cleaned, 'utf8');
    console.log('\n  ✅ 已清理索引中的截断警告');
  }
}

// ─── 完成 ────────────────────────────────────────────────────────────────────

console.log('\n✨ 清理完成！');
console.log(`   删除：${deletedCount} 个孤儿文件`);
if (errorCount > 0) {
  console.warn(`   失败：${errorCount} 个文件删除失败（权限问题？）`);
}
console.log(`   当前索引：${indexLines} 条记录 / ${indexBytes} 字节`);

if (errorCount > 0) {
  process.exit(1);
}
