import { NextResponse } from 'next/server';

import { getCacheTime } from '@/lib/config';
import { getTMDbCategories } from '@/lib/tmdb.client';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get('kind') as 'tv' | 'movie';
  const category = searchParams.get('category') || '';
  const type = searchParams.get('type') || '';
  const limit = parseInt(searchParams.get('limit') || '20');
  const start = parseInt(searchParams.get('start') || '0');

  // 驗證參數
  if (!kind || !['tv', 'movie'].includes(kind)) {
    return NextResponse.json(
      { error: 'kind 參數必須是 tv 或 movie' },
      { status: 400 }
    );
  }

  if (limit < 1 || limit > 100) {
    return NextResponse.json(
      { error: 'limit 必須在 1-100 之間' },
      { status: 400 }
    );
  }

  if (start < 0) {
    return NextResponse.json({ error: 'start 不能小於 0' }, { status: 400 });
  }

  try {
    const result = await getTMDbCategories({
      kind,
      category,
      type,
      pageLimit: limit,
      pageStart: start,
    });

    const cacheTime = await getCacheTime();
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': `public, max-age=${cacheTime}, s-maxage=${cacheTime}`,
        'CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
        'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: '獲取分類數據失敗',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
