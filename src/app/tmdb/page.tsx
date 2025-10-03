/* eslint-disable no-console,react-hooks/exhaustive-deps */

'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { TMDbItem, TMDbResult } from '@/lib/types';

import PageLayout from '@/components/PageLayout';
import TMDbSelector from '@/components/TMDbSelector';
import VideoCard from '@/components/VideoCard';
import VideoCardSkeleton from '@/components/VideoCardSkeleton';

function TMDbPageClient() {
  const searchParams = useSearchParams();
  const [tmdbData, setTmdbData] = useState<TMDbItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectorsReady, setSelectorsReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const type = searchParams.get('type') || 'movie';

  // 選擇器狀態
  const [primarySelection, setPrimarySelection] = useState<string>(() => {
    return type === 'movie' ? '年度私推' : '年度私推';
  });
  const [secondarySelection, setSecondarySelection] = useState<string>(() => {
    if (type === 'movie') return '2025'; // 默認2025年（你的個人清單）
    if (type === 'tv') return '2025'; // 默認2025年（你的個人清單）
    return '';
  });

  // 獲取數據的函數
  const fetchData = useCallback(
    async (isLoadMore = false) => {
      if (loading || isLoadingMore) return;

      const pageStart = isLoadMore ? (currentPage + 1) * 20 : 0;
      const pageLimit = 20;

      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setLoading(true);
        // 立即清空數據，防止顯示舊數據
        setTmdbData([]);
        setCurrentPage(0);
        setHasMore(true);
        setErrorMessage(null);
      }

      try {
        let result: TMDbResult;

        if (
          (type === 'movie' && primarySelection === '年度私推') ||
          (type === 'tv' && primarySelection === '年度私推')
        ) {
          // 當選擇年度推薦時，顯示個人清單
          const listIdMap: Record<string, string> =
            type === 'movie'
              ? {
                  '2025': '8559774',
                  '2024': '8559782',
                  '2023': '8559901',
                  '2022': '8559936',
                  '2021': '8560184',
                  '2020': '8560185',
                }
              : {
                  // TV list IDs
                  '2025': '8560350',
                  '2024': '8560351',
                };
          const listId =
            listIdMap[secondarySelection] ||
            listIdMap[type === 'movie' ? '2020' : '2024'];

          // 個人清單不支持分頁，只在第一頁時獲取
          if (isLoadMore) {
            result = {
              code: 200,
              message: `${secondarySelection} 清單已全部加載`,
              list: [],
            };
          } else {
            // 調用 API 端點獲取清單數據
            const response = await fetch(
              `/api/tmdb/list?id=${listId}&limit=${pageLimit}`
            );
            result = await response.json();
          }
        } else {
          // 處理正常的分類數據
          let category = '';
          let typeParam = '';

          if (type === 'movie') {
            // 年度高分使用 TMDb Discover API
            if (primarySelection === '年度高分') {
              category = '年度高分';
            } else {
              category = '年度熱門'; // 默認
            }
            typeParam = secondarySelection || '2025';
          } else if (type === 'tv') {
            category = secondarySelection || '年度熱門劇集';
            typeParam = secondarySelection.includes('年度') ? '2024' : '';
          }

          // 調用 API 端點獲取分類數據
          const queryParams = new URLSearchParams({
            kind: type as 'tv' | 'movie',
            category: category,
            type: typeParam,
            limit: pageLimit.toString(),
            start: pageStart.toString(),
          });
          const response = await fetch(
            `/api/tmdb/categories?${queryParams.toString()}`
          );
          result = await response.json();
        }

        if (result.code === 200) {
          // 確保這是最新的請求結果（簡單的防競態條件機制）
          const currentKey = `${primarySelection}-${secondarySelection}`;
          if (isLoadMore) {
            setTmdbData((prev) => [...prev, ...result.list]);
            setCurrentPage((prev) => prev + 1);
          } else {
            // 再次確認參數沒有改變
            const newKey = `${primarySelection}-${secondarySelection}`;
            if (currentKey === newKey) {
              setTmdbData(result.list);
              setCurrentPage(0);
            }
          }

          // 如果返回的數據少於請求的數量，說明沒有更多數據了
          if (result.list.length < pageLimit) {
            setHasMore(false);
          }
        } else {
          console.error('獲取數據失敗:', result.message);
          if (!isLoadMore) {
            setTmdbData([]);
            setErrorMessage(result.message || '獲取數據失敗');
          }
        }
      } catch (error) {
        console.error('獲取數據失敗:', error);
        const errorMsg =
          error instanceof Error ? error.message : '網路連接失敗，請稍後重試';
        if (!isLoadMore) {
          setTmdbData([]);
          setErrorMessage(errorMsg);
        }
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
      }
    },
    [type, primarySelection, secondarySelection]
  );

  // 當選擇器狀態改變時重新獲取數據
  useEffect(() => {
    if (selectorsReady) {
      fetchData(false);
    }
  }, [primarySelection, secondarySelection, selectorsReady, fetchData]);

  // 當類型改變時重置選擇器狀態
  useEffect(() => {
    if (type === 'movie') {
      setPrimarySelection('年度私推');
      setSecondarySelection('2025'); // 默認顯示 2025 個人清單
    } else if (type === 'tv') {
      setPrimarySelection('年度私推');
      setSecondarySelection('2025'); // 默認顯示 2025 個人清單
    }
    setSelectorsReady(true);
  }, [type]);

  // 無限滾動
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !loading && !isLoadingMore) {
          fetchData(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
      }
    );

    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, isLoadingMore, fetchData]);

  // 獲取頁面標題
  const getPageTitle = () => {
    return type === 'movie' ? '電影' : '電視劇';
  };

  // 構建查詢字符串
  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (type !== 'movie') {
      params.set('type', type);
    }
    return params.toString();
  };

  const queryString = buildQueryString();
  const activePath = `/tmdb${queryString ? `?${queryString}` : ''}`;

  return (
    <PageLayout activePath={activePath}>
      <div className='container mx-auto px-4 py-6'>
        {/* 頁面標題 */}
        <div className='mb-6'>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
            TMDb {getPageTitle()}
          </h1>
          <p className='text-gray-600 dark:text-gray-400'>
            來自 The Movie Database 的年度{getPageTitle()}排行榜
          </p>
        </div>

        {/* 選擇器 */}
        <div className='mb-6'>
          <TMDbSelector
            type={type as 'movie' | 'tv'}
            primarySelection={primarySelection}
            secondarySelection={secondarySelection}
            onPrimaryChange={setPrimarySelection}
            onSecondaryChange={setSecondarySelection}
          />
        </div>

        {/* 內容區域 */}
        <div className='space-y-6'>
          {/* 加載骨架屏 */}
          {loading && (
            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'>
              {Array.from({ length: 12 }).map((_, index) => (
                <VideoCardSkeleton key={index} />
              ))}
            </div>
          )}

          {/* 數據展示 */}
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'>
            {!loading &&
              tmdbData.map((item, index) => (
                <div key={`${item.id}-${index}`} className='w-full'>
                  <VideoCard
                    title={item.title}
                    poster={item.poster}
                    from='tmdb'
                    year={item.year}
                    rate={item.rate}
                    tmdb_id={item.id}
                    type={type}
                  />
                </div>
              ))}
          </div>

          {/* 加載更多指示器 */}
          {hasMore && !loading && (
            <div
              ref={(el) => {
                if (el && el.offsetParent !== null) {
                  (
                    loadingRef as React.MutableRefObject<HTMLDivElement | null>
                  ).current = el;
                }
              }}
              className='flex justify-center mt-12 py-8'
            >
              {isLoadingMore && (
                <div className='flex items-center gap-2'>
                  <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-green-500'></div>
                  <span className='text-gray-600'>加載中...</span>
                </div>
              )}
            </div>
          )}

          {/* 沒有更多數據提示 */}
          {!hasMore && tmdbData.length > 0 && (
            <div className='text-center text-gray-500 py-8'>已加載全部內容</div>
          )}

          {/* 空狀態和錯誤狀態 */}
          {!loading && tmdbData.length === 0 && (
            <div className='text-center py-8'>
              {errorMessage ? (
                <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md mx-auto'>
                  <div className='flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full'>
                    <svg
                      className='w-6 h-6 text-red-600 dark:text-red-400'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth='2'
                        d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                      />
                    </svg>
                  </div>
                  <h3 className='text-lg font-semibold text-red-900 dark:text-red-100 mb-2'>
                    載入失敗
                  </h3>
                  <p className='text-red-700 dark:text-red-300 mb-4'>
                    {errorMessage}
                  </p>
                  <button
                    onClick={() => fetchData(false)}
                    className='px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors'
                  >
                    重試
                  </button>
                </div>
              ) : (
                <div className='text-gray-500 dark:text-gray-400'>
                  暫無相關內容
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

export default function TMDbPage() {
  return (
    <Suspense>
      <TMDbPageClient />
    </Suspense>
  );
}
