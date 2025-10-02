import { NextResponse } from 'next/server';

import { getCacheTime } from '@/lib/config';
import { getTrendingTags } from '@/lib/tmdb.client';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '6');

  if (limit < 1 || limit > 20) {
    return NextResponse.json(
      { error: '數量必須在 1-20 之間' },
      { status: 400 }
    );
  }

  try {
    const tags = await getTrendingTags(limit);
    const cacheTime = await getCacheTime();

    return NextResponse.json(
      {
        code: 200,
        message: `獲取 ${tags.length} 個熱門標籤`,
        tags,
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
        error: '獲取熱門標籤失敗',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
