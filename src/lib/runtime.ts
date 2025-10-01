// 該檔案由 scripts/convert-config.js 自動生成，請勿手動修改
// 注意: 影片來源配置已移除，現在只處理快取時間
/* eslint-disable */

export const config = {
  "cache_time": 7200
} as const;

export type RuntimeConfig = typeof config;

export default config;
