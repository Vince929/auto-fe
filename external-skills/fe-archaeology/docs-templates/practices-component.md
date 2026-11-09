# 通用组件开发规范

> **维护规则**：当通用组件规范发生变化时，必须同步更新本文档。

## Props 设计原则

```typescript
// ✅ 好的做法：细粒度 Props，类型精确
interface ButtonProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

// ❌ 避免：传递整个数据对象
interface BadButtonProps {
  config: Record<string, any>; // 类型不明确
  data: UserInfo; // 只用到 name 却传整个对象
}
```

## 组件结构模板

```typescript
import React from 'react';
import styles from './ComponentName.module.css';

interface ComponentNameProps {
  // Props 定义
}

/**
 * ComponentName - 组件功能一句话描述
 * @param props.xxx - xxx 的说明
 */
const ComponentName: React.FC<ComponentNameProps> = ({ ...props }) => {
  return (
    <div className={styles.root}>
      {/* JSX */}
    </div>
  );
};

export default ComponentName;
```

## 样式管理

- 使用 [CSS Modules / styled-components / Tailwind] 实现样式隔离
- 全局主题变量定义在 `[src/styles/variables.css]`
- 避免内联样式（仅动态值允许内联，如 `style={{ width: dynamicWidth }}`）

## 组件复用门槛

- ≥ 2 处使用才抽取为公共组件，放入 `src/components/`
- 单处使用的私有组件放在对应页面的 `components/` 子目录下
