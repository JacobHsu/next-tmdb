/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, no-console, @next/next/no-img-element */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { processImageUrl } from '@/lib/utils';

import PageLayout from '@/components/PageLayout';

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

function TrailerPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videos, setVideos] = useState<TMDbVideo[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isVideoListCollapsed, setIsVideoListCollapsed] = useState(false);

  // 影視基本信息
  const movieId = searchParams.get('movieId') || '';
  const type = searchParams.get('type') || 'movie';
  const movieTitle =
    searchParams.get('title') || `${type === 'tv' ? '電視劇' : '電影'}預告片`;
  const movieYear = searchParams.get('year') || '';
  const moviePoster = searchParams.get('poster') || '';

  // 獲取影視視頻
  useEffect(() => {
    const fetchMovieVideos = async () => {
      if (!movieId) {
        setError(`缺少${type === 'tv' ? '電視劇' : '電影'} ID`);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/tmdb/videos?movieId=${movieId}&type=${type}`
        );
        if (!response.ok) {
          throw new Error('獲取影片失敗');
        }

        const data = await response.json();
        if (data.videos && data.videos.length > 0) {
          setVideos(data.videos);
        } else {
          setError('找不到可播放的影片');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '獲取影片失敗');
      } finally {
        setLoading(false);
      }
    };

    fetchMovieVideos();
  }, [movieId]);

  // 處理視頻切換
  const handleVideoChange = (index: number) => {
    setCurrentVideoIndex(index);
  };

  // 獲取 YouTube 嵌入 URL
  const getYouTubeEmbedUrl = (key: string) => {
    return `https://www.youtube.com/embed/${key}?autoplay=1&rel=0&showinfo=0&modestbranding=1`;
  };

  // 獲取視頻類型的中文名稱
  const getVideoTypeName = (type: string) => {
    switch (type) {
      case 'Trailer':
        return '預告片';
      case 'Teaser':
        return '前導預告';
      case 'Clip':
        return '片段';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <PageLayout activePath='/trailer'>
        <div className='flex items-center justify-center min-h-screen bg-transparent'>
          <div className='text-center max-w-md mx-auto px-6'>
            {/* 動畫圖標 */}
            <div className='relative mb-8'>
              <div className='relative mx-auto w-24 h-24 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl shadow-2xl flex items-center justify-center transform hover:scale-105 transition-transform duration-300'>
                <div className='text-white text-4xl'>🎬</div>
                {/* 旋轉光環 */}
                <div className='absolute -inset-2 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl opacity-20 animate-spin'></div>
              </div>
            </div>

            <div className='space-y-2'>
              <p className='text-xl font-semibold text-gray-800 dark:text-gray-200 animate-pulse'>
                正在加載預告片...
              </p>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout activePath='/trailer'>
        <div className='flex items-center justify-center min-h-screen bg-transparent'>
          <div className='text-center max-w-md mx-auto px-6'>
            {/* 錯誤圖標 */}
            <div className='relative mb-8'>
              <div className='relative mx-auto w-24 h-24 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl shadow-2xl flex items-center justify-center'>
                <div className='text-white text-4xl'>😵</div>
              </div>
            </div>

            <div className='space-y-4 mb-8'>
              <h2 className='text-2xl font-bold text-gray-800 dark:text-gray-200'>
                無法加載預告片
              </h2>
              <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4'>
                <p className='text-red-600 dark:text-red-400 font-medium'>
                  {error}
                </p>
              </div>
            </div>

            <button
              onClick={() => router.back()}
              className='px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transform hover:scale-105 transition-all duration-200'
            >
              ← 返回
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  const currentVideo = videos[currentVideoIndex];

  return (
    <PageLayout activePath='/trailer'>
      <div className='flex flex-col gap-3 py-4 px-5 lg:px-[3rem] 2xl:px-20'>
        {/* 標題 */}
        <div className='py-1'>
          <h1 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
            {movieTitle} {movieYear && `(${movieYear})`} -{' '}
            {type === 'tv' ? '劇集' : '電影'}預告片
            {videos.length > 1 && (
              <span className='text-gray-500 dark:text-gray-400 ml-2'>
                ({currentVideoIndex + 1}/{videos.length})
              </span>
            )}
          </h1>
        </div>

        {/* 主要內容區域 */}
        <div className='space-y-2'>
          {/* 摺疊控制 - 僅在 lg 及以上屏幕顯示 */}
          <div className='hidden lg:flex justify-end'>
            <button
              onClick={() => setIsVideoListCollapsed(!isVideoListCollapsed)}
              className='group relative flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all duration-200'
              title={isVideoListCollapsed ? '顯示視頻列表' : '隱藏視頻列表'}
            >
              <svg
                className={`w-3.5 h-3.5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
                  isVideoListCollapsed ? 'rotate-180' : 'rotate-0'
                }`}
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M9 5l7 7-7 7'
                />
              </svg>
              <span className='text-xs font-medium text-gray-600 dark:text-gray-300'>
                {isVideoListCollapsed ? '顯示' : '隱藏'}
              </span>
              <div
                className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full transition-all duration-200 ${
                  isVideoListCollapsed
                    ? 'bg-orange-400 animate-pulse'
                    : 'bg-green-400'
                }`}
              ></div>
            </button>
          </div>

          {/* YouTube 風格布局 */}
          <div className='flex flex-col lg:flex-row gap-4 transition-all duration-300 ease-in-out'>
            {/* 主要內容區域 (左側) */}
            <div
              className={`flex-1 transition-all duration-300 ease-in-out ${
                isVideoListCollapsed ? 'w-full' : 'lg:max-w-[calc(100%-426px)]'
              }`}
            >
              {/* 視頻播放器 */}
              <div className='relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg mb-4'>
                {currentVideo && (
                  <iframe
                    src={getYouTubeEmbedUrl(currentVideo.key)}
                    title={currentVideo.name}
                    className='w-full h-full'
                    frameBorder='0'
                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                    allowFullScreen
                  ></iframe>
                )}
              </div>

              {/* 視頻標題和信息 */}
              <div className='space-y-3'>
                <h1 className='text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight'>
                  {currentVideo?.name || `${movieTitle} - 預告片`}
                </h1>

                <div className='flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400'>
                  {currentVideo && (
                    <>
                      <span className='px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full'>
                        {getVideoTypeName(currentVideo.type)}
                      </span>
                      <span>{currentVideo.size}p</span>
                      {currentVideo.official && (
                        <span className='px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full font-medium'>
                          官方發布
                        </span>
                      )}
                      <span>{currentVideo.site}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 右側欄 (YouTube 風格 402px) */}
            <div
              className={`transition-all duration-300 ease-in-out ${
                isVideoListCollapsed
                  ? 'lg:hidden lg:opacity-0 lg:scale-95'
                  : 'lg:w-[402px] lg:flex-shrink-0 lg:opacity-100 lg:scale-100'
              }`}
            >
              {/* 視頻列表 */}
              <div className='bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm overflow-hidden mb-4'>
                <div className='p-4 border-b border-gray-200/50 dark:border-gray-700/50'>
                  <h3 className='font-semibold text-gray-900 dark:text-gray-100'>
                    更多視頻 ({videos.length})
                  </h3>
                </div>
                <div className='max-h-96 overflow-y-auto'>
                  {videos.map((video, index) => (
                    <button
                      key={video.id}
                      onClick={() => handleVideoChange(index)}
                      className={`w-full p-3 text-left hover:bg-white/50 dark:hover:bg-gray-700/50 border-b border-gray-100/50 dark:border-gray-600/50 transition-colors last:border-b-0 ${
                        index === currentVideoIndex
                          ? 'bg-green-50/80 dark:bg-green-900/20 border-l-4 border-l-green-500'
                          : ''
                      }`}
                    >
                      <div className='flex gap-3'>
                        {/* 視頻縮略圖佔位符 */}
                        <div className='w-20 h-12 bg-gray-300 dark:bg-gray-600 rounded flex-shrink-0 flex items-center justify-center'>
                          <div className='w-6 h-6 text-gray-500 dark:text-gray-400'>
                            <svg fill='currentColor' viewBox='0 0 24 24'>
                              <path d='M8 5v14l11-7z' />
                            </svg>
                          </div>
                        </div>

                        {/* 視頻信息 */}
                        <div className='flex-1 min-w-0'>
                          <p className='text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 mb-1'>
                            {video.name}
                          </p>
                          <div className='flex items-center space-x-2'>
                            <span
                              className={`text-xs px-2 py-0.5 rounded font-medium ${
                                video.official
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                              }`}
                            >
                              {getVideoTypeName(video.type)}
                            </span>
                            {video.official && (
                              <span className='text-xs text-red-500 font-medium'>
                                官方
                              </span>
                            )}
                          </div>
                          <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                            {video.site} • {video.size}p
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 影視海報 */}
              {moviePoster && (
                <div className='bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm'>
                  <h3 className='font-semibold text-gray-900 dark:text-gray-100 mb-3'>
                    {type === 'tv' ? '劇集' : '電影'}海報
                  </h3>
                  <div className='bg-gray-300 dark:bg-gray-700 aspect-[2/3] flex items-center justify-center rounded-lg overflow-hidden'>
                    <img
                      src={processImageUrl(
                        moviePoster.startsWith('http')
                          ? moviePoster
                          : `https://image.tmdb.org/t/p/w500${moviePoster}`
                      )}
                      alt={movieTitle}
                      className='w-full h-full object-cover'
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default function TrailerPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TrailerPageClient />
    </Suspense>
  );
}
