/**
 * 獲取圖片代理 URL 設定
 */
export function getImageProxyUrl(): string | null {
  if (typeof window === 'undefined') return null;

  // 本地未開啟圖片代理，則不使用代理
  const enableImageProxy = localStorage.getItem('enableImageProxy');
  if (enableImageProxy !== null) {
    if (!JSON.parse(enableImageProxy) as boolean) {
      return null;
    }
  }

  const localImageProxy = localStorage.getItem('imageProxyUrl');
  if (localImageProxy != null) {
    return localImageProxy.trim() ? localImageProxy.trim() : null;
  }

  // 如果未設定，則使用全域物件
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serverImageProxy = (window as any).RUNTIME_CONFIG?.IMAGE_PROXY;
  return serverImageProxy && serverImageProxy.trim()
    ? serverImageProxy.trim()
    : null;
}

/**
 * 處理圖片 URL，如果設定了圖片代理則使用代理
 */
export function processImageUrl(originalUrl: string): string {
  if (!originalUrl) return originalUrl;

  const proxyUrl = getImageProxyUrl();
  if (!proxyUrl) return originalUrl;

  return `${proxyUrl}${encodeURIComponent(originalUrl)}`;
}

export function cleanHtmlTags(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, '\n') // 將 HTML 標籤替換為換行
    .replace(/\n+/g, '\n') // 將多個連續換行合併為一個
    .replace(/[ \t]+/g, ' ') // 將多個連續空格和製表符合併為一個空格，但保留換行符
    .replace(/^\n+|\n+$/g, '') // 去掉首尾換行
    .replace(/&nbsp;/g, ' ') // 將 &nbsp; 替換為空格
    .trim(); // 去掉首尾空格
}

