# Hackimi

无畏契约（VALORANT）个人名片，纯静态站点：只用 HTML / CSS / JS，零依赖、零构建。所有内容集中在 `data.js`，`app.js` 负责渲染，`style.css` 负责 Apple 极简风格。

- 线上：GitHub Pages + 自定义域名 `hackimi.cn`
- 无打包、无框架、无第三方库
- 数据与视图分离：改 `data.js` 即可更新页面

## 目录

- [特性](#特性)
- [快速开始](#快速开始)
- [目录结构](#目录结构)
- [数据配置](#数据配置)
- [渲染流程](#渲染流程)
- [关键实现](#关键实现)
- [样式与主题](#样式与主题)
- [响应式](#响应式)
- [部署](#部署)
- [兼容性与注意事项](#兼容性与注意事项)
- [常见问题](#常见问题)
- [维护清单](#维护清单)

## 特性

- **头部资料**：头像、名字、`#id`（等宽字体）、历史最高段位、游戏总时长
- **擅长英雄**：英雄图 + 角色定位，卡片背景自动从英雄图片取色
- **皮肤橱窗**：喜欢的皮肤列表，按等级自动匹配图标
- **卡面收藏**：图片按原比例展示，底部裁成圆角倒三角并渐变到黑
- **主题**：Apple 极简风格，自动跟随系统浅色 / 深色模式，无任何动画
- **响应式**：桌面 / 平板 / 手机三档，适配刘海屏安全区
- **动态图标**：Favicon 由头像裁成圆形生成，标题为 `名字 #id`
- **健壮性**：图片为空或加载失败自动回退占位图；文字溢出用渐变淡出而非省略号

## 快速开始

```bash
# 本地预览（浏览器打开 http://localhost:8000）
python3 -m http.server
```

任何静态服务器都可以，不需要安装依赖或构建。

## 目录结构

```
.
├── index.html      # 页面结构（头部 + 三个区块 + 页脚）
├── style.css       # 样式：主题变量、布局、响应式
├── app.js          # 渲染逻辑：占位图、取色、裁剪、溢出处理
├── data.js         # 个人数据（主要维护文件）
├── CNAME           # 自定义域名 → hackimi.cn
├── .nojekyll       # 关闭 GitHub Pages 的 Jekyll 处理
├── ads.txt         # 广告配置
└── README.md
```

## 数据配置

全部数据在 `data.js` 的 `PROFILE` 对象中，保存后刷新页面即可生效。

```js
const PROFILE = {
  avatar: "头像图片 URL",
  name: "昵称",
  tag: "82068",              // 显示为 #82068
  bio: "已废弃字段（页面不再显示，可删）",
  playTime: "1200 h",

  peakRank: {
    name: "黄金 III",
    image: "段位图标 URL"
  },

  agents: [
    { name: "暮蝶", role: "控场", image: "英雄图片 URL" }
  ],

  skinTiers: {
    "终极": "图标 URL",
    "传奇": "图标 URL",
    "卓越": "图标 URL"
  },

  favoriteSkins: [
    { name: "奇点 // 2.0 蝴蝶刀", weapon: "近战", tier: "卓越", image: "皮肤图片 URL" }
  ],

  cards: [
    { name: "VCT 25 x TH", image: "卡面图片 URL" }
  ],

  showcase: [
    // 备用区块，当前在 index.html 中被 hidden 隐藏
    { name: "2023 冠军之刃", weapon: "近战", rarity: "限定", image: "URL" }
  ]
};
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `avatar` | string | 否 | 头像 URL。为空时用名字生成占位图；Favicon 也取自这里 |
| `name` | string | 是 | 昵称，同时用于页面标题与 Favicon 占位 |
| `tag` | string \| number | 否 | 显示为 `#tag`，为空显示 `#0000` |
| `bio` | string | 否 | 已废弃：页面不再渲染该字段 |
| `playTime` | string | 否 | 游戏总时长，任意文本，如 `1200 h` |
| `peakRank.name` | string | 否 | 段位名称，为空显示「暂无段位」 |
| `peakRank.image` | string | 否 | 段位图标 URL |
| `agents[].name` | string | 是 | 英雄名 |
| `agents[].role` | string | 否 | 角色定位，显示在卡片左下角 |
| `agents[].image` | string | 否 | 英雄图 URL，建议竖版 |
| `skinTiers` | object | 否 | 等级 → 图标 URL 映射 |
| `favoriteSkins[].name` | string | 是 | 皮肤名 |
| `favoriteSkins[].weapon` | string | 否 | 武器类型，显示在名字右侧 |
| `favoriteSkins[].tier` | string | 否 | 必须对应 `skinTiers` 的键，用于取图标 |
| `favoriteSkins[].image` | string | 否 | 皮肤图 URL，建议横向长图 |
| `cards[].name` | string | 是 | 卡面名，显示在三角上方 |
| `cards[].image` | string | 否 | 卡面图 URL，建议竖版 |
| `showcase[]` | array | 否 | 备用数据，区块默认隐藏 |

### 各区块布局要点

- **擅长英雄**：图建议 `3:4` 竖版，右上角显示名字，左下角显示 role。
- **皮肤橱窗**：图建议 `512×150` 左右横版，名字前显示 `tier` 图标，右侧显示武器。
- **卡面收藏**：图建议竖版；名字叠在图片下部的三角上方。

## 渲染流程

`app.js` 是一个 IIFE，入口是 `DOMContentLoaded` 时调用的 `render()`：

```
render()
├── renderHeader()        头部：头像、名字/#id、段位、时长、标题、Favicon
├── renderAgents()        擅长英雄（含 applyAgentTint 取色）
├── renderFavoriteSkins() 皮肤橱窗（含 skinTiers 图标）
├── renderCards()         卡面收藏（含 applyCardClip 裁剪、applyCaptionTone 取色）
├── renderShowcase()      隐藏的备用橱窗
└── updateOverflowFades() 文字溢出淡出（并监听 resize / 字体加载）
```

辅助函数一览：

| 函数 | 作用 |
| --- | --- |
| `el(tag, className, text)` | 创建元素的小工具 |
| `byId(id)` | `document.getElementById` 简写 |
| `placeholderImage(label, shape)` | 生成 SVG 占位图（data URI） |
| `setImage(node, url, label, shape)` | 设置图片并在失败时回退占位图 |
| `makeImage(url, label, className, eager, shape, cors)` | 创建 `<img>` |
| `setFavicon` / `setCircularFavicon` | 设置普通 / 圆形 Favicon |
| `rgbToHsl` / `hslToRgb` / `hueToRgb` | HSL ↔ RGB 转换 |
| `prefersDark()` | 当前是否为深色模式 |
| `applyAgentTint(card, image)` | 英雄卡背景取色 |
| `roundedArrowPath(w, h, radius)` | 生成圆角倒三角的 SVG path |
| `applyCardClip(media, image)` | 卡面裁剪 + 渐变变量 |
| `applyCaptionTone(media, image, caption)` | 卡面文字对比度取色 |
| `updateOverflowFades()` | 溢出文字淡化 |

## 关键实现

### 占位图

`placeholderImage()` 按 `SHAPES` 里预设的尺寸生成内联 SVG：

| shape | 尺寸 | 用途 |
| --- | --- | --- |
| `square` | 400×400 | 头像、段位、等级图标 |
| `agent` | 440×400 | 英雄 |
| `wide` | 512×150 | 皮肤 |
| `card` | 268×640 | 卡面 |

占位图背景色区分深浅模式（浅色 `#e8e8ed`，深色 `#2c2c2e`），并显示名称首字符。

### 图片回退

`setImage()` 在 `onerror` 时把 `src` 换成占位图；留空则直接使用占位图，因此任何一张图缺失都不会破版。

### 圆形 Favicon

`setCircularFavicon()` 用 canvas 把头像按圆形裁剪后导出 PNG data URI：

1. `new Image()` 并设置 `crossOrigin="anonymous"`（头像源站需允许 CORS）
2. `ctx.clip()` 出圆形，`drawImage` 到 64×64 画布
3. `canvas.toDataURL("image/png")` 写入 `<link rel="icon">`

任何一步失败（无头像、无 CORS、非浏览器环境）都会回退为直接用头像或占位图。

### 英雄卡取色

`applyAgentTint()`：

1. 把英雄图画到 16×16 的 canvas，读取像素
2. 忽略 `alpha < 160` 的像素，求剩余像素平均 RGB
3. 平均色转 HSL，固定明度、限制饱和度：
   - 浅色模式：`L = 0.72`
   - 深色模式：`L = 0.24`
   - `S = clamp(S, 0.35, 0.8)`，色相保持不变
4. 计算背景亮度，亮度 `> 0.42` 用深色字，否则用白字
5. 监听 `prefers-color-scheme` 变化，切换系统主题时自动重算

远程图片必须允许 CORS（`access-control-allow-origin`），否则 canvas 被污染、取色会静默失败（回退为普通卡片底色）。

### 卡面形状

`roundedArrowPath()` 用几何计算生成底部倒三角、三个顶点带圆角的 SVG path，`applyCardClip()` 再把它设为 `clip-path: path(...)`：

- 底边 = 卡片宽度 `W`
- 三角高 = `W / 2`（顶点在底边中点正下方）
- 圆角半径 `r = min(12, W * 0.09)`
- 三个顶点（左右底角 + 尖角）用二次贝塞尔倒圆角

同时写入 `--card-fade`（三角底线位置）与 `--card-tri`（三角高度，px）两个 CSS 变量。三角区域用伪元素叠加从透明到黑的渐变：

```css
.card-media::after {
  background: linear-gradient(
    to bottom,
    transparent,
    transparent var(--card-fade),
    #000 100%
  );
}
```

窗口尺寸变化时通过 `ResizeObserver` 重新计算，保证任意宽度下都是等比例三角。

### 卡面文字对比度

`applyCaptionTone()` 在与名字同一水平带（三角底线上方约 10–31px）采样图片平均亮度：

- 亮度 `> 0.5`：文字用深色（`.cap-dark`）
- 否则：文字用白色（`.cap-light`）

采样失败（跨域等）时保持默认白色。

### 文字溢出淡出

`updateOverflowFades()` 遍历 `.skin-name`、`.card-caption`、`.showcase-name`，当 `scrollWidth > clientWidth` 时加 `.is-faded`：

- 皮肤名 / 橱窗名：右侧 24px 渐隐
- 卡面名字（居中）：左右各 16px 渐隐

在渲染后、`resize`、`document.fonts.ready` 时都会重新判断，只有真正溢出的文字才淡化。

## 样式与主题

主题变量集中在 `style.css` 顶部：

| 变量 | 浅色 | 深色 | 用途 |
| --- | --- | --- | --- |
| `--bg` | `#f5f5f7` | `#000000` | 页面背景 |
| `--surface` | `#ffffff` | `#1d1d1f` | 卡片背景 |
| `--text` | `#1d1d1f` | `#f5f5f7` | 主文字 |
| `--text-secondary` | `#6e6e73` | `#86868b` | 次要文字 |
| `--hairline` | `rgba(0,0,0,.08)` | `rgba(255,255,255,.12)` | 发丝线边框 |
| `--font` | 系统字体栈 | 同左 | 字体 |

约定：

- 全站无 `transition` / `animation`，只有链接 hover 会变下划线并变纯黑 / 纯白
- 页面容器最大宽度 `980px`，横向内边距使用 `env(safe-area-inset-*)` 适配刘海屏
- 卡片统一圆角 `16px`，间距 `16px`
- 皮肤卡背景为 `#161616`，卡面容器透明

## 响应式

断点：`720px`（平板）、`560px`（手机）、`480px`（小屏）。

| 区块 | 桌面 | ≤720 | ≤560 | ≤480 |
| --- | --- | --- | --- | --- |
| 头部 | 头像+资料左，数据右 | 间距缩小 | 单行两端分布 | 更紧凑、头像 52px |
| 擅长英雄 | 4 列 | 间距 12 | 2 列 | — |
| 皮肤橱窗 | 3 列 | 间距 12 | 2 列 | 名字 13px |
| 卡面收藏 | 6 列 | 间距 12 | 3 列 | — |
| 名字 | 32px | — | 19px | 18px |
| `#id` | 18px | 16px | 14px | 13px |

## 社交卡片图（OG Image）

`og.html` + `scripts/og.mjs` 用于生成分享到 Twitter/X 等平台时的预览图：

```bash
node scripts/og.mjs
```

- 用无头 Chrome 把 `og.html` 截成 `og.png`（1200×630，2 倍图 2400×1260）
- 同时把 `data.js` 里的名字、`#id`、段位、时长写进 `index.html` 的 og / twitter meta
- 需要本机装有 Chrome / Chromium，也可用 `CHROME=/path/to/chrome node scripts/og.mjs` 指定

改完 `data.js` 后重新执行一次，提交 `og.png`（和更新后的 `index.html`）即可。

## 部署

仓库已配置 GitHub Pages + 自定义域名，推送到 `main` 即自动构建：

- `CNAME`：`hackimi.cn`
- `.nojekyll`：跳过 Jekyll
- 无需构建命令、无需环境变量

## 兼容性与注意事项

- 需要支持 `clip-path: path()`、CSS 变量、`prefers-color-scheme`、`ResizeObserver` 的现代浏览器
- 英雄取色、卡面文字取色依赖图片允许 CORS；不允许时功能自动降级，页面不受影响
- 禁用 JS 时页面仍会显示静态兜底样式，只是不会有取色、占位回退与动态标题

## 常见问题

**图片显示成占位图？**
检查 URL 是否可访问；跨域资源若不允许 CORS，取色类功能会失效但图片本身仍可显示。

**英雄卡背景没有颜色？**
图片未允许 CORS 导致 canvas 取色失败，换用允许 CORS 的图源即可（如 `c-valorant-api.op.gg`）。

**卡面底部三角比例不对？**
三角由图片渲染尺寸动态计算（底边=卡片宽、高=半宽），若图片比例极端会在加载后自动重算。

**想要省略号而不是淡出？**
改 `style.css` 中 `.is-faded` 的 `mask-image` 为 `text-overflow: ellipsis` 即可。

## 维护清单

- 新增一个英雄：在 `agents` 里加 `{ name, role, image }`
- 新增一张皮肤：在 `favoriteSkins` 里加 `{ name, weapon, tier, image }`，`tier` 用 `skinTiers` 已有的键
- 新增一个等级图标：在 `skinTiers` 里加 `"等级名": "图标 URL"`
- 新增一张卡面：在 `cards` 里加 `{ name, image }`
- 换主题色：改 `style.css` 顶部的变量即可
- 调整列数 / 间距：改对应网格的 `grid-template-columns` 与 `gap`

## 致谢

- 数据与图片来自公开的 VALORANT 资源接口
- 页面由 [hackdeacon](https://x.com/hackdeacon) 设计
