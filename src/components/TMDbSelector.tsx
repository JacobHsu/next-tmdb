/* eslint-disable react-hooks/exhaustive-deps */

'use client';

import React, { useEffect, useRef, useState } from 'react';

interface SelectorOption {
  label: string;
  value: string;
}

interface TMDbSelectorProps {
  type: 'movie' | 'tv';
  primarySelection?: string;
  secondarySelection?: string;
  onPrimaryChange: (value: string) => void;
  onSecondaryChange: (value: string) => void;
}

const TMDbSelector: React.FC<TMDbSelectorProps> = ({
  type,
  primarySelection,
  secondarySelection,
  onPrimaryChange,
  onSecondaryChange,
}) => {
  // 為不同的選擇器創建獨立的refs和狀態
  const primaryContainerRef = useRef<HTMLDivElement>(null);
  const primaryButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [primaryIndicatorStyle, setPrimaryIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  const secondaryContainerRef = useRef<HTMLDivElement>(null);
  const secondaryButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [secondaryIndicatorStyle, setSecondaryIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  // 電影的一級選擇器選項（分類）
  const moviePrimaryOptions: SelectorOption[] = [
    { label: '年度私推', value: '年度私推' },
    { label: '年度高分', value: '年度高分' },
  ];

  // 電影的二級選擇器選項（年份 - 從新到舊）
  const movieSecondaryOptions: SelectorOption[] = [
    { label: '2025', value: '2025' },
    { label: '2024', value: '2024' },
    { label: '2023', value: '2023' },
    { label: '2022', value: '2022' },
    { label: '2021', value: '2021' },
    { label: '2020', value: '2020' },
  ];

  // 電視劇的一級選擇器選項（分類）
  const tvPrimaryOptions: SelectorOption[] = [
    { label: '年度私推', value: '年度私推' },
    { label: '年度高分劇集', value: '年度高分劇集' },
  ];

  // 電視劇的二級選擇器選項（年份）
  const tvSecondaryOptions: SelectorOption[] = [
    { label: '2025', value: '2025' },
    { label: '2024', value: '2024' },
  ];

  // 更新指示器位置的函數
  const updateIndicatorPosition = (
    containerRef: React.RefObject<HTMLDivElement>,
    buttonRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>,
    activeIndex: number,
    setIndicatorStyle: React.Dispatch<
      React.SetStateAction<{ left: number; width: number }>
    >
  ) => {
    if (
      containerRef.current &&
      buttonRefs.current[activeIndex] &&
      activeIndex >= 0
    ) {
      const container = containerRef.current;
      const activeButton = buttonRefs.current[activeIndex];
      if (!activeButton) return;

      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      setIndicatorStyle({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
      });
    }
  };

  // 一級選擇器效果
  useEffect(() => {
    if (type === 'movie') {
      const activeIndex = moviePrimaryOptions.findIndex(
        (opt) =>
          opt.value === (primarySelection || moviePrimaryOptions[0].value)
      );
      updateIndicatorPosition(
        primaryContainerRef,
        primaryButtonRefs,
        activeIndex,
        setPrimaryIndicatorStyle
      );
    } else if (type === 'tv') {
      const activeIndex = tvPrimaryOptions.findIndex(
        (opt) => opt.value === (primarySelection || tvPrimaryOptions[0].value)
      );
      updateIndicatorPosition(
        primaryContainerRef,
        primaryButtonRefs,
        activeIndex,
        setPrimaryIndicatorStyle
      );
    }
  }, [primarySelection, type]);

  // 二級選擇器效果
  useEffect(() => {
    let secondaryActiveIndex = -1;
    if (type === 'movie') {
      secondaryActiveIndex = movieSecondaryOptions.findIndex(
        (opt) =>
          opt.value === (secondarySelection || movieSecondaryOptions[0].value)
      );
      updateIndicatorPosition(
        secondaryContainerRef,
        secondaryButtonRefs,
        secondaryActiveIndex,
        setSecondaryIndicatorStyle
      );
    } else if (type === 'tv') {
      // 如果是年度私推，使用年份選擇器
      if (primarySelection === '年度私推') {
        secondaryActiveIndex = tvSecondaryOptions.findIndex(
          (opt) =>
            opt.value === (secondarySelection || tvSecondaryOptions[0].value)
        );
      } else {
        // 年度高分劇集也使用年份選擇器
        secondaryActiveIndex = tvSecondaryOptions.findIndex(
          (opt) =>
            opt.value === (secondarySelection || tvSecondaryOptions[0].value)
        );
      }
      updateIndicatorPosition(
        secondaryContainerRef,
        secondaryButtonRefs,
        secondaryActiveIndex,
        setSecondaryIndicatorStyle
      );
    }
  }, [secondarySelection, primarySelection, type]);

  // 窗口大小變化時重新計算位置
  useEffect(() => {
    const handleResize = () => {
      let activeIndex = -1;

      // 一級選擇器
      if (type === 'movie') {
        activeIndex = moviePrimaryOptions.findIndex(
          (opt) =>
            opt.value === (primarySelection || moviePrimaryOptions[0].value)
        );
        updateIndicatorPosition(
          primaryContainerRef,
          primaryButtonRefs,
          activeIndex,
          setPrimaryIndicatorStyle
        );
      } else if (type === 'tv') {
        activeIndex = tvPrimaryOptions.findIndex(
          (opt) => opt.value === (primarySelection || tvPrimaryOptions[0].value)
        );
        updateIndicatorPosition(
          primaryContainerRef,
          primaryButtonRefs,
          activeIndex,
          setPrimaryIndicatorStyle
        );
      }

      // 二級選擇器
      let options: SelectorOption[] = [];
      if (type === 'movie') {
        activeIndex = movieSecondaryOptions.findIndex(
          (opt) =>
            opt.value === (secondarySelection || movieSecondaryOptions[0].value)
        );
        options = movieSecondaryOptions;
      } else if (type === 'tv') {
        if (primarySelection === '年度私推') {
          activeIndex = tvSecondaryOptions.findIndex(
            (opt) =>
              opt.value === (secondarySelection || tvSecondaryOptions[0].value)
          );
          options = tvSecondaryOptions;
        } else {
          // 年度高分劇集也使用年份選擇器
          activeIndex = tvSecondaryOptions.findIndex(
            (opt) =>
              opt.value === (secondarySelection || tvSecondaryOptions[0].value)
          );
          options = tvSecondaryOptions;
        }
      }

      if (options.length > 0) {
        updateIndicatorPosition(
          secondaryContainerRef,
          secondaryButtonRefs,
          activeIndex,
          setSecondaryIndicatorStyle
        );
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [primarySelection, secondarySelection, type]);

  // 渲染膠囊選擇器的通用函數
  const renderCapsuleSelector = (
    options: SelectorOption[],
    activeValue: string,
    onChange: (value: string) => void,
    isPrimary: boolean
  ) => {
    const containerRef = isPrimary
      ? primaryContainerRef
      : secondaryContainerRef;
    const buttonRefs = isPrimary ? primaryButtonRefs : secondaryButtonRefs;
    const indicatorStyle = isPrimary
      ? primaryIndicatorStyle
      : secondaryIndicatorStyle;

    return (
      <div
        ref={containerRef}
        className='relative flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto'
      >
        {/* 滑動指示器 */}
        <div
          className='absolute top-1 bottom-1 bg-white dark:bg-gray-700 rounded-md shadow-sm transition-all duration-200 ease-out'
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
          }}
        />

        {/* 選項按鈕 */}
        {options.map((option, index) => (
          <button
            key={option.value}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            onClick={() => onChange(option.value)}
            className={`
              relative z-10 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors duration-200 whitespace-nowrap
              ${
                activeValue === option.value
                  ? 'text-gray-900 dark:text-gray-100'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }
            `}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className='space-y-4 p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700'>
      {/* 電影類型 - 顯示兩級選擇器 */}
      {type === 'movie' && (
        <div className='space-y-3'>
          {/* 一級選擇器 - 分類 */}
          <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
            <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
              分類
            </span>
            <div className='overflow-x-auto'>
              {renderCapsuleSelector(
                moviePrimaryOptions,
                primarySelection || moviePrimaryOptions[0].value,
                onPrimaryChange,
                true
              )}
            </div>
          </div>

          {/* 二級選擇器 - 年份 */}
          <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
            <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
              年份
            </span>
            <div className='overflow-x-auto'>
              {renderCapsuleSelector(
                movieSecondaryOptions,
                secondarySelection || movieSecondaryOptions[0].value,
                onSecondaryChange,
                false
              )}
            </div>
          </div>
        </div>
      )}

      {/* 電視劇類型 - 顯示兩級選擇器 */}
      {type === 'tv' && (
        <div className='space-y-3'>
          {/* 一級選擇器 - 分類 */}
          <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
            <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
              分類
            </span>
            <div className='overflow-x-auto'>
              {renderCapsuleSelector(
                tvPrimaryOptions,
                primarySelection || tvPrimaryOptions[0].value,
                onPrimaryChange,
                true
              )}
            </div>
          </div>

          {/* 二級選擇器 - 年份 */}
          <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
            <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
              年份
            </span>
            <div className='overflow-x-auto'>
              {renderCapsuleSelector(
                tvSecondaryOptions,
                secondarySelection || tvSecondaryOptions[0].value,
                onSecondaryChange,
                false
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TMDbSelector;
