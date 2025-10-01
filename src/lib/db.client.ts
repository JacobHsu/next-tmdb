/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-function */
'use client';

/**
 * 僅在瀏覽器端使用的資料庫工具，目前基於 localStorage 實現。
 * 之所以單獨拆分檔案，是為了避免在客戶端 bundle 中引入 `fs`, `path` 等 Node.js 內建模組，
 * 從而解決諸如 "Module not found: Can't resolve 'fs'" 的問題。
 *
 * 功能：
 * 1. 獲取全部播放記錄（getAllPlayRecords）。
 * 2. 儲存播放記錄（savePlayRecord）。
 * 3. 資料庫儲存模式下的混合快取策略，提升使用者體驗。
 *
 * 如後續需要在客戶端讀取收藏等其它資料，可按同樣方式在此檔案中補充實現。
 */

import { getAuthInfoFromBrowserCookie } from './auth';

// ---- 類型 ----
export interface PlayRecord {
  title: string;
  source_name: string;
  year: string;
  cover: string;
  index: number; // 第幾集
  total_episodes: number; // 總集數
  play_time: number; // 播放進度（秒）
  total_time: number; // 總進度（秒）
  save_time: number; // 記錄儲存時間（時間戳）
  search_title?: string; // 搜尋時使用的標題
}

// ---- 收藏類型 ----
export interface Favorite {
  title: string;
  source_name: string;
  year: string;
  cover: string;
  total_episodes: number;
  save_time: number;
  search_title?: string;
}

// ---- 快取資料結構 ----
interface CacheData<T> {
  data: T;
  timestamp: number;
  version: string;
}

interface UserCacheStore {
  playRecords?: CacheData<Record<string, PlayRecord>>;
  favorites?: CacheData<Record<string, Favorite>>;
  searchHistory?: CacheData<string[]>;
}

// ---- 常量 ----
const PLAY_RECORDS_KEY = 'moontv_play_records';
const FAVORITES_KEY = 'moontv_favorites';
const SEARCH_HISTORY_KEY = 'moontv_search_history';

// 快取相關常量
const CACHE_PREFIX = 'moontv_cache_';
const CACHE_VERSION = '1.0.0';
const CACHE_EXPIRE_TIME = 60 * 60 * 1000; // 一小時快取過期

// ---- 環境變數 ----
const STORAGE_TYPE = (() => {
  const raw =
    (typeof window !== 'undefined' &&
      (window as any).RUNTIME_CONFIG?.STORAGE_TYPE) ||
    (process.env.STORAGE_TYPE as
      | 'localstorage'
      | 'redis'
      | 'd1'
      | 'upstash'
      | undefined) ||
    'localstorage';
  return raw;
})();

// ---------------- 搜尋歷史相關常量 ----------------
// 搜尋歷史最大儲存條數
const SEARCH_HISTORY_LIMIT = 20;

// ---- 快取管理器 ----
class HybridCacheManager {
  private static instance: HybridCacheManager;

  static getInstance(): HybridCacheManager {
    if (!HybridCacheManager.instance) {
      HybridCacheManager.instance = new HybridCacheManager();
    }
    return HybridCacheManager.instance;
  }

  /**
   * 獲取當前使用者名稱
   */
  private getCurrentUsername(): string | null {
    const authInfo = getAuthInfoFromBrowserCookie();
    return authInfo?.username || null;
  }

  /**
   * 產生使用者專屬的快取key
   */
  private getUserCacheKey(username: string): string {
    return `${CACHE_PREFIX}${username}`;
  }

  /**
   * 獲取使用者快取資料
   */
  private getUserCache(username: string): UserCacheStore {
    if (typeof window === 'undefined') return {};

    try {
      const cacheKey = this.getUserCacheKey(username);
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.warn('獲取使用者快取失敗:', error);
      return {};
    }
  }

  /**
   * 儲存使用者快取資料
   */
  private saveUserCache(username: string, cache: UserCacheStore): void {
    if (typeof window === 'undefined') return;

    try {
      const cacheKey = this.getUserCacheKey(username);
      localStorage.setItem(cacheKey, JSON.stringify(cache));
    } catch (error) {
      console.warn('儲存使用者快取失敗:', error);
    }
  }

