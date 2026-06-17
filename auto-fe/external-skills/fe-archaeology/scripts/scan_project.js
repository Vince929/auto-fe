#!/usr/bin/env node

/**
 * fe-archaeology - Frontend Project Scanner
 * 前端专项扫描脚本，检测框架/状态管理/路由/HTTP客户端等前端关键信息。
 * 输出：目录树、框架/状态管理/路由/HTTP客户端检测、关键文件清单、文件统计。
 *
 * 使用方式：node .claude/skills/fe-archaeology/scripts/scan_project.js .
 */

// Windows 强制 UTF-8 输出（解决 CMD/PowerShell 中文乱码）
if (process.platform === 'win32') {
  // Node.js 层面强制 stdout/stderr 使用 UTF-8
  if (process.stdout.isTTY) {
    process.stdout.setDefaultEncoding('utf8');
  }
  if (process.stderr.isTTY) {
    process.stderr.setDefaultEncoding('utf8');
  }
  // 覆盖 write 确保字符串始终以 UTF-8 写出
  const _write = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk, enc, cb) =>
    typeof chunk === 'string'
      ? _write(chunk, 'utf8', cb)
      : _write(chunk, enc, cb);
}

// Windows CMD 兼容：检测是否需要使用 ASCII 树形字符
// CatPaw 终端中 TERM_PROGRAM='vscode'，WT_SESSION 在 Windows Terminal 中有值
const IS_WIN_CMD =
  process.platform === 'win32' &&
  !process.env.WT_SESSION &&
  !process.env.TERM_PROGRAM &&
  process.env.TERM !== 'xterm-256color';

// 树形符号（CMD/原生 PowerShell 使用 ASCII，其他终端使用 Unicode）
const TREE = IS_WIN_CMD
  ? { branch: '+-- ', last: '\\-- ', pipe: '|   ', space: '    ' }
  : {
      branch: '\u251C\u2500\u2500 ',
      last: '\u2514\u2500\u2500 ',
      pipe: '\u2502   ',
      space: '    ',
    };

const fs = require('fs');
const path = require('path');
const os = require('os');

// --- 忽略目录列表 ---
const IGNORE_DIRS = new Set([
  '.git',
  '.idea',
  '.vscode',
  'node_modules',
  '__pycache__',
  'venv',
  '.venv',
  'dist',
  'build',
  'coverage',
  '.next',
  'out',
  '.catpaw',
  'skills',
  '.pytest_cache',
  '.tox',
  'egg-info',
  '.eggs',
  '.turbo',
  '.swc',
  'storybook-static',
]);

// --- 前端框架检测规则 ---
const FRONTEND_FRAMEWORKS = [
  { key: 'react', name: 'React', versionKey: 'react' },
  { key: 'vue', name: 'Vue', versionKey: 'vue' },
  { key: '@angular/core', name: 'Angular', versionKey: '@angular/core' },
  { key: 'svelte', name: 'Svelte', versionKey: 'svelte' },
  { key: 'solid-js', name: 'Solid.js', versionKey: 'solid-js' },
  { key: 'next', name: 'Next.js', versionKey: 'next' },
  { key: 'nuxt', name: 'Nuxt.js', versionKey: 'nuxt' },
  { key: '@remix-run/react', name: 'Remix', versionKey: '@remix-run/react' },
  { key: 'astro', name: 'Astro', versionKey: 'astro' },
  { key: 'preact', name: 'Preact', versionKey: 'preact' },
  { key: 'lit', name: 'Lit', versionKey: 'lit' },
];

// --- 构建工具检测规则 ---
const BUILD_TOOLS = [
  {
    files: ['vite.config.ts', 'vite.config.js', 'vite.config.mts'],
    name: 'Vite',
  },
  { files: ['webpack.config.js', 'webpack.config.ts'], name: 'Webpack' },
  { files: ['rsbuild.config.ts', 'rsbuild.config.js'], name: 'Rsbuild' },
  { files: ['rspack.config.ts', 'rspack.config.js'], name: 'Rspack' },
  { files: ['rollup.config.js', 'rollup.config.ts'], name: 'Rollup' },
  { files: ['esbuild.config.js', 'esbuild.config.ts'], name: 'esbuild' },
  { files: ['turbo.json'], name: 'Turborepo' },
];

