const VideoCardSkeleton = () => {
  return (
    <div className='group cursor-pointer'>
      <div className='relative overflow-hidden rounded-lg shadow-lg transition-all duration-300 group-hover:shadow-xl'>
        {/* 封面骨架 */}
        <div className='aspect-[2/3] bg-gray-300 dark:bg-gray-700 animate-pulse'></div>

        {/* 內容區域 */}
        <div className='absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3'>
          {/* 評分骨架 */}
          <div className='flex items-center gap-1 mb-2'>
            <div className='w-4 h-4 bg-gray-400 dark:bg-gray-600 rounded animate-pulse'></div>
            <div className='w-8 h-3 bg-gray-400 dark:bg-gray-600 rounded animate-pulse'></div>
          </div>

          {/* 標題骨架 */}
          <div className='space-y-1'>
            <div className='w-3/4 h-3 bg-gray-400 dark:bg-gray-600 rounded animate-pulse'></div>
            <div className='w-1/2 h-3 bg-gray-400 dark:bg-gray-600 rounded animate-pulse'></div>
          </div>

          {/* 年份骨架 */}
          <div className='w-12 h-2.5 bg-gray-400 dark:bg-gray-600 rounded mt-1 animate-pulse'></div>
        </div>
      </div>
    </div>
  );
};

export default VideoCardSkeleton;
