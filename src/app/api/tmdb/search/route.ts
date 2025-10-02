import { NextResponse } from 'next/server';

import { getCacheTime } from '@/lib/config';
import { searchTMDb } from '@/lib/tmdb.client';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const page = parseInt(searchParams.get('page') || '1');

  if (!query) {
    return NextResponse.json({ error: '缺少搜尋關鍵字' }, { status: 400 });
  }

  if (page < 1 || page > 1000) {
    return NextResponse.json(
      { error: '頁數必須在 1-1000 之間' },
      { status: 400 }
    );
  }

  try {
    const result = await searchTMDb(query.trim(), page);
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
        error: 'TMDb 搜尋失敗',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