// --- 状态管理库检测规则 ---
const STATE_MANAGERS = [
  { key: '@reduxjs/toolkit', name: 'Redux Toolkit (RTK)' },
  { key: 'redux', name: 'Redux' },
  { key: 'zustand', name: 'Zustand' },
  { key: 'mobx', name: 'MobX' },
  { key: 'pinia', name: 'Pinia' },
  { key: 'vuex', name: 'Vuex' },
  { key: 'jotai', name: 'Jotai' },
  { key: 'recoil', name: 'Recoil' },
  { key: 'xstate', name: 'XState' },
  { key: 'valtio', name: 'Valtio' },
];

// --- HTTP 客户端检测规则 ---
const HTTP_CLIENTS = [
  { key: 'axios', name: 'Axios' },
  { key: 'ky', name: 'Ky' },
  { key: 'swr', name: 'SWR' },
  { key: '@tanstack/react-query', name: 'TanStack Query (React)' },
  { key: '@tanstack/vue-query', name: 'TanStack Query (Vue)' },
  { key: 'react-query', name: 'React Query (legacy)' },
  { key: '@apollo/client', name: 'Apollo Client (GraphQL)' },
  { key: 'graphql-request', name: 'graphql-request' },
  { key: 'ofetch', name: 'ofetch' },
];

// --- 微前端方案检测 ---
const MICRO_FRONTEND = [
  { key: 'qiankun', name: 'qiankun' },
  { key: 'single-spa', name: 'single-spa' },
  { key: '@module-federation/enhanced', name: 'Module Federation (enhanced)' },
  { key: 'wujie', name: 'Wujie (无界)' },
  { key: 'garfish', name: 'Garfish (京东)' },
];

// --- 路由库检测 ---
const ROUTER_LIBS = [
  { key: 'react-router-dom', name: 'React Router DOM' },
  { key: 'react-router', name: 'React Router' },
  { key: '@tanstack/router', name: 'TanStack Router' },
  { key: 'wouter', name: 'Wouter' },
];

// --- UI 组件库检测 ---
const UI_LIBS = [
  { key: 'antd', name: 'Ant Design' },
  { key: '@ant-design/pro-components', name: 'Ant Design Pro' },
  { key: '@mui/material', name: 'Material UI (MUI)' },
  { key: '@chakra-ui/react', name: 'Chakra UI' },
  { key: '@radix-ui/react-dialog', name: 'Radix UI' },
  { key: 'shadcn', name: 'shadcn/ui' },
  { key: 'element-plus', name: 'Element Plus' },
  { key: 'naive-ui', name: 'Naive UI' },
  { key: 'vant', name: 'Vant (移动端)' },
  { key: '@nutui/nutui', name: 'NutUI (京东移动端)' },
  { key: 'tdesign-react', name: 'TDesign (腾讯)' },
  { key: 'arco-design', name: 'Arco Design (字节)' },
];

// =============================================================================
// 工具函数
// =============================================================================

function getOsInfo() {
  return {
    system:
      os.platform() === 'win32'
        ? 'Windows'
        : os.platform() === 'darwin'
          ? 'macOS'
          : 'Linux',
    nodeVersion: process.version,
  };
}

/**
 * 生成目录树
 */
