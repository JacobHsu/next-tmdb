import { TMDbItem, TMDbResult } from './types';

// TMDb API 配置
const TMDB_API_KEY =
  process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

interface TMDbMovie {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  overview: string;
  genre_ids: number[];
  original_language: string;
  popularity: number;
}

interface TMDbTV {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  overview: string;
  genre_ids: number[];
  original_language: string;
  popularity: number;
}

type TMDbAPIItem = TMDbMovie | TMDbTV;

interface TMDbResponse {
  page: number;
  results: TMDbMovie[];
  total_pages: number;
  total_results: number;
}

interface TMDbCategoriesParams {
  kind: 'tv' | 'movie';
  category?: string;
  type?: string; // 年份
  pageLimit?: number;
  pageStart?: number;
}

interface TMDbListResponse {
  created_by: string;
  description: string;
  favorite_count: number;
  id: string;
  items: TMDbAPIItem[];
  item_count: number;
  iso_639_1: string;
  name: string;
  poster_path: string | null;
}

interface TMDbVideo {
  iso_639_1: string;
  iso_3166_1: string;
  name: string;
  key: string;
  site: string;
  size: number;
  type: string;
  official: boolean;
  published_at: string;
  id: string;
}

interface TMDbVideoResponse {
  id: number;
  results: TMDbVideo[];
}

/**
 * 帶超時的 fetch 請求
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超時

  // 根據 API Key 格式決定認證方式
  const isJWT = TMDB_API_KEY.includes('.');
  const authHeaders: Record<string, string> = {};

  if (isJWT) {
    // v4 Access Token (JWT)
    authHeaders['Authorization'] = `Bearer ${TMDB_API_KEY}`;
  } else {
    // v3 API Key - 使用查詢參數
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}api_key=${TMDB_API_KEY}`;
  }

  const fetchOptions: RequestInit = {
    ...options,
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * 獲取年度熱門電影
 */
