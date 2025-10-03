/* eslint-disable @typescript-eslint/no-explicit-any */

import { CheckCircle, Heart, Link, PlayCircleIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  deleteFavorite,
  deletePlayRecord,
  generateStorageKey,
  isFavorited,
  saveFavorite,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { SearchResult } from '@/lib/types';
import { processImageUrl } from '@/lib/utils';

import { ImagePlaceholder } from '@/components/ImagePlaceholder';

interface VideoCardProps {
  id?: string;
  source?: string;
  title?: string;
  poster?: string;
  episodes?: number;
  source_name?: string;
  progress?: number;
  year?: string;
  from: 'playrecord' | 'favorite' | 'search' | 'tmdb';
  currentEpisode?: number;
  imdb_id?: string;
  tmdb_id?: string;
  onDelete?: () => void;
  rate?: string;
  items?: SearchResult[];
  type?: string;
}

export default function VideoCard({
  id,
  title = '',
  poster = '',
  episodes,
  source,
  source_name,
  progress = 0,
  year,
  from,
  currentEpisode,
  imdb_id,
  tmdb_id,
  onDelete,
  rate,
  items,
  type = '',
}: VideoCardProps) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasVideos, setHasVideos] = useState<boolean | null>(null); // null = 未檢查, true = 有影片, false = 無影片

  const isAggregate = from === 'search' && !!items?.length;

  const aggregateData = useMemo(() => {
    if (!isAggregate || !items) return null;
    const episodeCountMap = new Map<number, number>();
    items.forEach((item) => {
      const len = item.episodes?.length || 0;
      if (len > 0) {
        episodeCountMap.set(len, (episodeCountMap.get(len) || 0) + 1);
      }
    });

    const getMostFrequent = <T extends string | number>(
      map: Map<T, number>
    ) => {
      let maxCount = 0;
      let result: T | undefined;
      map.forEach((cnt, key) => {
        if (cnt > maxCount) {
          maxCount = cnt;
          result = key;
        }
      });
      return result;
    };

    return {
      first: items[0],
      mostFrequentEpisodes: getMostFrequent(episodeCountMap) || 0,
    };
  }, [isAggregate, items]);

  const actualTitle = aggregateData?.first.title ?? title;
  const actualPoster = aggregateData?.first.poster ?? poster;
  const actualSource = aggregateData?.first.source ?? source;
  const actualId = aggregateData?.first.id ?? id;
  const actualEpisodes = aggregateData?.mostFrequentEpisodes ?? episodes;
  const actualYear = aggregateData?.first.year ?? year;

  // 檢查 TMDb 項目是否有可用影片
  useEffect(() => {
    if (from !== 'tmdb' || !tmdb_id) return;

    const checkVideoAvailability = async () => {
      try {
        const response = await fetch(
          `/api/tmdb/videos?movieId=${tmdb_id}&type=${type || 'movie'}`
        );
        if (response.ok) {
          const data = await response.json();
          setHasVideos(data.videos && data.videos.length > 0);
        } else {
          setHasVideos(false);
        }
      } catch (error) {
        setHasVideos(false);
      }
    };

    checkVideoAvailability();
  }, [from, tmdb_id, type]);

  // 獲取收藏狀態
  useEffect(() => {
    // TMDb 使用 tmdb_id，其他來源使用 actualSource + actualId
    const sourceToUse = from === 'tmdb' ? 'tmdb' : actualSource;
    const idToUse = from === 'tmdb' ? tmdb_id : actualId;

    if (!sourceToUse || !idToUse) return;

    const fetchFavoriteStatus = async () => {
      try {
        const fav = await isFavorited(sourceToUse, idToUse);
        setFavorited(fav);
      } catch (err) {
        throw new Error('檢查收藏狀態失敗');
      }
    };

    fetchFavoriteStatus();

    // 監聽收藏狀態更新事件
    const storageKey = generateStorageKey(sourceToUse, idToUse);
    const unsubscribe = subscribeToDataUpdates(
      'favoritesUpdated',
      (newFavorites: Record<string, any>) => {
        // 檢查目前項目是否在新的收藏清單中
        const isNowFavorited = !!newFavorites[storageKey];
        setFavorited(isNowFavorited);
      }
    );

    return unsubscribe;
  }, [from, actualSource, actualId, tmdb_id]);

  const handleToggleFavorite = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // TMDb 使用 tmdb_id，其他來源使用 actualSource + actualId
      const sourceToUse = from === 'tmdb' ? 'tmdb' : actualSource;
      const idToUse = from === 'tmdb' ? tmdb_id : actualId;

      if (!sourceToUse || !idToUse) return;

      try {
        if (favorited) {
          // 如果已收藏，刪除收藏
          await deleteFavorite(sourceToUse, idToUse);
          setFavorited(false);
        } else {
          // 如果未收藏，新增收藏
          await saveFavorite(sourceToUse, idToUse, {
            title: actualTitle,
            source_name: from === 'tmdb' ? 'TMDb' : (source_name || ''),
            year: actualYear || '',
            cover: actualPoster,
            total_episodes: actualEpisodes ?? 1,
            save_time: Date.now(),
          });
          setFavorited(true);
        }
      } catch (err) {
        throw new Error('切換收藏狀態失敗');
      }
    },
    [
      from,
      actualSource,
      actualId,
      tmdb_id,
      actualTitle,
      source_name,
      actualYear,
      actualPoster,
      actualEpisodes,
      favorited,
    ]
  );

  const handleDeleteRecord = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (from !== 'playrecord' || !actualSource || !actualId) return;
      try {
        await deletePlayRecord(actualSource, actualId);
        onDelete?.();
      } catch (err) {
        throw new Error('刪除播放記錄失敗');
      }
    },
    [from, actualSource, actualId, onDelete]
  );

  const handleClick = useCallback(() => {
    if (from === 'tmdb' && hasVideos === true) {
      // 只有確定有影片時才跳轉到預告片頁面
      router.push(
        `/trailer?movieId=${tmdb_id || id}&title=${encodeURIComponent(
          actualTitle.trim()
        )}${actualYear ? `&year=${actualYear}` : ''}${
          actualPoster ? `&poster=${encodeURIComponent(actualPoster)}` : ''
        }${type ? `&type=${type}` : ''}`
      );
    }
  }, [
    from,
    router,
    actualTitle,
    actualYear,
    tmdb_id,
    actualPoster,
    id,
    hasVideos,
    type,
  ]);

  const config = useMemo(() => {
    const configs = {
      playrecord: {
        showSourceName: true,
        showProgress: true,
        showPlayButton: false, // 移除播放按鈕
        showHeart: true,
        showCheckCircle: true,
        showIMDBLink: false,
        showTMDbLink: false,
        showRating: false,
      },
      favorite: {
        showSourceName: true,
        showProgress: false,
        showPlayButton: false, // 移除播放按鈕
        showHeart: true,
        showCheckCircle: false,
        showIMDBLink: false,
        showTMDbLink: actualSource === 'tmdb', // 如果是 TMDb 來源則顯示連結
        showRating: false,
      },
      search: {
        showSourceName: true,
        showProgress: false,
        showPlayButton: false, // 移除播放按鈕
        showHeart: !isAggregate,
        showCheckCircle: false,
        showIMDBLink: false,
        showTMDbLink: false,
        showRating: false,
      },
      tmdb: {
        showSourceName: false,
        showProgress: false,
        showPlayButton: hasVideos === true, // 只有確定有影片時才顯示播放按鈕
        showHeart: true,
        showCheckCircle: false,
        showIMDBLink: false,
        showTMDbLink: true,
        showRating: !!rate,
      },
    };
    return configs[from] || configs.search;
  }, [from, isAggregate, rate, hasVideos, actualSource]);

  return (
    <div
      className={`group relative w-full rounded-lg bg-transparent transition-all duration-300 ease-in-out hover:z-[500] ${
        from === 'tmdb' && hasVideos === true
          ? 'cursor-pointer hover:scale-[1.05]' // 只有 TMDB 有影片時才可點擊
          : 'cursor-default' // 其他情況都不可點擊
      }`}
      onClick={from === 'tmdb' && hasVideos === true ? handleClick : undefined}
    >
      {/* 海報容器 */}
      <div className='relative aspect-[2/3] overflow-hidden rounded-lg'>
        {/* 骨架屏 */}
        {!isLoading && <ImagePlaceholder aspectRatio='aspect-[2/3]' />}
        {/* 圖片 */}
        {actualPoster && actualPoster !== '' && (
          <Image
            src={processImageUrl(actualPoster)}
            alt={actualTitle}
            fill
            className='object-cover'
            referrerPolicy='no-referrer'
            onLoadingComplete={() => setIsLoading(true)}
            onError={() => setIsLoading(true)}
          />
        )}

        {/* 懸浮遮罩 */}
        <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100' />

        {/* 播放按鈕 */}
        {config.showPlayButton && (
          <div className='absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 ease-in-out delay-75 group-hover:opacity-100 group-hover:scale-100'>
            <PlayCircleIcon
              size={50}
              strokeWidth={0.8}
              className={`text-white fill-transparent transition-all duration-300 ease-out hover:scale-[1.1] ${
                from === 'tmdb' ? 'hover:fill-red-500' : 'hover:fill-green-500'
              }`}
            />
          </div>
        )}

        {/* 操作按鈕 */}
        {(config.showHeart || config.showCheckCircle) && (
          <div className='absolute bottom-3 right-3 flex gap-3 opacity-0 translate-y-2 transition-all duration-300 ease-in-out group-hover:opacity-100 group-hover:translate-y-0'>
            {config.showCheckCircle && (
              <CheckCircle
                onClick={handleDeleteRecord}
                size={20}
                className='text-white transition-all duration-300 ease-out hover:stroke-green-500 hover:scale-[1.1]'
              />
            )}
            {config.showHeart && (
              <Heart
                onClick={handleToggleFavorite}
                size={20}
                className={`transition-all duration-300 ease-out ${
                  favorited
                    ? 'fill-red-600 stroke-red-600'
                    : 'fill-transparent stroke-white hover:stroke-red-400'
                } hover:scale-[1.1]`}
              />
            )}
          </div>
        )}

        {/* 徽章 */}
        {config.showRating && rate && (
          <div className='absolute top-2 right-2 bg-pink-500 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ease-out group-hover:scale-110'>
            {rate}
          </div>
        )}

        {actualEpisodes && actualEpisodes > 1 && (
          <div className='absolute top-2 right-2 bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-md shadow-md transition-all duration-300 ease-out group-hover:scale-110'>
            {currentEpisode
              ? `${currentEpisode}/${actualEpisodes}`
              : actualEpisodes}
          </div>
        )}

        {/* IMDB 連結 */}
        {config.showIMDBLink && imdb_id && (
          <a
            href={`https://www.imdb.com/title/${imdb_id}`}
            target='_blank'
            rel='noopener noreferrer'
            onClick={(e) => e.stopPropagation()}
            className='absolute top-2 left-2 opacity-0 -translate-x-2 transition-all duration-300 ease-in-out delay-100 group-hover:opacity-100 group-hover:translate-x-0'
          >
            <div className='bg-yellow-500 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shadow-md hover:bg-yellow-600 hover:scale-[1.1] transition-all duration-300 ease-out'>
              <Link size={16} />
            </div>
          </a>
        )}

        {/* TMDb 連結 */}
        {config.showTMDbLink && tmdb_id && (
          <a
            href={`https://www.themoviedb.org/${
              type === 'tv' ? 'tv' : 'movie'
            }/${tmdb_id}`}
            target='_blank'
            rel='noopener noreferrer'
            onClick={(e) => e.stopPropagation()}
            className='absolute top-2 left-2 opacity-0 -translate-x-2 transition-all duration-300 ease-in-out delay-100 group-hover:opacity-100 group-hover:translate-x-0'
          >
            <div className='bg-blue-500 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shadow-md hover:bg-blue-600 hover:scale-[1.1] transition-all duration-300 ease-out'>
              <Link size={16} />
            </div>
          </a>
        )}
      </div>

      {/* 進度條 */}
      {config.showProgress && progress !== undefined && (
        <div className='mt-1 h-1 w-full bg-gray-200 rounded-full overflow-hidden'>
          <div
            className='h-full bg-green-500 transition-all duration-500 ease-out'
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* 標題與來源 */}
      <div className='mt-2 text-center'>
        <div className='relative'>
          <span className='block text-sm font-semibold truncate text-gray-900 dark:text-gray-100 transition-colors duration-300 ease-in-out group-hover:text-green-600 dark:group-hover:text-green-400 peer'>
            {actualTitle}
          </span>
          {/* 自定义 tooltip */}
          <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-xs rounded-md shadow-lg opacity-0 invisible peer-hover:opacity-100 peer-hover:visible transition-all duration-200 ease-out delay-100 whitespace-nowrap pointer-events-none'>
            {actualTitle}
            <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800'></div>
          </div>
        </div>
        {config.showSourceName && source_name && (
          <span className='block text-xs text-gray-500 dark:text-gray-400 mt-1'>
            <span className='inline-block border rounded px-2 py-0.5 border-gray-500/60 dark:border-gray-400/60 transition-all duration-300 ease-in-out group-hover:border-green-500/60 group-hover:text-green-600 dark:group-hover:text-green-400'>
              {source_name}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
