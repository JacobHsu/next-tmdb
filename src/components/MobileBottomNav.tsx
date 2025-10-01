'use client';

import { Film, Home, Search, Tv } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MobileBottomNavProps {
  /**
   * 主動指定目前啟用的路徑。當未提供時，自動使用 usePathname() 獲取的路徑。
   */
  activePath?: string;
}

const MobileBottomNav = ({ activePath }: MobileBottomNavProps) => {
  const pathname = usePathname();

  // 目前啟用路徑：優先使用傳入的 activePath，否則回退到瀏覽器位址
  const currentActive = activePath ?? pathname;

  const navItems = [
    { icon: Home, label: '首頁', href: '/' },
    { icon: Search, label: '搜尋', href: '/search' },
    {
      icon: Film,
      label: 'TMDb電影',
      href: '/tmdb?type=movie',
    },
    {
      icon: Tv,
      label: 'TMDb劇集',
      href: '/tmdb?type=tv',
    },
  ];

  const isActive = (href: string) => {
    const typeMatch = href.match(/type=([^&]+)/)?.[1];

    // 解碼 URL 以進行正確的比較
    const decodedActive = decodeURIComponent(currentActive);
    const decodedItemHref = decodeURIComponent(href);

    return (
      decodedActive === decodedItemHref ||
      (decodedActive.startsWith('/tmdb') &&
        decodedActive.includes(`type=${typeMatch}`))
    );
  };

  return (
    <nav
      className='md:hidden fixed left-0 right-0 z-[600] bg-white/90 backdrop-blur-xl border-t border-gray-200/50 overflow-hidden dark:bg-gray-900/80 dark:border-gray-700/50'
      style={{
        /* 緊貼視口底部，同時在內部留出安全區高度 */
        bottom: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className='flex overflow-x-auto'>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <div key={item.href} className='flex-shrink-0 min-w-[80px]'>
              <Link
                href={item.href}
                className='flex flex-col items-center justify-center w-full h-14 gap-1 text-xs px-2'
              >
                <item.icon
                  className={`h-5 w-5 ${
                    active
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                />
                <span
                  className={`text-center leading-tight ${
                    active
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </div>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