export async function fetchTMDbYearlyMovies(
  params: TMDbCategoriesParams
): Promise<TMDbResult> {
  const { kind, category, type, pageLimit = 20, pageStart = 0 } = params;

  // 檢查 API Key
  if (!TMDB_API_KEY) {
    return {
      code: 200,
      message: 'TMDb API Key 未設置，請在環境變數中設置 TMDB_API_KEY',
      list: [],
    };
  }

  // 計算頁碼
  const page = Math.floor(pageStart / pageLimit) + 1;
  const year = type || new Date().getFullYear().toString();

  let endpoint = '';
  const queryParams = new URLSearchParams({
    page: page.toString(),
    language: 'zh-TW', // 繁體中文
    region: 'TW',
  });

  if (kind === 'movie') {
    // 根據分類選擇不同的端點
    switch (category) {
      case '年度熱門':
        endpoint = '/discover/movie';
        queryParams.append('primary_release_year', year);
        queryParams.append('sort_by', 'popularity.desc');
        queryParams.append('vote_count.gte', '100'); // 至少100個評分
        break;
      case '年度高分':
        endpoint = '/discover/movie';
        queryParams.append('primary_release_year', year);
        queryParams.append('sort_by', 'vote_average.desc');
        queryParams.append('vote_count.gte', '30'); // 降低門檻
        queryParams.append('vote_average.gte', '6.0'); // 降低門檻
        // 限制語言：英語、中文、日語、韓語主流電影
        queryParams.append('with_original_language', 'en|zh|ja|ko');
        // 限制只要有預算資料的電影（通常是較大型的製作）
        queryParams.append('with_budget.gte', '1000000'); // 至少100萬美元預算
        break;
      case '年度新片':
        endpoint = '/discover/movie';
        queryParams.append('primary_release_year', year);
        queryParams.append('sort_by', 'release_date.desc');
        break;
      case '票房冠軍':
        endpoint = '/discover/movie';
        queryParams.append('primary_release_year', year);
        queryParams.append('sort_by', 'revenue.desc');
        break;
      default:
        // 默認使用年度熱門
        endpoint = '/discover/movie';
        queryParams.append('primary_release_year', year);
        queryParams.append('sort_by', 'popularity.desc');
        queryParams.append('vote_count.gte', '50');
    }
  } else {
    // 電視劇
    switch (category) {
      case '年度熱門劇集':
        endpoint = '/discover/tv';
        queryParams.append('first_air_date_year', year);
        queryParams.append('sort_by', 'popularity.desc');
        break;
      case '年度高分劇集':
        endpoint = '/discover/tv';
        queryParams.append('first_air_date_year', year);
        queryParams.append('sort_by', 'vote_average.desc');
        queryParams.append('vote_count.gte', '100');
        break;
      default:
        endpoint = '/discover/tv';
        queryParams.append('first_air_date_year', year);
        queryParams.append('sort_by', 'popularity.desc');
    }
  }

  const url = `${TMDB_BASE_URL}${endpoint}?${queryParams.toString()}`;

  try {
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `TMDb API error! Status: ${response.status}, Message: ${errorText}`
      );
    }

    const tmdbData: TMDbResponse = await response.json();

    // 轉換數據格式以匹配現有的 TMDbItem 結構
    const list: TMDbItem[] = tmdbData.results
      .filter((item) => {
        // 過濾條件：有海報、有評分
        return item.poster_path && item.vote_average > 0 && item.vote_count > 0; // 有評分即可
      })
      .map((item) => ({
        id: item.id.toString(),
        title: item.title,
        poster: item.poster_path
          ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}`
          : '',
        rate: item.vote_average.toFixed(1),
        year: item.release_date ? item.release_date.split('-')[0] : year,
      }))
      .slice(0, pageLimit); // 取指定數量

    return {
      code: 200,
      message: `獲取成功，找到 ${list.length} 部${year}年${
        category || '熱門'
      }電影`,
      list: list,
    };
  } catch (error) {
    // console.error('TMDb API Error:', error);
    return {
      code: 200,
      message: '獲取失敗，請稍後重試',
      list: [],
    };
  }
}

/**
 * 獲取當前熱門電影（不限年份）
 */
export async function fetchTMDbTrendingMovies(
  timeWindow: 'day' | 'week' = 'week',
  page = 1
): Promise<TMDbResult> {
  // 檢查 API Key
  if (!TMDB_API_KEY) {
    return {
      code: 200,
      message: 'TMDb API Key 未設置，請在環境變數中設置 TMDB_API_KEY',
      list: [],
    };
  }

  const url = `${TMDB_BASE_URL}/trending/movie/${timeWindow}?page=${page}&language=zh-TW`;

  try {
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `TMDb API error! Status: ${response.status}, Message: ${errorText}`
      );
    }

    const tmdbData: TMDbResponse = await response.json();

    const list: TMDbItem[] = tmdbData.results
      .filter((item) => item.poster_path && item.vote_average > 0)
      .map((item) => ({
        id: item.id.toString(),
        title: item.title,
        poster: `${TMDB_IMAGE_BASE_URL}${item.poster_path}`,
        rate: item.vote_average.toFixed(1),
        year: item.release_date ? item.release_date.split('-')[0] : '',
      }));

    return {
      code: 200,
      message: `獲取成功，找到 ${list.length} 部本${
        timeWindow === 'day' ? '日' : '週'
      }熱門電影`,
      list: list,
    };
  } catch (error) {
    // console.error('TMDb API Error:', error);
    return {
      code: 200,
      message: '獲取失敗，請稍後重試',
      list: [],
    };
  }
}

/**
 * 帶重試機制的 fetch 請求
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3
): Promise<Response> {
  let lastError: Error = new Error('Unknown error');

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetchWithTimeout(url, options);
      if (response.ok) {
        return response;
      }

      // 如果是 4xx 錯誤，不重試
      if (response.status >= 400 && response.status < 500) {
        const errorText = await response.text();
        throw new Error(
          `TMDb API error! Status: ${response.status}, Message: ${errorText}`
        );
      }

      // 5xx 錯誤或網路錯誤，等待後重試
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error as Error;

      // 最後一次重試失敗
      if (i === maxRetries - 1) {
        throw lastError;
      }

      // 等待時間遞增：1s, 2s, 3s
      const waitTime = (i + 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw lastError || new Error('Unknown error occurred');
}

/**
 * 獲取 TMDb 用戶自定義清單
 */
export async function fetchTMDbList(
  listId: string,
  pageLimit = 20
): Promise<TMDbResult> {
  // 檢查 API Key
  if (!TMDB_API_KEY) {
    return {
      code: 200,
      message: 'TMDb API Key 未設置，請在環境變數中設置 TMDB_API_KEY',
      list: [],
    };
  }

  const url = `${TMDB_BASE_URL}/list/${listId}?language=zh-TW`;

  try {
    const response = await fetchWithRetry(url);
    const listData: TMDbListResponse = await response.json();

    // 轉換數據格式以匹配現有的 TMDbItem 結構
    const list: TMDbItem[] = listData.items
      .filter((item) => {
        // 過濾條件：有海報、有評分、評分合理
        return (
          item.poster_path && item.vote_average > 0 && item.vote_count > 10
        ); // 至少10個評分
      })
      .map((item) => {
        // 判斷是電影還是電視劇
        const isTV = 'name' in item && 'first_air_date' in item;
        const title = isTV ? (item as TMDbTV).name : (item as TMDbMovie).title;
        const releaseDate = isTV
          ? (item as TMDbTV).first_air_date
          : (item as TMDbMovie).release_date;

        return {
          id: item.id.toString(),
          title: title,
          poster: item.poster_path
            ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}`
            : '',
          rate: item.vote_average.toFixed(1),
          year: releaseDate ? releaseDate.split('-')[0] : '',
        };
      })
      .slice(0, pageLimit); // 取指定數量

    return {
      code: 200,
      message: `獲取成功，「${listData.name}」清單包含 ${list.length} 項內容`,
      list: list,
    };
  } catch (error) {
    // console.error('TMDb List API Error:', error);
    const errorMessage = (error as Error).message;

    // 根據錯誤類型返回不同的提示信息
    if (errorMessage.includes('timeout') || errorMessage.includes('fetch')) {
      return {
        code: 200,
        message: '網路連接超時，請稍後重試',
        list: [],
      };
    } else if (errorMessage.includes('404')) {
      return {
        code: 200,
        message: '清單不存在或已被刪除',
        list: [],
      };
    } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
      return {
        code: 200,
        message: 'API 權限不足，請檢查 API Key',
        list: [],
      };
    } else {
      return {
        code: 200,
        message: `載入清單時發生錯誤：${errorMessage}`,
        list: [],
      };
    }
  }
}

