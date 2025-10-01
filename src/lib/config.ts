/* eslint-disable no-console */

/**
 * 配置管理模組
 *
 * 此專案使用 LocalStorage 模式，配置主要來自環境變數和 runtime.ts
 * 不需要複雜的資料庫配置管理
 */

import { AdminConfig } from './admin.types';
import runtimeConfig from './runtime';

interface ConfigFileStruct {
  cache_time?: number;
}

// 在模組載入時根據環境決定配置來源
let fileConfig: ConfigFileStruct;
let cachedConfig: AdminConfig;

async function initConfig() {
  if (cachedConfig) {
    return;
  }

  if (process.env.DOCKER_ENV === 'true') {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const _require = eval('require') as NodeRequire;
    const fs = _require('fs') as typeof import('fs');
    const path = _require('path') as typeof import('path');

    const configPath = path.join(process.cwd(), 'config.json');
    const raw = fs.readFileSync(configPath, 'utf-8');
    fileConfig = JSON.parse(raw) as ConfigFileStruct;
    console.log('load dynamic config success');
  } else {
    // 預設使用編譯時生成的配置
    fileConfig = runtimeConfig as unknown as ConfigFileStruct;
  }

  // LocalStorage 模式：直接使用環境變數配置
  cachedConfig = {
    SiteConfig: {
      SiteName: process.env.SITE_NAME || 'TMDB',
      Announcement:
        process.env.ANNOUNCEMENT ||
        '本網站僅提供影視資訊搜尋服務，所有內容均來自第三方網站。本站不存儲任何影片資源，不對任何內容的準確性、合法性、完整性負責。',
      SearchDownstreamMaxPage:
        Number(process.env.NEXT_PUBLIC_SEARCH_MAX_PAGE) || 5,
      SiteInterfaceCacheTime: fileConfig.cache_time || 7200,
      ImageProxy: process.env.NEXT_PUBLIC_IMAGE_PROXY || '',
    },
    UserConfig: {
      AllowRegister: process.env.NEXT_PUBLIC_ENABLE_REGISTER === 'true',
      Users: [],
    },
  } as AdminConfig;
}

export async function getConfig(): Promise<AdminConfig> {
  await initConfig();
  return cachedConfig;
}

export async function resetConfig() {
  // LocalStorage 模式：重置為預設配置
  if (process.env.DOCKER_ENV === 'true') {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const _require = eval('require') as NodeRequire;
    const fs = _require('fs') as typeof import('fs');
    const path = _require('path') as typeof import('path');

    const configPath = path.join(process.cwd(), 'config.json');
    const raw = fs.readFileSync(configPath, 'utf-8');
    fileConfig = JSON.parse(raw) as ConfigFileStruct;
    console.log('load dynamic config success');
  } else {
    // 預設使用編譯時生成的配置
    fileConfig = runtimeConfig as unknown as ConfigFileStruct;
  }

  const adminConfig = {
    SiteConfig: {
      SiteName: process.env.SITE_NAME || 'TMDB',
      Announcement:
        process.env.ANNOUNCEMENT ||
        '本網站僅提供影視資訊搜尋服務，所有內容均來自第三方網站。本站不存儲任何影片資源，不對任何內容的準確性、合法性、完整性負責。',
      SearchDownstreamMaxPage:
        Number(process.env.NEXT_PUBLIC_SEARCH_MAX_PAGE) || 5,
      SiteInterfaceCacheTime: fileConfig.cache_time || 7200,
      ImageProxy: process.env.NEXT_PUBLIC_IMAGE_PROXY || '',
    },
    UserConfig: {
      AllowRegister: process.env.NEXT_PUBLIC_ENABLE_REGISTER === 'true',
      Users: [],
    },
  } as AdminConfig;

  cachedConfig = adminConfig;
}

export async function getCacheTime(): Promise<number> {
  const config = await getConfig();
  return config.SiteConfig.SiteInterfaceCacheTime || 7200;
}
