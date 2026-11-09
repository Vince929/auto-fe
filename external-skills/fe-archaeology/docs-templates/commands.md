# 命令参考

> **维护规则**：修改构建配置、新增/删除 package.json scripts 时，必须同步更新本文档。

## 前置要求

| 工具         | 版本要求                              | 安装方式                                   |
| ------------ | ------------------------------------- | ------------------------------------------ |
| **Node.js**  | [>=18.0.0（来自 engines 字段）]       | [https://nodejs.org/](https://nodejs.org/) |
| **包管理器** | [pnpm >= 8 / yarn >= 1.22 / npm >= 9] | `npm install -g pnpm`                      |

## 本地开发

```bash
# 安装依赖
[pnpm install / yarn / npm install]

# 启动开发服务器（带 HMR 热更新）
[pnpm dev / yarn dev / npm run dev]
```

启动后访问：`http://localhost:[port]`（通常为 5173 / 3000 / 8080）

### 环境变量配置（首次运行）

```bash
cp .env.example .env.local
# 编辑 .env.local，填入本地配置
```

> 环境变量文件说明：`.env`（全局默认）/ `.env.development`（开发）/ `.env.production`（生产）/ `.env.local`（本地覆盖，不提交 git）

## 构建

| 命令                   | 说明                               | 输出目录 |
| ---------------------- | ---------------------------------- | -------- |
| `[pnpm build]`         | 生产环境构建                       | `dist/`  |
| `[pnpm build:test]`    | 测试环境构建（接口指向测试服务器） | `dist/`  |
| `[pnpm build:staging]` | 预发环境构建                       | `dist/`  |
| `[pnpm preview]`       | 本地预览生产构建产物               | —        |

### 构建工具

| 工具                             | 版本    | 配置文件                                 |
| -------------------------------- | ------- | ---------------------------------------- |
| [Vite / Webpack / Rsbuild / ...] | [x.x.x] | [`vite.config.ts` / `webpack.config.js`] |

### 构建关键配置摘要

```typescript
// vite.config.ts（关键配置摘要）
export default defineConfig({
  base: '[/项目路径前缀/]',
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  build: { outDir: 'dist', chunkSizeWarningLimit: 1000 },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: '[http://dev-api-server]', changeOrigin: true },
    },
  },
});
```

## 代码质量

| 命令                   | 说明                          |
| ---------------------- | ----------------------------- |
| `[pnpm type-check]`    | TypeScript 类型检查（不编译） |
| `[pnpm lint]`          | 运行 ESLint 检查代码质量      |
| `[pnpm lint:fix]`      | 自动修复 ESLint 可修复问题    |
| `[pnpm format]`        | Prettier 格式化所有文件       |
| `[pnpm test]`          | 运行单元测试（Jest / Vitest） |
| `[pnpm test:coverage]` | 运行测试并生成覆盖率报告      |

## 调试

### 浏览器 DevTools

- **Sources 面板**：Source Map 还原源码，在 TypeScript 文件中打断点
- **Network 面板**：查看接口请求/响应，过滤 XHR 请求
- **React DevTools**：查看组件树、Props、State，Profiler 面板分析渲染性能
- **Redux DevTools**：查看 Action 历史、State 快照，时光机调试

### HMR（热模块替换）

- Vite 默认开启 HMR，修改 `.tsx/.ts/.css` 后浏览器自动更新（不刷新页面）
- 若 HMR 失效，查看终端报错，或手动刷新（`Ctrl+R` / `Cmd+R`）
- 修改 `vite.config.ts` 或 `package.json` 需重启开发服务器

### Source Map

| 环境         | Source Map 类型                         |
| ------------ | --------------------------------------- |
| **开发**     | `eval-source-map`（快速重建，完整映射） |
| **生产**     | 不生成（避免暴露源码）                  |
| **测试环境** | `source-map`（可选，便于排查线上问题）  |

### 调试代码片段

```typescript
// 查看当前 Redux State（临时调试）
import { store } from '@/store';
console.log(store.getState());

// 检查组件渲染次数
const renderCount = useRef(0);
useEffect(() => {
  renderCount.current++;
  console.log('renders:', renderCount.current);
});
```

## 常见问题

| 问题                           | 解决方案                                                               |
| ------------------------------ | ---------------------------------------------------------------------- |
| 启动报 `node_modules` 相关错误 | 删除 `node_modules` 后重装：`[pnpm install]`                           |
| 端口冲突                       | `[pnpm dev -- --port 3001]`                                            |
| TypeScript 报错但不影响运行    | 开发阶段 Vite 不阻塞 TS 错误，运行 `pnpm type-check` 查看完整类型错误  |
| `Cannot find module '@/...'`   | 检查 `vite.config.ts` 的 `resolve.alias` 和 `tsconfig.json` 的 `paths` |
| chunk 过大警告                 | 检查重复依赖，使用动态 import 懒加载                                   |
| 环境变量未生效（Vite）         | 变量必须以 `VITE_` 开头才会暴露到浏览器                                |
