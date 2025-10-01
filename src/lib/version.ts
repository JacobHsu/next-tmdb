/* eslint-disable no-console */

'use client';

const CURRENT_VERSION = '20251001115030';

// 版本檢查結果列舉
export enum UpdateStatus {
  HAS_UPDATE = 'has_update', // 有新版本
  NO_UPDATE = 'no_update', // 無新版本
  FETCH_FAILED = 'fetch_failed', // 獲取失敗
}

// 遠端版本檢查 URL 設定
// 如需啟用版本檢查，請替換為你自己的 GitHub 倉庫路徑
const VERSION_CHECK_URLS: string[] = [
  // 'https://raw.githubusercontent.com/your-username/your-repo/main/VERSION.txt',
];

/**
 * 檢查是否有新版本可用
 * @returns Promise<UpdateStatus> - 返回版本檢查狀態
 */
export async function checkForUpdates(): Promise<UpdateStatus> {
  // 在開發環境中禁用版本檢查
  if (process.env.NODE_ENV === 'development') {
    return UpdateStatus.NO_UPDATE;
  }

  try {
    // 如果未配置 URL，直接返回無更新
    if (VERSION_CHECK_URLS.length === 0) {
      return UpdateStatus.NO_UPDATE;
    }

    // 嘗試從配置的 URL 獲取版本資訊
    for (const url of VERSION_CHECK_URLS) {
      const version = await fetchVersionFromUrl(url);
      if (version) {
        return compareVersions(version);
      }
    }

    // 如果所有 URL 都失敗，返回獲取失敗狀態
    return UpdateStatus.FETCH_FAILED;
  } catch (error) {
    console.error('版本檢查失敗:', error);
    return UpdateStatus.FETCH_FAILED;
  }
}

/**
 * 從指定 URL 獲取版本資訊
 * @param url - 版本資訊 URL
 * @returns Promise<string | null> - 版本字串或 null
 */
async function fetchVersionFromUrl(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 秒逾時

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'text/plain',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const version = await response.text();
    return version.trim();
  } catch (error) {
    console.warn(`從 ${url} 獲取版本資訊失敗:`, error);
    return null;
  }
}

/**
 * 比較版本號
 * @param remoteVersion - 遠端版本號
 * @returns UpdateStatus - 返回版本比較結果
 */
function compareVersions(remoteVersion: string): UpdateStatus {
  try {
    // 將版本號轉換為數字進行比較
    const current = parseInt(CURRENT_VERSION, 10);
    const remote = parseInt(remoteVersion, 10);

    return remote > current ? UpdateStatus.HAS_UPDATE : UpdateStatus.NO_UPDATE;
  } catch (error) {
    console.error('版本比較失敗:', error);
    return UpdateStatus.FETCH_FAILED;
  }
}

// 匯出目前版本號供其他地方使用
export { CURRENT_VERSION };