  /**
   * 檢查快取是否有效
   */
  private isCacheValid<T>(cache: CacheData<T>): boolean {
    const now = Date.now();
    return (
      cache.version === CACHE_VERSION &&
      now - cache.timestamp < CACHE_EXPIRE_TIME
    );
  }

  /**
   * 建立快取資料
   */
  private createCacheData<T>(data: T): CacheData<T> {
    return {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };
  }

  /**
   * 獲取快取的播放記錄
   */
  getCachedPlayRecords(): Record<string, PlayRecord> | null {
    const username = this.getCurrentUsername();
    if (!username) return null;

    const userCache = this.getUserCache(username);
    const cached = userCache.playRecords;

    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    return null;
  }

  /**
   * 快取播放記錄
   */
  cachePlayRecords(data: Record<string, PlayRecord>): void {
    const username = this.getCurrentUsername();
    if (!username) return;

    const userCache = this.getUserCache(username);
    userCache.playRecords = this.createCacheData(data);
    this.saveUserCache(username, userCache);
  }

  /**
   * 獲取快取的收藏
   */
  getCachedFavorites(): Record<string, Favorite> | null {
    const username = this.getCurrentUsername();
    if (!username) return null;

    const userCache = this.getUserCache(username);
    const cached = userCache.favorites;

    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    return null;
  }

  /**
   * 快取收藏
   */
  cacheFavorites(data: Record<string, Favorite>): void {
    const username = this.getCurrentUsername();
    if (!username) return;

    const userCache = this.getUserCache(username);
    userCache.favorites = this.createCacheData(data);
    this.saveUserCache(username, userCache);
  }

  /**
   * 獲取快取的搜尋歷史
   */
  getCachedSearchHistory(): string[] | null {
    const username = this.getCurrentUsername();
    if (!username) return null;

    const userCache = this.getUserCache(username);
    const cached = userCache.searchHistory;

    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    return null;
  }

  /**
   * 快取搜尋歷史
   */
  cacheSearchHistory(data: string[]): void {
    const username = this.getCurrentUsername();
    if (!username) return;

    const userCache = this.getUserCache(username);
    userCache.searchHistory = this.createCacheData(data);
    this.saveUserCache(username, userCache);
  }

  /**
   * 清除指定使用者的所有快取
   */
  clearUserCache(username?: string): void {
    const targetUsername = username || this.getCurrentUsername();
    if (!targetUsername) return;

    try {
      const cacheKey = this.getUserCacheKey(targetUsername);
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.warn('清除使用者快取失敗:', error);
    }
  }

  /**
   * 清除所有過期快取
   */
  clearExpiredCaches(): void {
    if (typeof window === 'undefined') return;

    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) {
          try {
            const cache = JSON.parse(localStorage.getItem(key) || '{}');
            // 檢查是否有任何快取資料過期
            let hasValidData = false;
            for (const [, cacheData] of Object.entries(cache)) {
              if (cacheData && this.isCacheValid(cacheData as CacheData<any>)) {
                hasValidData = true;
                break;
              }
            }
            if (!hasValidData) {
              keysToRemove.push(key);
            }
          } catch {
            // 解析失敗的快取也刪除
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.warn('清除過期快取失敗:', error);
    }
  }
}

// 獲取快取管理器實例
const cacheManager = HybridCacheManager.getInstance();

// ---- 錯誤處理輔助函數 ----
/**
 * 資料庫操作失敗時的通用錯誤處理
 * 立即從資料庫重新整理對應類型的快取以保持資料一致性
 */
