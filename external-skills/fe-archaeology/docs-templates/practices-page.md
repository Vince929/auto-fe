# 页面组件开发规范

> **维护规则**：当页面层开发规范发生变化时，必须同步更新本文档。

## 文件组织结构

```
src/pages/[page-name]/
├── index.tsx           # 页面主组件（入口）
├── components/         # 页面私有组件（仅在此页面使用）
│   └── [ComponentName].tsx
├── hooks/              # 页面私有 Hooks
│   └── use[HookName].ts
├── [page-name].module.css  # 页面样式（CSS Modules）
└── types.ts            # 页面内部类型定义（若较多）
```

## 典型页面组件结构

```typescript
import React, { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchXxx } from '@/store/xxx-slice';
import XxxComponent from './components/XxxComponent';
import styles from './page-name.module.css';

// 1. 类型定义（放顶部）
interface PageProps {
  id: string;
}

// 2. 组件本体
const PageName: React.FC<PageProps> = ({ id }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { data, loading } = useSelector((state: RootState) => state.xxx);

  // 3. 副作用（必须声明依赖数组）
  useEffect(() => {
    dispatch(fetchXxx(id));
  }, [dispatch, id]);

  // 4. 事件处理（使用 useCallback）
  const handleClick = useCallback(() => {
    // ...
  }, []);

  // 5. 渲染
  if (loading) return <div>加载中...</div>;
  return (
    <div className={styles.container}>
      <XxxComponent data={data} onClick={handleClick} />
    </div>
  );
};

export default PageName;
```

## 副作用管理规范

- `useEffect` 依赖数组**必须完整**，不得 eslint-disable 忽略 exhaustive-deps 警告
- 组件卸载时**必须清理**定时器、事件监听、订阅：
  ```typescript
  useEffect(() => {
    const timer = setInterval(() => {}, 1000);
    return () => clearInterval(timer); // 清理函数必须有
  }, []);
  ```
- 复杂的副作用逻辑提取为自定义 Hook（`use[Name].ts`）

## 错误边界

```typescript
// 顶级路由组件需要 ErrorBoundary 包裹
import ErrorBoundary from '@/components/error-boundary';

<ErrorBoundary fallback={<ErrorPage />}>
  <PageComponent />
</ErrorBoundary>
```

## 性能优化规范

- **组件懒加载**：路由级组件使用 `React.lazy` + `Suspense`
- **列表性能**：长列表（>50 项）使用虚拟滚动（项目已有 `[VirtualList 组件]`）
- **选择器缓存**：使用 `createSelector`（reselect）避免不必要的重渲染
- **图片优化**：使用项目封装的 `[Image 组件]` 自动处理懒加载和占位
