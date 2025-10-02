/* eslint-disable react-hooks/exhaustive-deps, @typescript-eslint/no-explicit-any */
'use client';

import { ChevronUp, Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

import {
  addSearchHistory,
  clearSearchHistory,
  deleteSearchHistory,
  getSearchHistory,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { SearchResult } from '@/lib/types';

import PageLayout from '@/components/PageLayout';
import VideoCard from '@/components/VideoCard';

function SearchPageClient() {
  // 搜尋歷史
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  // 返回頂部按鈕顯示狀態
  const [showBackToTop, setShowBackToTop] = useState(false);

  // 熱門搜尋標籤
  const [popularTags, setPopularTags] = useState<string[]>([]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // 獲取預設聚合設定：只讀取使用者本地設定，預設為 true
  const getDefaultAggregate = () => {
    if (typeof window !== 'undefined') {
      const userSetting = localStorage.getItem('defaultAggregateSearch');
      if (userSetting !== null) {
        return JSON.parse(userSetting);
      }
    }
    return true; // 預設啟用聚合
  };

  const [viewMode, setViewMode] = useState<'agg' | 'all'>(() => {
    return getDefaultAggregate() ? 'agg' : 'all';
  });

  // 聚合後的結果（按標題和年份分組）
  const aggregatedResults = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    searchResults.forEach((item) => {
      // 使用 title + year + type 作為鍵，year 必然存在，但依然兜底 'unknown'
      const key = `${item.title.replaceAll(' ', '')}-${
        item.year || 'unknown'
      }-${item.episodes.length === 1 ? 'movie' : 'tv'}`;
      const arr = map.get(key) || [];
      arr.push(item);
      map.set(key, arr);
    });
    return Array.from(map.entries()).sort((a, b) => {
      // 優先排序：標題與搜尋詞完全一致的排在前面
      const aExactMatch = a[1][0].title
        .replaceAll(' ', '')
        .includes(searchQuery.trim().replaceAll(' ', ''));
      const bExactMatch = b[1][0].title
        .replaceAll(' ', '')
        .includes(searchQuery.trim().replaceAll(' ', ''));

      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // 年份排序
      if (a[1][0].year === b[1][0].year) {
        return a[0].localeCompare(b[0]);
      } else {
        // 處理 unknown 的情況
        const aYear = a[1][0].year;
        const bYear = b[1][0].year;

        if (aYear === 'unknown' && bYear === 'unknown') {
          return 0;
        } else if (aYear === 'unknown') {
          return 1; // a 排在後面
        } else if (bYear === 'unknown') {
          return -1; // b 排在後面
        } else {
          // 都是數字年份，按數字大小排序（大的在前面）
          return aYear > bYear ? -1 : 1;
        }
      }
    });
  }, [searchResults]);

  // 獲取熱門標籤
  const fetchPopularTags = async () => {
    try {
      const response = await fetch('/api/tmdb/trending/tags?limit=6');
      const data = await response.json();
      if (data.code === 200 && data.tags) {
        setPopularTags(data.tags);
      }
    } catch (error) {
      console.error('獲取熱門標籤失敗', error);
    }
  };

  useEffect(() => {
    // 無搜尋參數時聚焦搜尋框
    !searchParams.get('q') && document.getElementById('searchInput')?.focus();

    // 初始載入搜尋歷史和熱門標籤
    getSearchHistory().then(setSearchHistory);
    fetchPopularTags();

    // 監聽搜尋歷史更新事件
    const unsubscribe = subscribeToDataUpdates(
      'searchHistoryUpdated',
      (newHistory: string[]) => {
        setSearchHistory(newHistory);
      }
    );

    // 獲取滾動位置的函數 - 專門針對 body 滾動
    const getScrollTop = () => {
      return document.body.scrollTop || 0;
    };

    // 使用 requestAnimationFrame 持續檢測滾動位置
    let isRunning = false;
    const checkScrollPosition = () => {
      if (!isRunning) return;

      const scrollTop = getScrollTop();
      const shouldShow = scrollTop > 300;
      setShowBackToTop(shouldShow);

      requestAnimationFrame(checkScrollPosition);
    };

    // 啟動持續檢測
    isRunning = true;
    checkScrollPosition();

    // 監聽 body 元素的滾動事件
    const handleScroll = () => {
      const scrollTop = getScrollTop();
      setShowBackToTop(scrollTop > 300);
    };

    document.body.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      unsubscribe();
      isRunning = false; // 停止 requestAnimationFrame 循環

      // 移除 body 滾動事件監聽器
      document.body.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    // 當搜尋參數變化時更新搜尋狀態
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
      fetchSearchResults(query);

      // 儲存到搜尋歷史 (事件監聽會自動更新介面)
      addSearchHistory(query);
    } else {
      setShowResults(false);
    }
  }, [searchParams]);

  const fetchSearchResults = async (query: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/tmdb/search?q=${encodeURIComponent(query.trim())}`
      );
      const data = await response.json();

      if (data.code === 200 && data.list) {
        // 將 TMDb 結果轉換為 SearchResult 格式
        const tmdbResults: SearchResult[] = data.list.map((item: any) => ({
          id: item.id,
          title: item.title,
          poster: item.poster,
          year: item.year || 'unknown',
          rate: item.rate,
          source: 'tmdb',
          source_name: 'TMDb',
          douban_id: 0,
          episodes: [{ name: item.title, url: '' }], // 假設為電影，單集
        }));

        setSearchResults(tmdbResults);
      } else {
        setSearchResults([]);
      }
      setShowResults(true);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim().replace(/\s+/g, ' ');
    if (!trimmed) return;

    // 回顯搜尋框
    setSearchQuery(trimmed);
    setIsLoading(true);
    setShowResults(true);

    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    // 直接發送請求
    fetchSearchResults(trimmed);

    // 儲存到搜尋歷史 (事件監聽會自動更新介面)
    addSearchHistory(trimmed);
  };

  // 標籤點擊處理
  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
    router.push(`/search?q=${encodeURIComponent(tag)}`);
  };

  // 返回頂部功能
  const scrollToTop = () => {
    try {
      // 根據除錯結果，真正的滾動容器是 document.body
      document.body.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (error) {
      // 如果平滑滾動完全失敗，使用立即滾動
      document.body.scrollTop = 0;
    }
  };

  return (
    <PageLayout activePath='/search'>
      <div className='px-4 sm:px-10 py-4 sm:py-8 overflow-visible mb-10'>
        {/* 搜尋框 */}
        <div className='mb-8'>
          <form onSubmit={handleSearch} className='max-w-2xl mx-auto'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500' />
              <input
                id='searchInput'
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='搜尋電影、電視劇...'
                className='w-full h-12 rounded-lg bg-gray-50/80 py-3 pl-10 pr-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:bg-white border border-gray-200/50 shadow-sm dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:bg-gray-700 dark:border-gray-700'
              />
            </div>
          </form>

          {/* 熱門標籤 */}
          {popularTags.length > 0 && !showResults && (
            <div className='max-w-2xl mx-auto mt-6'>
              <div className='text-center'>
                <h3 className='text-sm font-medium text-gray-600 dark:text-gray-400 mb-3'>
                  熱門搜尋
                </h3>
                <div className='flex flex-wrap justify-center gap-2'>
                  {popularTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagClick(tag)}
                      className='px-4 py-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 hover:from-green-500/20 hover:to-emerald-500/20 border border-green-200/50 dark:border-green-700/50 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 transition-all duration-200 hover:scale-105 hover:shadow-sm'
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 搜尋結果或搜尋歷史 */}
        <div className='max-w-[95%] mx-auto mt-12 overflow-visible'>
          {isLoading ? (
            <div className='flex justify-center items-center h-40'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-green-500'></div>
            </div>
          ) : showResults ? (
            <section className='mb-12'>
              {/* 標題 + 聚合開關 */}
              <div className='mb-8 flex items-center justify-between'>
                <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
                  搜尋結果
                </h2>
                {/* 聚合開關 */}
                <label className='flex items-center gap-2 cursor-pointer select-none'>
                  <span className='text-sm text-gray-700 dark:text-gray-300'>
                    聚合
                  </span>
                  <div className='relative'>
                    <input
                      type='checkbox'
                      className='sr-only peer'
                      checked={viewMode === 'agg'}
                      onChange={() =>
                        setViewMode(viewMode === 'agg' ? 'all' : 'agg')
                      }
                    />
                    <div className='w-9 h-5 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors dark:bg-gray-600'></div>
                    <div className='absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4'></div>
                  </div>
                </label>
              </div>
              <div
                key={`search-results-${viewMode}`}
                className='justify-start grid grid-cols-3 gap-x-2 gap-y-14 sm:gap-y-20 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8'
              >
                {viewMode === 'agg'
                  ? aggregatedResults.map(([mapKey, group]) => {
                      // 檢查是否為 TMDb 結果
                      const isTMDb = group[0].source === 'tmdb';

                      return (
                        <div key={`agg-${mapKey}`} className='w-full'>
                          <VideoCard
                            from={isTMDb ? 'tmdb' : 'search'}
                            title={group[0].title}
                            poster={group[0].poster}
                            year={group[0].year}
                            rate={isTMDb ? group[0].rate : undefined}
                            tmdb_id={isTMDb ? group[0].id : undefined}
                            type={group[0].episodes.length > 1 ? 'tv' : 'movie'}
                            items={isTMDb ? undefined : group}
                          />
                        </div>
                      );
                    })
                  : searchResults.map((item) => {
                      const isTMDb = item.source === 'tmdb';

                      return (
                        <div
                          key={`all-${item.source}-${item.id}`}
                          className='w-full'
                        >
                          <VideoCard
                            from={isTMDb ? 'tmdb' : 'search'}
                            id={isTMDb ? undefined : item.id}
                            title={item.title}
                            poster={item.poster}
                            episodes={isTMDb ? undefined : item.episodes.length}
                            source={isTMDb ? undefined : item.source}
                            source_name={isTMDb ? undefined : item.source_name}
                            tmdb_id={isTMDb ? item.id : undefined}
                            rate={isTMDb ? item.rate : undefined}
                            year={item.year}
                            type={item.episodes.length > 1 ? 'tv' : 'movie'}
                          />
                        </div>
                      );
                    })}
                {searchResults.length === 0 && (
                  <div className='col-span-full text-center text-gray-500 py-8 dark:text-gray-400'>
                    未找到相關結果
                  </div>
                )}
              </div>
            </section>
          ) : searchHistory.length > 0 ? (
            // 搜索历史
            <section className='mb-12'>
              <h2 className='mb-4 text-xl font-bold text-gray-800 text-left dark:text-gray-200'>
                搜尋記錄
                {searchHistory.length > 0 && (
                  <button
                    onClick={() => {
                      clearSearchHistory(); // 事件监听会自动更新界面
                    }}
                    className='ml-3 text-sm text-gray-500 hover:text-red-500 transition-colors dark:text-gray-400 dark:hover:text-red-500'
                  >
                    清空
                  </button>
                )}
              </h2>
              <div className='flex flex-wrap gap-2'>
                {searchHistory.map((item) => (
                  <div key={item} className='relative group'>
                    <button
                      onClick={() => {
                        setSearchQuery(item);
                        router.push(
                          `/search?q=${encodeURIComponent(item.trim())}`
                        );
                      }}
                      className='px-4 py-2 bg-gray-500/10 hover:bg-gray-300 rounded-full text-sm text-gray-700 transition-colors duration-200 dark:bg-gray-700/50 dark:hover:bg-gray-600 dark:text-gray-300'
                    >
                      {item}
                    </button>
                    {/* 删除按钮 */}
                    <button
                      aria-label='刪除搜尋記錄'
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        deleteSearchHistory(item); // 事件监听会自动更新界面
                      }}
                      className='absolute -top-1 -right-1 w-4 h-4 opacity-0 group-hover:opacity-100 bg-gray-400 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] transition-colors'
                    >
                      <X className='w-3 h-3' />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      {/* 返回顶部悬浮按钮 */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-20 md:bottom-6 right-6 z-[500] w-12 h-12 bg-green-500/90 hover:bg-green-500 text-white rounded-full shadow-lg backdrop-blur-sm transition-all duration-300 ease-in-out flex items-center justify-center group ${
          showBackToTop
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        aria-label='返回頂部'
      >
        <ChevronUp className='w-6 h-6 transition-transform group-hover:scale-110' />
      </button>
    </PageLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageClient />
    </Suspense>
  );
}
