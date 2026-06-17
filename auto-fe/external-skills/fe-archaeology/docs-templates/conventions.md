# 命名约定与代码风格

## 文件命名规则

| 文件类型        | 命名风格                      | 示例                                  |
| --------------- | ----------------------------- | ------------------------------------- |
| **React 组件**  | [PascalCase]                  | `UserProfile.tsx`, `NavBar.tsx`       |
| **Vue SFC**     | [PascalCase / kebab-case]     | `UserProfile.vue`, `user-profile.vue` |
| **自定义 Hook** | camelCase + `use` 前缀        | `useUserInfo.ts`, `useCart.ts`        |
| **工具函数**    | [camelCase / kebab-case]      | `formatPrice.ts`, `format-price.ts`   |
| **类型定义**    | camelCase                     | `userTypes.ts`, `apiTypes.ts`         |
| **常量文件**    | camelCase                     | `constants.ts`, `enums.ts`            |
| **样式文件**    | 同组件名                      | `UserProfile.module.css`              |
| **测试文件**    | 同源文件 + `.test` 或 `.spec` | `UserProfile.test.tsx`                |
| **目录名**      | [kebab-case]                  | `user-profile/`, `shopping-cart/`     |

## 组件命名规则

| 类型               | 规范                     | 说明                                     |
| ------------------ | ------------------------ | ---------------------------------------- |
| **函数组件**       | PascalCase，与文件名一致 | `const UserProfile: React.FC = () => {}` |
| **Vue SFC 组件名** | PascalCase（name 选项）  | `name: 'UserProfile'`                    |
| **高阶组件**       | `with` 前缀              | `withAuth`, `withLoading`                |
| **Context**        | `[Name]Context`          | `UserContext`, `ThemeContext`            |
| **Provider**       | `[Name]Provider`         | `UserProvider`, `ThemeProvider`          |

## 变量与函数命名

| 类型                    | 规范                        | 示例                                             |
| ----------------------- | --------------------------- | ------------------------------------------------ |
| **普通变量**            | camelCase                   | `userName`, `totalPrice`                         |
| **布尔变量**            | `is/has/should/can` 前缀    | `isLoading`, `hasError`, `canSubmit`             |
| **函数/方法**           | camelCase + 动词开头        | `getUserInfo()`, `handleClick()`, `formatDate()` |
| **事件处理器**          | `handle` + 事件名           | `handleSubmit()`, `handleInputChange()`          |
| **异步函数**            | 语义化（不强制 async 前缀） | `fetchUserList()`, `loadMoreData()`              |
| **常量**                | UPPER_SNAKE_CASE            | `MAX_RETRY_COUNT`, `API_BASE_URL`                |
| **枚举值**              | UPPER_SNAKE_CASE            | `OrderStatus.PENDING`, `PayType.ALIPAY`          |
| **TypeScript 接口**     | PascalCase，不加 `I` 前缀   | `UserInfo`, `ApiResponse<T>`                     |
| **TypeScript 类型别名** | PascalCase                  | `UserId = string`, `Nullable<T>`                 |
| **泛型参数**            | 单个大写字母或 PascalCase   | `T`, `TData`, `TResponse`                        |

## CSS 类名规范

| 方案               | 规范               | 示例                                  |
| ------------------ | ------------------ | ------------------------------------- |
| **CSS Modules**    | camelCase          | `.userCard`, `.submitButton`          |
| **全局样式 / BEM** | kebab-case         | `.user-card__title--active`           |
| **Tailwind**       | 官方 utility class | `className="flex items-center gap-2"` |

## 代码组织规范

### 导入顺序

```typescript
// 1. React / 框架核心
import React, { useEffect, useState } from 'react';

// 2. 第三方库
import { useSelector } from 'react-redux';
import classNames from 'classnames';

// 3. 内部模块（使用 @ 路径别名）
import { fetchUser } from '@/store/user-slice';
import Button from '@/components/button';

// 4. 类型导入（type-only imports）
import type { UserInfo } from '@/types/user';

// 5. 相对路径导入（同目录）
import styles from './UserProfile.module.css';
```

### 文件内代码顺序

```typescript
// 1. import
// 2. 类型定义 (interface / type)
// 3. 常量 (const MAX_XXX = ...)
// 4. 组件定义
//    a. Hooks 调用（useState / useSelector 等）
//    b. 副作用（useEffect）
//    c. 事件处理函数
//    d. 辅助函数
//    e. return JSX
// 5. export default
```

## 代码风格配置摘要

> 基于项目 ESLint/Prettier 配置文件提取

| 规则             | 配置值                       |
| ---------------- | ---------------------------- |
| **缩进**         | [2 个空格]                   |
| **引号**         | [单引号]                     |
| **分号**         | [必需 / 禁止]                |
| **行最大长度**   | [100]                        |
| **尾随逗号**     | [es5（对象/数组末尾加逗号）] |
| **括号间距**     | [有空格：{ foo }]            |
| **箭头函数括号** | [单参数省略括号：x => x]     |
| **换行符**       | [LF]                         |

配置文件位置：

- ESLint：`[.eslintrc.js / eslint.config.js]`
- Prettier：`[.prettierrc / prettier.config.js]`
- TypeScript：`tsconfig.json`