async function handleDatabaseOperationFailure(
  dataType: 'playRecords' | 'favorites' | 'searchHistory',
  error: any
): Promise<void> {
  console.error(`資料庫操作失敗 (${dataType}):`, error);

  try {
    let freshData: any;
    let eventName: string;

    switch (dataType) {
      case 'playRecords':
        freshData = await fetchFromApi<Record<string, PlayRecord>>(
          `/api/playrecords`
        );
        cacheManager.cachePlayRecords(freshData);
        eventName = 'playRecordsUpdated';
        break;
      case 'favorites':
        freshData = await fetchFromApi<Record<string, Favorite>>(
          `/api/favorites`
        );
        cacheManager.cacheFavorites(freshData);
        eventName = 'favoritesUpdated';
        break;
      case 'searchHistory':
        freshData = await fetchFromApi<string[]>(`/api/searchhistory`);
        cacheManager.cacheSearchHistory(freshData);
        eventName = 'searchHistoryUpdated';
        break;
    }

    // 觸發更新事件通知元件
    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: freshData,
      })
    );
  } catch (refreshErr) {
    console.error(`重新整理${dataType}快取失敗:`, refreshErr);
  }
}

// 頁面載入時清理過期快取
if (typeof window !== 'undefined') {
  setTimeout(() => cacheManager.clearExpiredCaches(), 1000);
}

// ---- 工具函數 ----
async function fetchFromApi<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`請求 ${path} 失敗: ${res.status}`);
  return (await res.json()) as T;
}

/**
 * 產生儲存key
 */
export function generateStorageKey(source: string, id: string): string {
  return `${source}+${id}`;
}

// ---- API ----
/**
 * 讀取全部播放記錄。
 * D1 儲存模式下使用混合快取策略：優先返回快取資料，後台非同步同步最新資料。
 * 在伺服器端渲染階段 (window === undefined) 時返回空物件，避免報錯。
 */
export async function getAllPlayRecords(): Promise<Record<string, PlayRecord>> {
  // 伺服器端渲染階段直接返回空，交由客戶端 useEffect 再行請求
  if (typeof window === 'undefined') {
    return {};
  }

  // 資料庫儲存模式：使用混合快取策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 優先從快取獲取資料
    const cachedData = cacheManager.getCachedPlayRecords();

    if (cachedData) {
      // 返回快取資料，同時後台非同步更新
      fetchFromApi<Record<string, PlayRecord>>(`/api/playrecords`)
        .then((freshData) => {
          // 只有資料真正不同時才更新快取
          if (JSON.stringify(cachedData) !== JSON.stringify(freshData)) {
            cacheManager.cachePlayRecords(freshData);
            // 觸發資料更新事件，供元件監聽
            window.dispatchEvent(
              new CustomEvent('playRecordsUpdated', {
                detail: freshData,
              })
            );
          }
        })
        .catch((err) => {
          console.warn('後台同步播放記錄失敗:', err);
        });

      return cachedData;
    } else {
      // 快取為空，直接從 API 獲取並快取
      try {
        const freshData = await fetchFromApi<Record<string, PlayRecord>>(
          `/api/playrecords`
        );
        cacheManager.cachePlayRecords(freshData);
        return freshData;
      } catch (err) {
        console.error('獲取播放記錄失敗:', err);
        return {};
      }
    }
  }

  // localstorage 模式
  try {
    const raw = localStorage.getItem(PLAY_RECORDS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, PlayRecord>;
  } catch (err) {
    console.error('讀取播放記錄失敗:', err);
    return {};
  }
}

/**
 * 儲存播放記錄。
 * 資料庫儲存模式下使用樂觀更新：先更新快取（立即生效），再非同步同步到資料庫。
 */
export async function savePlayRecord(
  source: string,
  id: string,
  record: PlayRecord
): Promise<void> {
  const key = generateStorageKey(source, id);

  // 資料庫儲存模式：樂觀更新策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 立即更新快取
    const cachedRecords = cacheManager.getCachedPlayRecords() || {};
    cachedRecords[key] = record;
    cacheManager.cachePlayRecords(cachedRecords);

    // 觸發立即更新事件
    window.dispatchEvent(
      new CustomEvent('playRecordsUpdated', {
        detail: cachedRecords,
      })
    );

    // 非同步同步到資料庫
    try {
      const res = await fetch('/api/playrecords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, record }),
      });

      if (!res.ok) {
        throw new Error(`儲存播放記錄失敗: ${res.status}`);
      }
    } catch (err) {
      await handleDatabaseOperationFailure('playRecords', err);
      throw err;
    }
    return;
  }

  // localstorage 模式
  if (typeof window === 'undefined') {
    console.warn('無法在伺服器端儲存播放記錄到 localStorage');
    return;
  }

  try {
    const allRecords = await getAllPlayRecords();
    allRecords[key] = record;
    localStorage.setItem(PLAY_RECORDS_KEY, JSON.stringify(allRecords));
    window.dispatchEvent(
      new CustomEvent('playRecordsUpdated', {
        detail: allRecords,
      })
    );
  } catch (err) {
    console.error('儲存播放記錄失敗:', err);
    throw err;
  }
}