/**
 * 獲取電影視頻（預告片、花絮等）
 */
export async function fetchTMDbMovieVideos(
  movieId: string
): Promise<TMDbVideo[]> {
  // 檢查 API Key
  if (!TMDB_API_KEY) {
    return [];
  }

  const url = `${TMDB_BASE_URL}/movie/${movieId}/videos?language=zh-TW`;

  try {
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      throw new Error(`TMDb Videos API error! Status: ${response.status}`);
    }

    const videoData: TMDbVideoResponse = await response.json();

    // 過濾並排序視頻
    return videoData.results
      .filter(
        (video) =>
          video.site === 'YouTube' &&
          (video.type === 'Trailer' ||
            video.type === 'Teaser' ||
            video.type === 'Clip')
      )
      .sort((a, b) => {
        // 優先顯示官方預告片
        if (a.official && !b.official) return -1;
        if (!a.official && b.official) return 1;
        // 然後按類型排序：Trailer > Teaser > Clip
        const typeOrder = { Trailer: 0, Teaser: 1, Clip: 2 };
        return (
          (typeOrder[a.type as keyof typeof typeOrder] || 3) -
          (typeOrder[b.type as keyof typeof typeOrder] || 3)
        );
      });
  } catch (error) {
    return [];
  }
}

/**
 * 獲取電視劇視頻（預告片、花絮等）
 */
export async function fetchTMDbTVVideos(tvId: string): Promise<TMDbVideo[]> {
  // 檢查 API Key
  if (!TMDB_API_KEY) {
    return [];
  }

  const url = `${TMDB_BASE_URL}/tv/${tvId}/videos?language=zh-TW`;

  try {
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      throw new Error(`TMDb TV Videos API error! Status: ${response.status}`);
    }

    const videoData: TMDbVideoResponse = await response.json();

    // 過濾並排序視頻
    return videoData.results
      .filter(
        (video) =>
          video.site === 'YouTube' &&
          (video.type === 'Trailer' ||
            video.type === 'Teaser' ||
            video.type === 'Clip')
      )
      .sort((a, b) => {
        // 優先顯示官方預告片
        if (a.official && !b.official) return -1;
        if (!a.official && b.official) return 1;
        // 然後按類型排序：Trailer > Teaser > Clip
        const typeOrder = { Trailer: 0, Teaser: 1, Clip: 2 };
        return (
          (typeOrder[a.type as keyof typeof typeOrder] || 3) -
          (typeOrder[b.type as keyof typeof typeOrder] || 3)
        );
      });
  } catch (error) {
    return [];
  }
}

/**
 * TMDb 搜尋結果介面
 */
interface TMDbSearchResponse {
  page: number;
  results: TMDbAPIItem[];
  total_pages: number;
  total_results: number;
}

/**
 * 搜尋電影和電視劇
 */
