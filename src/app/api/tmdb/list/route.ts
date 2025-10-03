import { NextResponse } from 'next/server';

import { getCacheTime } from '@/lib/config';
import { fetchTMDbList } from '@/lib/tmdb.client';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const listId = searchParams.get('id');
  const limit = parseInt(searchParams.get('limit') || '20');

  // 驗證參數
  if (!listId) {
    return NextResponse.json({ error: '清單 ID 不能為空' }, { status: 400 });
  }

  if (limit < 1 || limit > 100) {
    return NextResponse.json(
      { error: 'limit 必須在 1-100 之間' },
      { status: 400 }
    );
  }

  try {
    const result = await fetchTMDbList(listId, limit);

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
        error: '獲取清單數據失敗',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