/**
 * 刪除播放記錄。
 * 資料庫儲存模式下使用樂觀更新：先更新快取，再非同步同步到資料庫。
 */
export async function deletePlayRecord(
  source: string,
  id: string
): Promise<void> {
  const key = generateStorageKey(source, id);

  // 資料庫儲存模式：樂觀更新策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 立即更新快取
    const cachedRecords = cacheManager.getCachedPlayRecords() || {};
    delete cachedRecords[key];
    cacheManager.cachePlayRecords(cachedRecords);

    // 觸發立即更新事件
    window.dispatchEvent(
      new CustomEvent('playRecordsUpdated', {
        detail: cachedRecords,
      })
    );

    // 非同步同步到資料庫
    try {
      const res = await fetch(
        `/api/playrecords?key=${encodeURIComponent(key)}`,
        {
          method: 'DELETE',
        }
      );
      if (!res.ok) throw new Error(`刪除播放記錄失敗: ${res.status}`);
    } catch (err) {
      await handleDatabaseOperationFailure('playRecords', err);
      throw err;
    }
    return;
  }

  // localstorage 模式
  if (typeof window === 'undefined') {
    console.warn('無法在伺服器端刪除播放記錄到 localStorage');
    return;
  }

  try {
    const allRecords = await getAllPlayRecords();
    delete allRecords[key];
    localStorage.setItem(PLAY_RECORDS_KEY, JSON.stringify(allRecords));
    window.dispatchEvent(
      new CustomEvent('playRecordsUpdated', {
        detail: allRecords,
      })
    );
  } catch (err) {
    console.error('刪除播放記錄失敗:', err);
    throw err;
  }
}

/* ---------------- 搜尋歷史相關 API ---------------- */

/**
 * 獲取搜尋歷史。
 * 資料庫儲存模式下使用混合快取策略：優先返回快取資料，後台非同步同步最新資料。
 */
export async function getSearchHistory(): Promise<string[]> {
  // 伺服器端渲染階段直接返回空
  if (typeof window === 'undefined') {
    return [];
  }

  // 資料庫儲存模式：使用混合快取策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 優先從快取獲取資料
    const cachedData = cacheManager.getCachedSearchHistory();

    if (cachedData) {
      // 返回快取資料，同時後台非同步更新
      fetchFromApi<string[]>(`/api/searchhistory`)
        .then((freshData) => {
          // 只有資料真正不同時才更新快取
          if (JSON.stringify(cachedData) !== JSON.stringify(freshData)) {
            cacheManager.cacheSearchHistory(freshData);
            // 觸發資料更新事件
            window.dispatchEvent(
              new CustomEvent('searchHistoryUpdated', {
                detail: freshData,
              })
            );
          }
        })
        .catch((err) => {
          console.warn('後台同步搜尋歷史失敗:', err);
        });

      return cachedData;
    } else {
      // 快取為空，直接從 API 獲取並快取
      try {
        const freshData = await fetchFromApi<string[]>(`/api/searchhistory`);
        cacheManager.cacheSearchHistory(freshData);
        return freshData;
      } catch (err) {
        console.error('獲取搜尋歷史失敗:', err);
        return [];
      }
    }
  }

  // localStorage 模式
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as string[];
    // 僅返回字串陣列
    return Array.isArray(arr) ? arr : [];
  } catch (err) {
    console.error('讀取搜尋歷史失敗:', err);
    return [];
  }
}