export async function searchTMDb(query: string, page = 1): Promise<TMDbResult> {
  // 檢查 API Key
  if (!TMDB_API_KEY) {
    return {
      code: 200,
      message: 'TMDb API Key 未設置，請在環境變數中設置 TMDB_API_KEY',
      list: [],
    };
  }

  const encodedQuery = encodeURIComponent(query.trim());

  try {
    // 同時搜尋電影和電視劇
    const [movieResponse, tvResponse] = await Promise.all([
      fetchWithRetry(
        `${TMDB_BASE_URL}/search/movie?query=${encodedQuery}&page=${page}&language=zh-TW`
      ),
      fetchWithRetry(
        `${TMDB_BASE_URL}/search/tv?query=${encodedQuery}&page=${page}&language=zh-TW`
      ),
    ]);

    const movieData: TMDbSearchResponse = await movieResponse.json();
    const tvData: TMDbSearchResponse = await tvResponse.json();

    // 合併結果
    const allResults = [...movieData.results, ...tvData.results];

    // 轉換數據格式
    const list: TMDbItem[] = allResults
      .filter((item) => {
        // 過濾條件：有海報、有評分
        return item.poster_path && item.vote_average > 0;
      })
      .map((item) => {
        // 判斷是電影還是電視劇
        const isTV = 'name' in item && 'first_air_date' in item;
        const title = isTV ? (item as TMDbTV).name : (item as TMDbMovie).title;
        const releaseDate = isTV
          ? (item as TMDbTV).first_air_date
          : (item as TMDbMovie).release_date;

        return {
          id: item.id.toString(),
          title: title,
          poster: item.poster_path
            ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}`
            : '',
          rate: item.vote_average.toFixed(1),
          year: releaseDate ? releaseDate.split('-')[0] : '',
        };
      })
      .sort((a, b) => {
        // 按相關性排序：標題完全匹配優先，然後按評分排序
        const aExactMatch = a.title.toLowerCase().includes(query.toLowerCase());
        const bExactMatch = b.title.toLowerCase().includes(query.toLowerCase());

        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;

        // 按評分排序
        return parseFloat(b.rate) - parseFloat(a.rate);
      });

    return {
      code: 200,
      message: `找到 ${list.length} 個搜尋結果`,
      list: list,
    };
  } catch (error) {
    // console.error('TMDb Search API Error:', error);
    const errorMessage = (error as Error).message;

    if (errorMessage.includes('timeout') || errorMessage.includes('fetch')) {
      return {
        code: 200,
        message: '搜尋請求超時，請稍後重試',
        list: [],
      };
    } else {
      return {
        code: 200,
        message: `搜尋時發生錯誤：${errorMessage}`,
        list: [],
      };
    }
  }
}

/**
 * 獲取熱門標籤（基於當前熱門內容）
 */
export async function getTrendingTags(limit = 6): Promise<string[]> {
  // 檢查 API Key
  if (!TMDB_API_KEY) {
    return [];
  }

  try {
    // 獲取本週熱門電影和電視劇
    const [movieResponse, tvResponse] = await Promise.all([
      fetchWithRetry(`${TMDB_BASE_URL}/trending/movie/week?language=zh-TW`),
      fetchWithRetry(`${TMDB_BASE_URL}/trending/tv/week?language=zh-TW`),
    ]);

    const movieData: TMDbSearchResponse = await movieResponse.json();
    const tvData: TMDbSearchResponse = await tvResponse.json();

    // 合併結果並取出標題
    const allTitles = [
      ...movieData.results
        .slice(0, Math.ceil(limit / 2))
        .map((item) => ('title' in item ? item.title : (item as TMDbTV).name)),
      ...tvData.results
        .slice(0, Math.floor(limit / 2))
        .map((item) =>
          'name' in item ? (item as TMDbTV).name : (item as TMDbMovie).title
        ),
    ];

    // 過濾掉太長的標題，優先選擇較短的
    return allTitles
      .filter((title) => title.length <= 15) // 過濾太長的標題
      .slice(0, limit);
  } catch (error) {
    // console.error('獲取熱門標籤失敗:', error);
    // 返回備用標籤
    return [
      '魷魚遊戲',
      '愛的迫降',
      '黑暗榮耀',
      '星期三',
      '紙房子',
      '梨泰院CLASS',
    ];
  }
}

/**
 * 統一的分類數據獲取函數
 */
export async function getTMDbCategories(
  params: TMDbCategoriesParams
): Promise<TMDbResult> {
  return fetchTMDbYearlyMovies(params);
}
