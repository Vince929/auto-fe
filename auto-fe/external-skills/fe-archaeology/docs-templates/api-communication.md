# API 通讯规范

> **维护规则**：新增接口封装文件、修改请求基础配置时，必须同步更新本文档。

## HTTP 客户端

| 库                          | 版本    | 文档 |
| --------------------------- | ------- | ---- |
| [Axios / ky / ofetch / ...] | [x.x.x] | —    |

## API 封装位置

```
src/api/                    # API 封装目录（按业务域分文件）
├── index.ts                # 统一导出
├── [domain1].ts            # [业务域1] 相关接口
├── [domain2].ts            # [业务域2] 相关接口
└── request.ts              # 请求实例封装（interceptors）
```

## 请求实例配置

```typescript
// src/api/request.ts（或 src/utils/request.ts）
import axios from 'axios';

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 注入 token / 公共参数
    const token = [getToken()];
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const { code, data, msg } = response.data;
    if (code === 0 || code === 200) {
      return data; // 直接返回业务数据
    }
    // 统一错误处理（toast 提示等）
    [showToast(msg || '请求失败')];
    return Promise.reject(new Error(msg));
  },
  (error) => {
    // 网络错误/超时处理
    if (error.response?.status === 401) {
      [redirectToLogin()];
    }
    return Promise.reject(error);
  }
);

export default request;
```

## 接口函数定义规范

```typescript
// src/api/[domain].ts
import request from './request';
import type { [DomainData], [DomainQueryParams] } from '@/types/[domain]';

// ✅ 好的做法：函数名清晰，参数类型明确，返回类型明确
export const get[DomainName]List = (params: [DomainQueryParams]): Promise<[DomainData][]> => {
  return request.get('/api/[endpoint]', { params });
};

export const create[DomainName] = (data: Create[DomainName]Params): Promise<[DomainData]> => {
  return request.post('/api/[endpoint]', data);
};

export const update[DomainName] = (id: string, data: Update[DomainName]Params): Promise<void> => {
  return request.put(`/api/[endpoint]/${id}`, data);
};

export const delete[DomainName] = (id: string): Promise<void> => {
  return request.delete(`/api/[endpoint]/${id}`);
};
```

## 通讯规范（MUST / MUST NOT）

### ✅ MUST（必须这样做）

1. 所有接口调用封装在 `src/api/` 目录下的函数中
2. 在 `createAsyncThunk` 或 Store action 中调用 API 函数
3. 所有接口调用必须有错误处理（try/catch 或 rejectWithValue）
4. 接口参数和返回类型必须有 TypeScript 类型定义

### ❌ MUST NOT（严禁这样做）

1. 在 React 组件 / Vue 组件中直接调用 `axios.get()` / `fetch()`
2. 在组件内部写死接口 URL（如 `'/api/user'`）
3. 在组件中直接处理接口返回的原始数据结构
4. 忽略接口错误（不处理 catch）

## 错误处理机制

| 错误类型                       | 处理方式                  | 代码位置             |
| ------------------------------ | ------------------------- | -------------------- |
| **业务逻辑错误**（code !== 0） | 响应拦截器统一 toast 提示 | `src/api/request.ts` |
| **401 未授权**                 | 跳转登录页                | `src/api/request.ts` |
| **网络超时**                   | toast 提示 + 可重试       | `src/api/request.ts` |
| **500 服务端错误**             | toast 提示 + 上报埋点     | `src/api/request.ts` |
| **请求参数错误**（前端校验）   | 调用方处理（不发请求）    | 各业务 Thunk         |

## Mock 数据（开发阶段）

> 若项目有 mock 配置，记录在此

- Mock 目录：`[mocks/]`
- 启用方式：[修改 .env.development 中 VITE_MOCK=true / 直接在 vite.config.ts 配置]
- Mock 框架：[msw / vite-plugin-mock / ...]