/**
 * 將關鍵字新增到搜尋歷史。
 * 資料庫儲存模式下使用樂觀更新：先更新快取，再非同步同步到資料庫。
 */
export async function addSearchHistory(keyword: string): Promise<void> {
  const trimmed = keyword.trim();
  if (!trimmed) return;

  // 資料庫儲存模式：樂觀更新策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 立即更新快取
    const cachedHistory = cacheManager.getCachedSearchHistory() || [];
    const newHistory = [trimmed, ...cachedHistory.filter((k) => k !== trimmed)];
    // 限制長度
    if (newHistory.length > SEARCH_HISTORY_LIMIT) {
      newHistory.length = SEARCH_HISTORY_LIMIT;
    }
    cacheManager.cacheSearchHistory(newHistory);

    // 觸發立即更新事件
    window.dispatchEvent(
      new CustomEvent('searchHistoryUpdated', {
        detail: newHistory,
      })
    );

    // 非同步同步到資料庫
    try {
      const res = await fetch('/api/searchhistory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword: trimmed }),
      });
      if (!res.ok) throw new Error(`儲存搜尋歷史失敗: ${res.status}`);
    } catch (err) {
      await handleDatabaseOperationFailure('searchHistory', err);
    }
    return;
  }

  // localStorage 模式
  if (typeof window === 'undefined') return;

  try {
    const history = await getSearchHistory();
    const newHistory = [trimmed, ...history.filter((k) => k !== trimmed)];
    // 限制長度
    if (newHistory.length > SEARCH_HISTORY_LIMIT) {
      newHistory.length = SEARCH_HISTORY_LIMIT;
    }
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    window.dispatchEvent(
      new CustomEvent('searchHistoryUpdated', {
        detail: newHistory,
      })
    );
  } catch (err) {
    console.error('儲存搜尋歷史失敗:', err);
  }
}

/**
 * 清空搜尋歷史。
 * 資料庫儲存模式下使用樂觀更新：先更新快取，再非同步同步到資料庫。
 */
export async function clearSearchHistory(): Promise<void> {
  // 資料庫儲存模式：樂觀更新策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 立即更新快取
    cacheManager.cacheSearchHistory([]);

    // 觸發立即更新事件
    window.dispatchEvent(
      new CustomEvent('searchHistoryUpdated', {
        detail: [],
      })
    );

    // 非同步同步到資料庫
    try {
      const res = await fetch(`/api/searchhistory`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`清空搜尋歷史失敗: ${res.status}`);
    } catch (err) {
      await handleDatabaseOperationFailure('searchHistory', err);
    }
    return;
  }

  // localStorage 模式
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SEARCH_HISTORY_KEY);
  window.dispatchEvent(
    new CustomEvent('searchHistoryUpdated', {
      detail: [],
    })
  );
}

/**
 * 刪除單條搜尋歷史。
 * 資料庫儲存模式下使用樂觀更新：先更新快取，再非同步同步到資料庫。
 */
export async function deleteSearchHistory(keyword: string): Promise<void> {
  const trimmed = keyword.trim();
  if (!trimmed) return;

  // 資料庫儲存模式：樂觀更新策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 立即更新快取
    const cachedHistory = cacheManager.getCachedSearchHistory() || [];
    const newHistory = cachedHistory.filter((k) => k !== trimmed);
    cacheManager.cacheSearchHistory(newHistory);

    // 觸發立即更新事件
    window.dispatchEvent(
      new CustomEvent('searchHistoryUpdated', {
        detail: newHistory,
      })
    );

    // 非同步同步到資料庫
    try {
      const res = await fetch(
        `/api/searchhistory?keyword=${encodeURIComponent(trimmed)}`,
        {
          method: 'DELETE',
        }
      );
      if (!res.ok) throw new Error(`刪除搜尋歷史失敗: ${res.status}`);
    } catch (err) {
      await handleDatabaseOperationFailure('searchHistory', err);
    }
    return;
  }

  // localStorage 模式
  if (typeof window === 'undefined') return;

  try {
    const history = await getSearchHistory();
    const newHistory = history.filter((k) => k !== trimmed);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    window.dispatchEvent(
      new CustomEvent('searchHistoryUpdated', {
        detail: newHistory,
      })
    );
  } catch (err) {
    console.error('刪除搜尋歷史失敗:', err);
  }
}

