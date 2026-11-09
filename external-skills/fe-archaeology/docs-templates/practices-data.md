# 数据层开发规范

> **维护规则**：当数据层规范（状态管理/API 调用/错误处理）发生变化时，必须同步更新本文档。

## 数据切片开发规范

### 异步逻辑处理

- 所有接口调用通过 `createAsyncThunk` 处理
- Thunk 内必须有 try/catch，失败时使用 `rejectWithValue` 传递错误信息
- Loading / Error 状态在 extraReducers 中统一管理

### 错误处理

```typescript
// extraReducers 统一错误处理模式
.addCase(fetchXxx.rejected, (state, action) => {
  state.loading = false;
  state.error = action.payload as string ?? '请求失败，请重试';
  // 可在此上报埋点
});
```

### 通讯逻辑归属

- ✅ API 调用写在 `createAsyncThunk` 或 `src/api/` 中
- ❌ 严禁在 Reducer、Selector 或 UI 组件中直接发起 HTTP 请求
