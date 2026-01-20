'use client';

import { ExternalLink, ListVideo } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const EXTERNAL_LINKS = [
  {
    name: 'Netflix Top 10',
    url: 'https://www.netflix.com/tudum/top10/tv',
    favicon: 'https://www.netflix.com/favicon.ico',
  },
  {
    name: 'FlixPatrol Top 10',
    url: 'https://flixpatrol.com/top10/streaming/united-states/',
    favicon: 'https://flixpatrol.com/favicon.ico',
  },
];

export const ExternalLinksMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMenuClick = () => {
    setIsOpen(!isOpen);
  };

  const handleCloseMenu = () => {
    setIsOpen(false);
  };

  const handleLinkClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const menuPanel = (
    <>
      {/* 背景遮罩 */}
      <div
        className='fixed inset-0 bg-transparent z-[1000]'
        onClick={handleCloseMenu}
      />

      {/* 選單面板 */}
      <div className='fixed top-14 right-28 w-52 bg-white dark:bg-gray-900 rounded-lg shadow-xl z-[1001] border border-gray-200/50 dark:border-gray-700/50 overflow-hidden select-none'>
        {/* 標題 */}
        <div className='px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-800/50'>
          <span className='text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
            排行榜
          </span>
        </div>

        {/* 連結項目 */}
        <div className='py-1'>
          {EXTERNAL_LINKS.map((link, index) => (
            <button
              key={index}
              onClick={() => handleLinkClick(link.url)}
              className='w-full px-3 py-2 text-left flex items-center gap-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm'
            >
              <Image
                src={link.favicon}
                alt={link.name}
                width={20}
                height={20}
                className='w-5 h-5 rounded'
                unoptimized
              />
              <span className='font-medium flex-1'>{link.name}</span>
              <ExternalLink className='w-3.5 h-3.5 text-gray-400' />
            </button>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={handleMenuClick}
        className='w-10 h-10 p-2 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200/50 dark:text-gray-300 dark:hover:bg-gray-700/50 transition-colors'
        aria-label='External Links'
        title='排行榜'
      >
        <ListVideo className='w-full h-full' />
      </button>

      {/* 使用 Portal 將選單面板渲染到 document.body */}
      {isOpen && mounted && createPortal(menuPanel, document.body)}
    </>
  );
};