// ---------------- 收藏相關 API ----------------

/**
 * 獲取全部收藏。
 * 資料庫儲存模式下使用混合快取策略：優先返回快取資料，後台非同步同步最新資料。
 */
export async function getAllFavorites(): Promise<Record<string, Favorite>> {
  // 伺服器端渲染階段直接返回空
  if (typeof window === 'undefined') {
    return {};
  }

  // 資料庫儲存模式：使用混合快取策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 優先從快取獲取資料
    const cachedData = cacheManager.getCachedFavorites();

    if (cachedData) {
      // 返回快取資料，同時後台非同步更新
      fetchFromApi<Record<string, Favorite>>(`/api/favorites`)
        .then((freshData) => {
          // 只有資料真正不同時才更新快取
          if (JSON.stringify(cachedData) !== JSON.stringify(freshData)) {
            cacheManager.cacheFavorites(freshData);
            // 觸發資料更新事件
            window.dispatchEvent(
              new CustomEvent('favoritesUpdated', {
                detail: freshData,
              })
            );
          }
        })
        .catch((err) => {
          console.warn('後台同步收藏失敗:', err);
        });

      return cachedData;
    } else {
      // 快取為空，直接從 API 獲取並快取
      try {
        const freshData = await fetchFromApi<Record<string, Favorite>>(
          `/api/favorites`
        );
        cacheManager.cacheFavorites(freshData);
        return freshData;
      } catch (err) {
        console.error('獲取收藏失敗:', err);
        return {};
      }
    }
  }

  // localStorage 模式
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, Favorite>;
  } catch (err) {
    console.error('讀取收藏失敗:', err);
    return {};
  }
}

/**
 * 儲存收藏。
 * 資料庫儲存模式下使用樂觀更新：先更新快取，再非同步同步到資料庫。
 */
export async function saveFavorite(
  source: string,
  id: string,
  favorite: Favorite
): Promise<void> {
  const key = generateStorageKey(source, id);

  // 資料庫儲存模式：樂觀更新策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 立即更新快取
    const cachedFavorites = cacheManager.getCachedFavorites() || {};
    cachedFavorites[key] = favorite;
    cacheManager.cacheFavorites(cachedFavorites);

    // 觸發立即更新事件
    window.dispatchEvent(
      new CustomEvent('favoritesUpdated', {
        detail: cachedFavorites,
      })
    );

    // 非同步同步到資料庫
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, favorite }),
      });
      if (!res.ok) throw new Error(`儲存收藏失敗: ${res.status}`);
    } catch (err) {
      await handleDatabaseOperationFailure('favorites', err);
      throw err;
    }
    return;
  }

  // localStorage 模式
  if (typeof window === 'undefined') {
    console.warn('無法在伺服器端儲存收藏到 localStorage');
    return;
  }

  try {
    const allFavorites = await getAllFavorites();
    allFavorites[key] = favorite;
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(allFavorites));
    window.dispatchEvent(
      new CustomEvent('favoritesUpdated', {
        detail: allFavorites,
      })
    );
  } catch (err) {
    console.error('儲存收藏失敗:', err);
    throw err;
  }
}

/**
 * 刪除收藏。
 * 資料庫儲存模式下使用樂觀更新：先更新快取，再非同步同步到資料庫。
 */
