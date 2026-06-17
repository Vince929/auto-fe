# 公共组件文档

> 本文档记录 `src/components/` 目录下所有公共组件的用途、Props 说明和使用示例。
> **维护规则**：每当公共组件有新增、删除、或 Props/API 变更时，必须同步更新本文档。
>
> **生成策略**：
>
> - ≤ 15 个组件：单文件（本文件），超过 10 个时按功能分类并提供锚点索引
> - \> 15 个组件：本文件作为**总索引**（只含组件一行简介），Props 详情见 `components-ui.md` / `components-form.md` / `components-layout.md` / `components-business.md`

---

## 目录索引

> 组件数量超过 10 个时按功能分类

### 通用 UI

- [Button](#button)
- [Modal](#modal)
- [Loading](#loading)

### 表单 / 输入

- [Input](#input)
- [Select](#select)

### 布局

- [Page](#page)
- [NavBar](#navbar)

### 业务组件

- [XXXRenderer](#xxxrenderer)

---

## 通用 UI

### Button

**路径**：`src/components/button/index.tsx`

**用途**：项目通用按钮组件，统一按钮样式和加载态处理。

**Props**：

| Prop       | 类型                                  | 默认值      | 说明           |
| ---------- | ------------------------------------- | ----------- | -------------- |
| `children` | `React.ReactNode`                     | —           | 按钮内容       |
| `variant`  | `'primary' \| 'secondary' \| 'ghost'` | `'primary'` | 按钮样式变体   |
| `size`     | `'sm' \| 'md' \| 'lg'`                | `'md'`      | 按钮尺寸       |
| `loading`  | `boolean`                             | `false`     | 是否显示加载态 |
| `disabled` | `boolean`                             | `false`     | 是否禁用       |
| `onClick`  | `() => void`                          | —           | 点击回调       |

**示例**：

```tsx
import Button from '@/components/button';

<Button variant="primary" loading={isLoading} onClick={handleSubmit}>
  提交
</Button>;
```

---

### Modal

**路径**：`src/components/modal/index.tsx`（或 `popup-fix/index.tsx`）

**用途**：项目通用弹窗组件，封装了 iOS 滚动穿透修复。

**Props**：

| Prop       | 类型              | 默认值 | 说明                 |
| ---------- | ----------------- | ------ | -------------------- |
| `visible`  | `boolean`         | —      | 弹窗显示状态（受控） |
| `title`    | `string`          | —      | 弹窗标题             |
| `onClose`  | `() => void`      | —      | 关闭回调             |
| `children` | `React.ReactNode` | —      | 弹窗内容             |
| `footer`   | `React.ReactNode` | —      | 底部按钮区域         |

**示例**：

```tsx
import Modal from '@/components/modal';

const [visible, setVisible] = useState(false);

<Modal visible={visible} title="确认操作" onClose={() => setVisible(false)}>
  <p>确定要执行此操作吗？</p>
</Modal>;
```

---

## 表单 / 输入

### Input

**路径**：`src/components/input/index.tsx`

**用途**：[组件用途描述]

**Props**：

| Prop          | 类型                      | 默认值 | 说明           |
| ------------- | ------------------------- | ------ | -------------- |
| `value`       | `string`                  | —      | 输入值（受控） |
| `placeholder` | `string`                  | —      | 占位文本       |
| `onChange`    | `(value: string) => void` | —      | 值变化回调     |
| `maxLength`   | `number`                  | —      | 最大字符数     |

**示例**：

```tsx
import Input from '@/components/input';

const [value, setValue] = useState('');

<Input
  value={value}
  placeholder="请输入..."
  onChange={setValue}
  maxLength={100}
/>;
```

---

## 布局

### Page

**路径**：`src/components/page/index.tsx`

**用途**：页面容器组件，统一处理顶部安全区、底部导航栏等布局。

**Props**：

| Prop        | 类型              | 默认值 | 说明                    |
| ----------- | ----------------- | ------ | ----------------------- |
| `title`     | `string`          | —      | 页面标题（用于 NavBar） |
| `showNav`   | `boolean`         | `true` | 是否显示顶部导航        |
| `className` | `string`          | —      | 额外 class 名           |
| `children`  | `React.ReactNode` | —      | 页面内容                |

**示例**：

```tsx
import Page from '@/components/page';

const MyPage = () => (
  <Page title="我的页面">
    <div>页面内容</div>
  </Page>
);
```

---

## 业务组件

### [BusinessComponentName]

**路径**：`src/components/[component-dir]/index.tsx`

**用途**：[业务组件用途，如：商品渲染器，渲染商品卡片、价格、规格信息]

**Props**：

| Prop      | 类型     | 默认值      | 说明   |
| --------- | -------- | ----------- | ------ |
| `[prop1]` | `[type]` | `[default]` | [说明] |
| `[prop2]` | `[type]` | —           | [说明] |

**示例**：

```tsx
import [ComponentName] from '@/components/[component-dir]';

<[ComponentName]
  [prop1]={value1}
  [prop2]={value2}
/>
```

---

## 📎 拆分模式：总索引格式（组件数 > 15 时使用）

> 以下为 `components.md` 在拆分模式下的写法。Props 详情移至各分类文件，本文件只保留一行简介 + 跳转链接。

```markdown
# 公共组件文档（总索引）

> Props 详情见各分类文件：
>
> - [通用 UI](./components-ui.md)
> - [表单 / 输入](./components-form.md)
> - [布局](./components-layout.md)
> - [业务组件](./components-business.md)

## 通用 UI → [详情见 components-ui.md](./components-ui.md)

| 组件名 | 路径                     | 用途                            |
| ------ | ------------------------ | ------------------------------- |
| Button | `src/components/button/` | 项目通用按钮，统一样式和加载态  |
| Modal  | `src/components/modal/`  | 通用弹窗，封装 iOS 滚动穿透修复 |

## 表单 / 输入 → [详情见 components-form.md](./components-form.md)

| 组件名 | 路径                    | 用途                       |
| ------ | ----------------------- | -------------------------- |
| Input  | `src/components/input/` | 受控输入框，支持 maxLength |

## 布局 → [详情见 components-layout.md](./components-layout.md)

| 组件名 | 路径                   | 用途                             |
| ------ | ---------------------- | -------------------------------- |
| Page   | `src/components/page/` | 页面容器，处理顶部安全区和导航栏 |

## 业务组件 → [详情见 components-business.md](./components-business.md)

| 组件名         | 路径                    | 用途         |
| -------------- | ----------------------- | ------------ |
| [BusinessComp] | `src/components/[dir]/` | [一句话用途] |
```
