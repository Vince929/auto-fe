# 状态管理

> **维护规则**：新增/删除切片，或切片职责发生变更时，必须同步更新本文档。

## 使用的库

| 库                                      | 版本    | 安装                                      |
| --------------------------------------- | ------- | ----------------------------------------- |
| [Redux Toolkit / Zustand / Pinia / ...] | [x.x.x] | `[pnpm add @reduxjs/toolkit react-redux]` |

## 快速使用

### 创建切片 / Store

```typescript
// [Redux Toolkit 示例]
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface [DomainName]State {
  data: [Type] | null;
  loading: boolean;
  error: string | null;
}

const initialState: [DomainName]State = {
  data: null,
  loading: false,
  error: null,
};

export const [domainName]Slice = createSlice({
  name: '[domainName]',
  initialState,
  reducers: {
    setData(state, action: PayloadAction<[Type]>) {
      state.data = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetch[DomainName].pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetch[DomainName].fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetch[DomainName].rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? '请求失败';
      });
  },
});
```

### 在组件中使用

```typescript
// React + Redux Toolkit
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetch[DomainName] } from '@/store/[domain-name]-slice';

const Component = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { data, loading } = useSelector((state: RootState) => state.[domainName]);

  useEffect(() => {
    dispatch(fetch[DomainName]());
  }, [dispatch]);

  return <div>{loading ? '加载中...' : data?.name}</div>;
};
```

### 异步 Thunk

```typescript
import { createAsyncThunk } from '@reduxjs/toolkit';
import { get[DomainName] } from '@/api/[domain]';

export const fetch[DomainName] = createAsyncThunk(
  '[domainName]/fetch',
  async (params: [ParamType], { rejectWithValue }) => {
    try {
      const result = await get[DomainName](params);
      return result;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);
```

## 项目切片/模块详细说明

> 以下为本项目现有的所有状态切片，按业务域分类

### [切片名称：如 userSlice]

- **文件路径**：`[src/store/user-slice.ts]`
- **职责**：[负责管理用户登录态、用户信息的状态]
- **State 结构**：
  ```typescript
  {
    userInfo: UserInfo | null;
    isLogin: boolean;
    loading: boolean;
  }
  ```
- **主要 Actions**：
  - `fetchUserInfo()` —— 获取用户信息（异步 thunk）
  - `logout()` —— 退出登录（同步）
- **主要 Selectors**：
  - `selectUserInfo(state)` —— 获取用户信息
  - `selectIsLogin(state)` —— 获取登录状态

### [切片名称：如 cartSlice]

- **文件路径**：`[src/store/cart-slice.ts]`
- **职责**：[购物车商品列表、数量、价格计算]
- **State 结构**：
  ```typescript
  {
    items: CartItem[];
    totalPrice: number;
    loading: boolean;
  }
  ```
- **主要 Actions**：
  - `addItem(item)` —— 添加商品
  - `removeItem(itemId)` —— 移除商品
  - `fetchCart()` —— 拉取购物车（异步 thunk）

## Store 配置

```typescript
// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    [domainName]: [domainName]Reducer,
    // ... 其他切片
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```