export async function deleteFavorite(
  source: string,
  id: string
): Promise<void> {
  const key = generateStorageKey(source, id);

  // 資料庫儲存模式：樂觀更新策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 立即更新快取
    const cachedFavorites = cacheManager.getCachedFavorites() || {};
    delete cachedFavorites[key];
    cacheManager.cacheFavorites(cachedFavorites);

    // 觸發立即更新事件
    window.dispatchEvent(
      new CustomEvent('favoritesUpdated', {
        detail: cachedFavorites,
      })
    );

    // 非同步同步到資料庫
    try {
      const res = await fetch(`/api/favorites?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`刪除收藏失敗: ${res.status}`);
    } catch (err) {
      await handleDatabaseOperationFailure('favorites', err);
      throw err;
    }
    return;
  }

  // localStorage 模式
  if (typeof window === 'undefined') {
    console.warn('無法在伺服器端刪除收藏到 localStorage');
    return;
  }

  try {
    const allFavorites = await getAllFavorites();
    delete allFavorites[key];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(allFavorites));
    window.dispatchEvent(
      new CustomEvent('favoritesUpdated', {
        detail: allFavorites,
      })
    );
  } catch (err) {
    console.error('刪除收藏失敗:', err);
    throw err;
  }
}

/**
 * 判斷是否已收藏。
 * 資料庫儲存模式下使用混合快取策略：優先返回快取資料，後台非同步同步最新資料。
 */
export async function isFavorited(
  source: string,
  id: string
): Promise<boolean> {
  const key = generateStorageKey(source, id);

  // 資料庫儲存模式：使用混合快取策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    const cachedFavorites = cacheManager.getCachedFavorites();

    if (cachedFavorites) {
      // 返回快取資料，同時後台非同步更新
      fetchFromApi<Record<string, Favorite>>(`/api/favorites`)
        .then((freshData) => {
          // 只有資料真正不同時才更新快取
          if (JSON.stringify(cachedFavorites) !== JSON.stringify(freshData)) {
            cacheManager.cacheFavorites(freshData);
            // 觸發資料更新事件
            window.dispatchEvent(
              new CustomEvent('favoritesUpdated', {
                detail: freshData,
              })
            );
          }
        })
        .catch((err) => {
          console.warn('後台同步收藏失敗:', err);
        });

      return !!cachedFavorites[key];
    } else {
      // 快取為空，直接從 API 獲取並快取
      try {
        const freshData = await fetchFromApi<Record<string, Favorite>>(
          `/api/favorites`
        );
        cacheManager.cacheFavorites(freshData);
        return !!freshData[key];
      } catch (err) {
        console.error('檢查收藏狀態失敗:', err);
        return false;
      }
    }
  }

  // localStorage 模式
  const allFavorites = await getAllFavorites();
  return !!allFavorites[key];
}

/**
 * 清空全部播放記錄
 * 資料庫儲存模式下使用樂觀更新：先更新快取，再非同步同步到資料庫。
 */
export async function clearAllPlayRecords(): Promise<void> {
  // 資料庫儲存模式：樂觀更新策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 立即更新快取
    cacheManager.cachePlayRecords({});

    // 觸發立即更新事件
    window.dispatchEvent(
      new CustomEvent('playRecordsUpdated', {
        detail: {},
      })
    );

    // 非同步同步到資料庫
    try {
      const res = await fetch(`/api/playrecords`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`清空播放記錄失敗: ${res.status}`);
    } catch (err) {
      await handleDatabaseOperationFailure('playRecords', err);
      throw err;
    }
    return;
  }

  // localStorage 模式
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PLAY_RECORDS_KEY);
  window.dispatchEvent(
    new CustomEvent('playRecordsUpdated', {
      detail: {},
    })
  );
}

/**
 * 清空全部收藏
 * 資料庫儲存模式下使用樂觀更新：先更新快取，再非同步同步到資料庫。
 */
export async function clearAllFavorites(): Promise<void> {
  // 資料庫儲存模式：樂觀更新策略（包括 redis、d1、upstash）
  if (STORAGE_TYPE !== 'localstorage') {
    // 立即更新快取
    cacheManager.cacheFavorites({});

    // 觸發立即更新事件
    window.dispatchEvent(
      new CustomEvent('favoritesUpdated', {
        detail: {},
      })
    );

    // 非同步同步到資料庫
    try {
      const res = await fetch(`/api/favorites`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`清空收藏失敗: ${res.status}`);
    } catch (err) {
      await handleDatabaseOperationFailure('favorites', err);
      throw err;
    }
    return;
  }

  // localStorage 模式
  if (typeof window === 'undefined') return;
  localStorage.removeItem(FAVORITES_KEY);
  window.dispatchEvent(
    new CustomEvent('favoritesUpdated', {
      detail: {},
    })
  );
}

// ---------------- 混合快取輔助函數 ----------------

/**
 * 清除目前使用者的所有快取資料
 * 用於使用者登出時清理快取
 */
export function clearUserCache(): void {
  if (STORAGE_TYPE !== 'localstorage') {
    cacheManager.clearUserCache();
  }
}

/**
 * 手動重新整理所有快取資料
 * 強制從伺服器重新獲取資料並更新快取
 */
export async function refreshAllCache(): Promise<void> {
  if (STORAGE_TYPE === 'localstorage') return;

  try {
    // 並行重新整理所有資料
    const [playRecords, favorites, searchHistory] = await Promise.allSettled([
      fetchFromApi<Record<string, PlayRecord>>(`/api/playrecords`),
      fetchFromApi<Record<string, Favorite>>(`/api/favorites`),
      fetchFromApi<string[]>(`/api/searchhistory`),
    ]);

    if (playRecords.status === 'fulfilled') {
      cacheManager.cachePlayRecords(playRecords.value);
      window.dispatchEvent(
        new CustomEvent('playRecordsUpdated', {
          detail: playRecords.value,
        })
      );
    }

    if (favorites.status === 'fulfilled') {
      cacheManager.cacheFavorites(favorites.value);
      window.dispatchEvent(
        new CustomEvent('favoritesUpdated', {
          detail: favorites.value,
        })
      );
    }

    if (searchHistory.status === 'fulfilled') {
      cacheManager.cacheSearchHistory(searchHistory.value);
      window.dispatchEvent(
        new CustomEvent('searchHistoryUpdated', {
          detail: searchHistory.value,
        })
      );
    }
  } catch (err) {
    console.error('重新整理快取失敗:', err);
  }
}

/**
 * 獲取快取狀態資訊
 * 用於偵錯和監控快取健康狀態
 */
export function getCacheStatus(): {
  hasPlayRecords: boolean;
  hasFavorites: boolean;
  hasSearchHistory: boolean;
  username: string | null;
} {
  if (STORAGE_TYPE === 'localstorage') {
    return {
      hasPlayRecords: false,
      hasFavorites: false,
      hasSearchHistory: false,
      username: null,
    };
  }

  const authInfo = getAuthInfoFromBrowserCookie();
  return {
    hasPlayRecords: !!cacheManager.getCachedPlayRecords(),
    hasFavorites: !!cacheManager.getCachedFavorites(),
    hasSearchHistory: !!cacheManager.getCachedSearchHistory(),
    username: authInfo?.username || null,
  };
}

// ---------------- React Hook 輔助類型 ----------------

export type CacheUpdateEvent =
  | 'playRecordsUpdated'
  | 'favoritesUpdated'
  | 'searchHistoryUpdated';

/**
 * 用於 React 元件監聽資料更新的事件監聽器
 * 使用方法：
 *
 * useEffect(() => {
 *   const unsubscribe = subscribeToDataUpdates('playRecordsUpdated', (data) => {
 *     setPlayRecords(data);
 *   });
 *   return unsubscribe;
 * }, []);
 */
export function subscribeToDataUpdates<T>(
  eventType: CacheUpdateEvent,
  callback: (data: T) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleUpdate = (event: CustomEvent) => {
    callback(event.detail);
  };

  window.addEventListener(eventType, handleUpdate as EventListener);

  return () => {
    window.removeEventListener(eventType, handleUpdate as EventListener);
  };
}

/**
 * 預載入所有使用者資料到快取
 * 適合在應用程式啟動時呼叫，提升後續存取速度
 */
export async function preloadUserData(): Promise<void> {
  if (STORAGE_TYPE === 'localstorage') return;

  // 檢查是否已有有效快取，避免重複請求
  const status = getCacheStatus();
  if (status.hasPlayRecords && status.hasFavorites && status.hasSearchHistory) {
    return;
  }

  // 後台靜默預載入，不阻塞介面
  refreshAllCache().catch((err) => {
    console.warn('預載入使用者資料失敗:', err);
  });
}
