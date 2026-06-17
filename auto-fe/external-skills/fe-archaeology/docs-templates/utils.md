# Utils 工具库参考文档

> **维护规则**：每当 `src/utils/` 目录下有工具函数新增、删除，或函数签名/行为变更时，必须同步更新本文档。

## 目录索引

| 文件                       | 说明                         |
| -------------------------- | ---------------------------- |
| [format.ts](#formatts)     | 格式化工具（价格/日期/数字） |
| [validate.ts](#validatets) | 表单校验工具                 |
| [storage.ts](#storagets)   | 本地存储封装                 |
| [platform.ts](#platformts) | 平台/环境检测                |
| [track.ts](#trackts)       | 埋点上报工具                 |
| [bridge.ts](#bridgets)     | JSBridge（端能力调用）       |

---

## format.ts

**用途**：格式化工具，处理价格展示、日期格式化、数字处理。

### 函数列表

#### `formatPrice(price, options?): string`

将分（整数）转换为可读的价格字符串。

| 参数              | 类型     | 默认值 | 说明             |
| ----------------- | -------- | ------ | ---------------- |
| `price`           | `number` | —      | 价格（单位：分） |
| `options.symbol`  | `string` | `'¥'`  | 货币符号         |
| `options.decimal` | `number` | `2`    | 小数位数         |

```ts
import { formatPrice } from '@/utils/format';
formatPrice(1990); // "¥19.90"
formatPrice(1990, { symbol: '' }); // "19.90"
```

#### `formatDate(timestamp, format?): string`

将时间戳格式化为字符串。

```ts
import { formatDate } from '@/utils/format';
formatDate(1710000000000); // "2024-03-09"
formatDate(1710000000000, 'MM/DD'); // "03/09"
formatDate(1710000000000, 'HH:mm'); // "22:40"
```

---

## validate.ts

**用途**：表单校验工具，返回统一的 `{ valid: boolean; message: string }` 结构。

### 函数列表

#### `validatePhone(phone): { valid: boolean; message: string }`

校验手机号是否合法（中国大陆）。

```ts
import { validatePhone } from '@/utils/validate';
validatePhone('13800138000'); // { valid: true, message: '' }
validatePhone('1234'); // { valid: false, message: '手机号格式不正确' }
```

#### `validateRequired(value, fieldName?): { valid: boolean; message: string }`

校验字段是否为空。

---

## storage.ts

**用途**：localStorage / sessionStorage 封装，自动处理 JSON 序列化和异常。

### 函数列表

#### `setStorage(key, value, options?): void`

存储数据（自动 JSON.stringify）。

| 参数              | 类型      | 默认值  | 说明                  |
| ----------------- | --------- | ------- | --------------------- |
| `key`             | `string`  | —       | 存储键名              |
| `value`           | `any`     | —       | 存储值                |
| `options.session` | `boolean` | `false` | 是否用 sessionStorage |
| `options.expires` | `number`  | —       | 过期时间（毫秒）      |

```ts
import { setStorage, getStorage, removeStorage } from '@/utils/storage';
setStorage('user', { id: 1, name: 'Alice' });
getStorage<UserInfo>('user'); // { id: 1, name: 'Alice' }
removeStorage('user');
```

---

## platform.ts

**用途**：检测运行平台和环境，用于条件渲染和差异化逻辑。

### 函数列表

#### `isIOS(): boolean` / `isAndroid(): boolean`

检测操作系统。

#### `isInApp(): boolean`

检测是否在 APP 内嵌 WebView 中运行。

#### `isWechat(): boolean`

检测是否在微信浏览器中运行。

```ts
import { isIOS, isInApp } from '@/utils/platform';

if (isInApp()) {
  // 使用 JSBridge 调用端能力
} else {
  // 降级到 Web 方案
}
```

---

## track.ts

**用途**：埋点上报工具，封装内部埋点 SDK / 第三方统计。

### 函数列表

#### `trackClick(eventName, params?): void`

上报点击事件。

#### `trackExpose(elementId, params?): void`

上报曝光事件（通常配合 IntersectionObserver 使用）。

#### `trackPageView(pageName, params?): void`

上报页面浏览事件。

```ts
import { trackClick } from '@/utils/track';

const handleBuyClick = () => {
  trackClick('buy_button_click', { itemId: '123', price: 1990 });
  // 业务逻辑...
};
```

---

## bridge.ts

**用途**：JSBridge 封装，提供调用 APP 端能力的统一接口（仅 APP 内嵌场景）。

> ⚠️ 调用前应先用 `isInApp()` 判断环境，非 APP 内嵌环境不可调用。

### 函数列表

#### `getLocation(): Promise<{ lat: number; lng: number }>`

获取当前位置（调用 APP 定位能力）。

#### `setTitle(title: string): void`

设置 APP 导航栏标题。

#### `goBack(): void`

触发 APP 返回（优先调用端 back，降级为浏览器 history.back）。

```ts
import { getLocation, isInApp } from '@/utils/bridge';
import { isInApp } from '@/utils/platform';

const fetchLocation = async () => {
  if (!isInApp()) return null;
  return await getLocation();
};
```