function generateTree(startpath, maxDepth = 4) {
  let treeStr = '';
  const stats = { total_files: 0, total_dirs: 0 };
  const fileExtensions = {};

  function walkTree(dirPath, prefix = '', currentDepth = 0) {
    if (currentDepth >= maxDepth) return;

    let entries;
    try {
      entries = fs.readdirSync(dirPath).sort();
    } catch (err) {
      return;
    }

    const dirs = entries.filter((e) => {
      if (e.startsWith('.') || IGNORE_DIRS.has(e)) return false;
      try {
        return fs.statSync(path.join(dirPath, e)).isDirectory();
      } catch {
        return false;
      }
    });

    const files = entries.filter((e) => {
      if (e.startsWith('.')) return false;
      try {
        return fs.statSync(path.join(dirPath, e)).isFile();
      } catch {
        return false;
      }
    });

    for (const f of files) {
      stats.total_files++;
      const ext = path.extname(f) || '[no ext]';
      fileExtensions[ext] = (fileExtensions[ext] || 0) + 1;
    }
    stats.total_dirs += dirs.length;

    for (let i = 0; i < dirs.length; i++) {
      const d = dirs[i];
      const isLast = i === dirs.length - 1 && files.length === 0;
      treeStr += `${prefix}${isLast ? TREE.last : TREE.branch}${d}/\n`;
      walkTree(
        path.join(dirPath, d),
        prefix + (isLast ? TREE.space : TREE.pipe),
        currentDepth + 1
      );
    }

    const filesToShow = files.slice(0, 20);
    for (let i = 0; i < filesToShow.length; i++) {
      const f = filesToShow[i];
      const isLast = i === filesToShow.length - 1 && files.length <= 20;
      treeStr += `${prefix}${isLast ? TREE.last : TREE.branch}${f}\n`;
    }
    if (files.length > 20) {
      treeStr += `${prefix}    ... and ${files.length - 20} more files\n`;
    }
  }

  treeStr += `${path.basename(startpath)}/\n`;
  walkTree(startpath);
  return { tree: treeStr, stats, fileExtensions };
}

/**
 * 解析 package.json
 */
function readPackageJson(projectPath) {
  const pkgPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(pkgPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  } catch (err) {
    console.error(`  ⚠ 解析 package.json 失败: ${err.message}`);
    return null;
  }
}

/**
 * 检测包管理器
 */
function detectPackageManager(projectPath) {
  if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(projectPath, 'package-lock.json'))) return 'npm';
  if (fs.existsSync(path.join(projectPath, 'bun.lockb'))) return 'bun';
  return 'npm (default)';
}

/**
 * 检测构建工具
 */
function detectBuildTool(projectPath) {
  for (const tool of BUILD_TOOLS) {
    for (const file of tool.files) {
      if (fs.existsSync(path.join(projectPath, file))) {
        return tool.name;
      }
    }
  }
  return null;
}

/**
 * 从 deps 对象中检测匹配项
 */
function detectFromDeps(deps, rules) {
  if (!deps) return [];
  const found = [];
  for (const rule of rules) {
    if (deps[rule.key]) {
      found.push({ name: rule.name, version: deps[rule.key] });
    }
  }
  return found;
}

/**
 * 检测路由配置文件
 */
function detectRouteFiles(projectPath) {
  const candidates = [
    'src/entries',
    'src/router/index.ts',
    'src/router/index.js',
    'src/router.ts',
    'src/router.js',
    'src/routes/index.ts',
    'src/routes/index.js',
    'src/routes.ts',
    'src/routes.js',
    'src/App.tsx',
    'src/App.jsx',
    'src/app.tsx',
    'src/app.jsx',
    'src/App.vue',
    'src/app.vue',
  ];
  const found = [];
  for (const c of candidates) {
    const fullPath = path.join(projectPath, c);
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      found.push({ path: c, type: stat.isDirectory() ? 'directory' : 'file' });
    }
  }
  return found;
}

/**
 * 检测代码风格配置文件
 */
function detectStyleConfigs(projectPath) {
  const configs = {
    eslint: [],
    prettier: [],
    typescript: [],
    editorconfig: [],
  };
  const checks = {
    eslint: [
      '.eslintrc',
      '.eslintrc.js',
      '.eslintrc.ts',
      '.eslintrc.json',
      '.eslintrc.yaml',
      '.eslintrc.yml',
      'eslint.config.js',
      'eslint.config.mjs',
      'eslint.config.ts',
    ],
    prettier: [
      '.prettierrc',
      '.prettierrc.js',
      '.prettierrc.json',
      '.prettierrc.yaml',
      'prettier.config.js',
      'prettier.config.mjs',
    ],
    typescript: ['tsconfig.json', 'tsconfig.base.json', 'tsconfig.app.json'],
    editorconfig: ['.editorconfig'],
  };
  for (const [type, files] of Object.entries(checks)) {
    for (const file of files) {
      if (fs.existsSync(path.join(projectPath, file))) {
        configs[type].push(file);
      }
    }
  }
  return configs;
}

