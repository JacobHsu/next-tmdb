import { NextResponse } from 'next/server';

import { getCacheTime } from '@/lib/config';
import { fetchTMDbMovieVideos, fetchTMDbTVVideos } from '@/lib/tmdb.client';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const movieId = searchParams.get('movieId');
  const type = searchParams.get('type'); // 'movie' or 'tv'

  if (!movieId) {
    return NextResponse.json({ error: '缺少 ID 參數' }, { status: 400 });
  }

  try {
    let videos;
    if (type === 'tv') {
      videos = await fetchTMDbTVVideos(movieId);
    } else {
      videos = await fetchTMDbMovieVideos(movieId);
    }

    const cacheTime = await getCacheTime();
    return NextResponse.json(
      {
        code: 200,
        message: `找到 ${videos.length} 個影片`,
        videos,
      },
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
          'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
          'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: `獲取${type === 'tv' ? '電視劇' : '電影'}影片失敗`,
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
