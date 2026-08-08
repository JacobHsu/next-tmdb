# Next.js TMDB 影視平台

基於 Next.js 15 和 TMDB API 打造的現代化影視串流平台，提供電影、劇集瀏覽、預告片播放、收藏管理等功能。

**📊 [專案簡報 Presentation](https://jacobhsu.github.io/next-tmdb/)**

## ✨ 主要功能

- 🎬 **影視瀏覽** - 熱門電影與劇集展示（評分 > 6.6）
- 🔍 **智能搜尋** - TMDB API 整合搜尋
- 📺 **預告片播放** - YouTube 嵌入式播放器
- ❤️ **收藏管理** - 本地 localStorage 持久化
- 📊 **觀看記錄** - 自動追蹤播放進度
- 🎨 **深色模式** - 支援淺色/深色主題切換
- 📱 **響應式設計** - 完美適配手機、平板、桌面

## 🛠️ 技術棧

- **框架**: [Next.js 15.5.4](https://nextjs.org) (App Router)
- **UI 庫**: React 19.1.0
- **樣式**: [Tailwind CSS 4](https://tailwindcss.com)
- **語言**: TypeScript 5
- **圖標**: [Lucide React](https://lucide.dev)
- **主題**: [next-themes](https://github.com/pacocoursey/next-themes)
- **提示**: [SweetAlert2](https://sweetalert2.github.io)

## 🚀 快速開始

### 安裝依賴

```bash
pnpm install
```

### 運行開發伺服器

```bash
pnpm dev
```

開啟 [http://localhost:3000](http://localhost:3000) 查看應用。

### 建置生產版本

```bash
pnpm build
pnpm start
```

## 📁 專案結構

```
src/
├── app/                    # Next.js App Router 頁面
│   ├── page.tsx           # 首頁（熱門電影/劇集）
│   ├── search/            # 搜尋頁面
│   ├── tmdb/              # TMDB 列表頁
│   └── trailer/           # 預告片播放頁
├── components/            # React 元件
│   ├── VideoCard.tsx      # 影片卡片
│   ├── ScrollableRow.tsx  # 橫向滾動容器
│   ├── PageLayout.tsx     # 頁面佈局
│   └── ...
└── lib/                   # 工具函數與 API
    ├── db.client.ts       # localStorage 資料管理
    ├── tmdb.client.ts     # TMDB API 客戶端
    └── types.ts           # TypeScript 型別定義
```

## 🎯 核心特性

### 資料管理
- **混合快取策略** - 記憶體 + localStorage 雙層快取
- **版本控制** - 快取版本管理與自動過期（1小時）
- **事件驅動** - CustomEvent 實現元件間資料同步

### 效能優化
- **Promise.all 並行請求** - 減少載入時間 50%+
- **骨架屏載入** - 優化使用者等待體驗
- **動態載入** - Code Splitting 減少初始包大小

### 使用者體驗
- **深色模式** - 自動偵測系統偏好
- **響應式設計** - Mobile First 設計理念
- **無障礙支援** - 語意化 HTML 與鍵盤導航

## 🗂️ 資料來源與新增年度片單

本專案**沒有本地資料檔**，所有影視資料皆即時透過 [TMDB API](https://www.themoviedb.org/documentation/api) 取得。年份資料有兩種來源：

| 來源 | 說明 | 設定位置 |
|------|------|----------|
| **首頁熱門**（自動） | 用 TMDB Discover API 依年份自動抓取當年熱門電影/劇集 | `src/app/page.tsx`（`type: '2025'`） |
| **年度私推**（個人清單） | 使用你在 TMDB 網站上手動建立的片單，透過 list ID 對應 | `src/app/tmdb/page.tsx`（`listIdMap`） |

### 如何新增某一年度的片單（以 2026 為例）

**步驟 1：在 TMDB 網站建立清單**

1. 登入 [themoviedb.org](https://www.themoviedb.org)
2. 分別建立「2026 電影」與「2026 劇集」兩個清單（List），加入想推薦的影片
3. 進入清單頁面，網址類似 `https://www.themoviedb.org/list/8559774`，最後的數字 `8559774` 就是 **list ID**，記下電影與劇集各自的 ID

**步驟 2：加入 `listIdMap`**

編輯 `src/app/tmdb/page.tsx`，在兩個 `listIdMap` 各加一行（放在最上面，維持由新到舊）：

```ts
type === 'movie'
  ? {
      '2026': '你的電影清單ID',   // ← 新增
      '2025': '8559774',
      // ...
    }
  : {
      '2026': '你的劇集清單ID',   // ← 新增
      '2025': '8560350',
      // ...
    };
```

**步驟 3：加入年份選擇器選項**

編輯 `src/components/TMDbSelector.tsx`，在 `movieSecondaryOptions` 與 `tvSecondaryOptions` 各加一行（放在最上面）：

```ts
const movieSecondaryOptions: SelectorOption[] = [
  { label: '2026', value: '2026' },   // ← 新增
  { label: '2025', value: '2025' },
  // ...
];
```

**步驟 4（可選）：設為預設年份**

若要讓頁面預設顯示 2026，將以下位置的 `'2025'` 改為 `'2026'`：
- `src/app/tmdb/page.tsx`：預設 `secondarySelection`（第 34、35、188、191 行）
- `src/app/page.tsx`：首頁 `type: '2025'`（第 73、79 行）

> 💡 個人清單（年度私推）不支援分頁，一次載入整份清單；首頁熱門與年度高分則透過 Discover API 依年份查詢。

## 📚 API 文檔

本專案使用 [TMDB API](https://www.themoviedb.org/documentation/api)，主要端點：

- `/api/tmdb/categories` - 獲取分類影片列表
- `/api/tmdb/videos` - 獲取影片預告片資訊

## 🎓 學習資源

- [Next.js 文檔](https://nextjs.org/docs)
- [React 19 文檔](https://react.dev)
- [Tailwind CSS 文檔](https://tailwindcss.com/docs)
- [TMDB API 文檔](https://developer.themoviedb.org/docs)

## 📄 授權

MIT License