/**
 * 扫描 src/components/ 目录，返回组件列表
 */
function scanComponents(projectPath) {
  const componentDirs = [
    'src/components',
    'src/common/components',
    'components',
  ];
  for (const dir of componentDirs) {
    const fullDir = path.join(projectPath, dir);
    if (fs.existsSync(fullDir) && fs.statSync(fullDir).isDirectory()) {
      try {
        const subdirs = fs.readdirSync(fullDir).filter((e) => {
          try {
            return fs.statSync(path.join(fullDir, e)).isDirectory();
          } catch {
            return false;
          }
        });
        return {
          location: dir,
          count: subdirs.length,
          components: subdirs.slice(0, 30),
        };
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * 扫描 src/utils/ 目录，返回文件列表
 */
function scanUtils(projectPath) {
  const utilDirs = ['src/utils', 'src/helpers', 'src/lib'];
  for (const dir of utilDirs) {
    const fullDir = path.join(projectPath, dir);
    if (fs.existsSync(fullDir) && fs.statSync(fullDir).isDirectory()) {
      try {
        const files = fs
          .readdirSync(fullDir)
          .filter((e) => /\.(ts|tsx|js|jsx)$/.test(e));
        return {
          location: dir,
          count: files.length,
          files: files.slice(0, 20),
        };
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * 检测多入口结构
 */
function detectEntries(projectPath) {
  const entriesDir = path.join(projectPath, 'src/entries');
  if (!fs.existsSync(entriesDir)) return null;
  try {
    const entries = fs.readdirSync(entriesDir).filter((e) => {
      try {
        return fs.statSync(path.join(entriesDir, e)).isDirectory();
      } catch {
        return false;
      }
    });
    return { location: 'src/entries', entries };
  } catch {
    return null;
  }
}

/**
 * 确保输出目录存在
 */
function ensureOutputDir() {
  const rulesDir = path.join('.catpaw', 'rules');
  try {
    fs.mkdirSync(rulesDir, { recursive: true });
  } catch (err) {
    console.error(`  ✗ 创建输出目录失败: ${err.message}`);
  }
  return rulesDir;
}

// =============================================================================
// 主函数
// =============================================================================

function main() {
  let projectPath = '.';
  if (process.argv.length > 2) {
    projectPath = process.argv[2];
  }

  if (!fs.existsSync(projectPath) || !fs.statSync(projectPath).isDirectory()) {
    console.error(`✗ 错误：'${projectPath}' 不是有效目录`);
    process.exit(1);
  }

  const osInfo = getOsInfo();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`fe-archaeology - 前端项目扫描器`);
  console.log(`${'='.repeat(60)}`);

  // ── 系统信息 ────────────────────────────────────────────────────────────────
  console.log(`\n[系统信息]`);
  console.log(`  OS: ${osInfo.system}`);
  console.log(`  Node.js: ${osInfo.nodeVersion}`);

  // ── 读取 package.json ────────────────────────────────────────────────────────
  const pkg = readPackageJson(projectPath);
  if (!pkg) {
    console.error(
      `\n✗ 未检测到 package.json，fe-archaeology 仅支持前端工程化项目`
    );
    process.exit(1);
  }

  const allDeps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };

  console.log(`\n[项目基本信息]`);
  console.log(`  项目名称: ${pkg.name || '(未设置)'}`);
  console.log(`  版本: ${pkg.version || '(未设置)'}`);
  console.log(`  描述: ${pkg.description || '(未设置)'}`);

  // ── 包管理器 ────────────────────────────────────────────────────────────────
  const pkgManager = detectPackageManager(projectPath);
  console.log(`\n[包管理器]`);
  console.log(`  ✓ ${pkgManager}`);

  // ── 构建工具 ────────────────────────────────────────────────────────────────
  const buildTool = detectBuildTool(projectPath);
  console.log(`\n[构建工具]`);
  if (buildTool) {
    console.log(`  ✓ ${buildTool}`);
  } else if (allDeps['react-scripts']) {
    console.log(`  ✓ Create React App (Webpack 内置)`);
  } else if (pkg.name === 'next' || allDeps['next']) {
    console.log(`  ✓ Next.js (Webpack/Turbopack 内置)`);
  } else {
    console.log(`  ? 未检测到标准构建工具配置文件`);
  }

  // ── 前端框架 ────────────────────────────────────────────────────────────────
  console.log(`\n[前端框架]`);
  const frameworks = detectFromDeps(allDeps, FRONTEND_FRAMEWORKS);
  if (frameworks.length > 0) {
    for (const f of frameworks) {
      console.log(`  ✓ ${f.name} (${f.version})`);
    }
  } else {
    console.log(`  ? 未检测到已知前端框架`);
  }

  // ── 状态管理 ────────────────────────────────────────────────────────────────
  console.log(`\n[状态管理]`);
  const stateManagers = detectFromDeps(allDeps, STATE_MANAGERS);
  if (stateManagers.length > 0) {
    for (const s of stateManagers) {
      console.log(`  ✓ ${s.name} (${s.version})`);
    }
  } else {
    console.log(
      `  - 未检测到常见状态管理库（可能使用自定义方案或组件本地状态）`
    );
  }

  // ── 路由库 ──────────────────────────────────────────────────────────────────
  console.log(`\n[路由库]`);
  const routers = detectFromDeps(allDeps, ROUTER_LIBS);
  if (routers.length > 0) {
    for (const r of routers) {
      console.log(`  ✓ ${r.name} (${r.version})`);
    }
  } else {
    console.log(`  - 未检测到独立路由库（可能使用框架内置路由）`);
  }

  // ── HTTP 客户端 ──────────────────────────────────────────────────────────────
  console.log(`\n[HTTP 客户端]`);
  const httpClients = detectFromDeps(allDeps, HTTP_CLIENTS);
  if (httpClients.length > 0) {
    for (const h of httpClients) {
      console.log(`  ✓ ${h.name} (${h.version})`);
    }
  } else {
    console.log(`  - 未检测到常见 HTTP 客户端库（可能使用 fetch 原生 API）`);
  }

  // ── UI 组件库 ────────────────────────────────────────────────────────────────
  console.log(`\n[UI 组件库]`);
  const uiLibs = detectFromDeps(allDeps, UI_LIBS);
  if (uiLibs.length > 0) {
    for (const u of uiLibs) {
      console.log(`  ✓ ${u.name} (${u.version})`);
    }
  } else {
    console.log(`  - 未检测到常见 UI 组件库`);
  }

  // ── 全量依赖（供 AI 识别白名单外的库） ───────────────────────────────────────
  // 收集所有已被白名单命中的包名，用于过滤
  const knownKeys = new Set(
    [
      ...FRONTEND_FRAMEWORKS,
      ...BUILD_TOOLS.flatMap((t) => t.files), // build tools 用文件检测，无需过滤
      ...STATE_MANAGERS,
      ...HTTP_CLIENTS,
      ...MICRO_FRONTEND,
      ...ROUTER_LIBS,
      ...UI_LIBS,
    ]
      .filter((r) => r.key)
      .map((r) => r.key)
  );

  const unknownDeps = Object.keys(allDeps).filter((k) => !knownKeys.has(k));
  if (unknownDeps.length > 0) {
    console.log(`\n[全量依赖（白名单外，供 AI 识别未知库）]`);
    console.log(`  ${unknownDeps.join(', ')}`);
  }

  // ── 微前端 ───────────────────────────────────────────────────────────────────
  const microFe = detectFromDeps(allDeps, MICRO_FRONTEND);
  if (microFe.length > 0) {
    console.log(`\n[微前端方案]`);
    for (const m of microFe) {
      console.log(`  ✓ ${m.name} (${m.version})`);
    }
  }

  // ── 代码风格配置 ─────────────────────────────────────────────────────────────
  console.log(`\n[代码风格配置]`);
  const styleConfigs = detectStyleConfigs(projectPath);
  let hasAnyConfig = false;
  for (const [type, files] of Object.entries(styleConfigs)) {
    if (files.length > 0) {
      console.log(`  ✓ ${type.toUpperCase()}: ${files.join(', ')}`);
      hasAnyConfig = true;
    }
  }
  if (!hasAnyConfig) {
    console.log(`  - 未检测到代码风格配置文件`);
  }

  // ── 路由配置文件 ─────────────────────────────────────────────────────────────
  console.log(`\n[路由配置文件]`);
  const routeFiles = detectRouteFiles(projectPath);
  if (routeFiles.length > 0) {
    for (const r of routeFiles) {
      console.log(`  ✓ ${r.path} (${r.type})`);
    }
  } else {
    console.log(`  ? 未检测到标准路由配置文件`);
  }

  // ── 多入口检测 ───────────────────────────────────────────────────────────────
  const entries = detectEntries(projectPath);
  if (entries) {
    console.log(`\n[多入口结构]`);
    console.log(`  ✓ 检测到多入口项目 (${entries.location})`);
    for (const e of entries.entries) {
      console.log(`    - ${e}`);
    }
  }

  // ── 组件目录 ─────────────────────────────────────────────────────────────────
  console.log(`\n[公共组件目录]`);
  const components = scanComponents(projectPath);
  if (components) {
    console.log(`  ✓ ${components.location} (共 ${components.count} 个组件)`);
    if (components.components.length > 0) {
      console.log(
        `  组件列表: ${components.components.slice(0, 15).join(', ')}${components.components.length > 15 ? ' ...' : ''}`
      );
    }
  } else {
    console.log(`  - 未检测到公共组件目录`);
  }

  // ── 工具函数目录 ─────────────────────────────────────────────────────────────
  console.log(`\n[工具函数目录]`);
  const utils = scanUtils(projectPath);
  if (utils) {
    console.log(`  ✓ ${utils.location} (共 ${utils.count} 个文件)`);
    if (utils.files.length > 0) {
      console.log(`  文件列表: ${utils.files.join(', ')}`);
    }
  } else {
    console.log(`  - 未检测到工具函数目录`);
  }

  // ── package.json scripts ─────────────────────────────────────────────────────
  console.log(`\n[项目脚本 (scripts)]`);
  if (pkg.scripts && Object.keys(pkg.scripts).length > 0) {
    for (const [name, cmd] of Object.entries(pkg.scripts)) {
      console.log(`  ${name.padEnd(20)} ${cmd}`);
    }
  } else {
    console.log(`  - 未定义 scripts`);
  }

  // ── Node 版本要求 ────────────────────────────────────────────────────────────
  if (pkg.engines) {
    console.log(`\n[运行环境要求 (engines)]`);
    for (const [k, v] of Object.entries(pkg.engines)) {
      console.log(`  ${k}: ${v}`);
    }
  }

  // ── 目录树 ───────────────────────────────────────────────────────────────────
  console.log(`\n[项目目录树]`);
  const { tree, stats, fileExtensions } = generateTree(projectPath, 4);
  console.log(tree);

  // ── 文件统计 ─────────────────────────────────────────────────────────────────
  console.log(`[文件统计]`);
  console.log(`  目录数: ${stats.total_dirs}`);
  console.log(`  文件数: ${stats.total_files}`);
  if (Object.keys(fileExtensions).length > 0) {
    console.log(`\n  文件类型分布（Top 10）:`);
    const sorted = Object.entries(fileExtensions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    for (const [ext, count] of sorted) {
      console.log(`    ${ext.padEnd(15)} ${String(count).padStart(4)} 个`);
    }
  }

  // ── 初始化输出目录 ────────────────────────────────────────────────────────────
  console.log(`\n[初始化输出目录]`);
  try {
    const rulesDir = ensureOutputDir();
    console.log(`  ✓ .catpaw/rules/ 目录就绪：${path.resolve(rulesDir)}`);
  } catch (err) {
    console.error(`  ✗ 创建输出目录失败: ${err.message}`);
  }

  // ── 完成提示 ─────────────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[扫描完成]`);
  console.log(`\n扫描结果已就绪，接下来 AI 将：`);
  console.log(`  1. 深度分析路由、组件、状态管理、API 封装`);
  console.log(`  2. 生成项目上下文     → .catpaw/rules/project-context.md`);
  console.log(
    `  3. 生成专属 Dev Skill → .claude/skills/<project>-dev/SKILL.md`
  );
  console.log(`  4. 生成 13 个详细文档 → docs/`);
  console.log(`${'='.repeat(60)}\n`);
}

main();
