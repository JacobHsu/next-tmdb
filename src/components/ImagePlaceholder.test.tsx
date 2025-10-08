/**
 * ImagePlaceholder 元件測試
 *
 * 測試骨架屏元件的功能：
 * 1. 基本渲染
 * 2. 不同寬高比（aspect-ratio）
 * 3. 動畫效果
 * 4. CSS 變數和樣式
 */

import { render } from '@testing-library/react'
import { ImagePlaceholder } from './ImagePlaceholder'

describe('ImagePlaceholder', () => {
  test('應該要正確渲染骨架屏元件', () => {
    const { container } = render(<ImagePlaceholder aspectRatio='aspect-[2/3]' />)

    // 檢查主容器是否存在
    const placeholder = container.firstChild as HTMLElement
    expect(placeholder).toBeInTheDocument()
    expect(placeholder).toHaveClass('w-full')
    expect(placeholder).toHaveClass('rounded-lg')
  })

  test('應該要套用指定的寬高比 class', () => {
    const { container } = render(<ImagePlaceholder aspectRatio='aspect-[2/3]' />)

    const placeholder = container.firstChild as HTMLElement
    expect(placeholder).toHaveClass('aspect-[2/3]')
  })

  test('應該要支援不同的寬高比', () => {
    // 測試 16:9 寬高比
    const { container: container1 } = render(
      <ImagePlaceholder aspectRatio='aspect-video' />
    )
    expect(container1.firstChild).toHaveClass('aspect-video')

    // 測試正方形
    const { container: container2 } = render(
      <ImagePlaceholder aspectRatio='aspect-square' />
    )
    expect(container2.firstChild).toHaveClass('aspect-square')

    // 測試自定義比例
    const { container: container3 } = render(
      <ImagePlaceholder aspectRatio='aspect-[4/3]' />
    )
    expect(container3.firstChild).toHaveClass('aspect-[4/3]')
  })

  test('應該要套用漸層背景樣式', () => {
    const { container } = render(<ImagePlaceholder aspectRatio='aspect-[2/3]' />)

    const placeholder = container.firstChild as HTMLElement
    const style = placeholder.style

    // 檢查背景漸層
    expect(style.background).toContain('linear-gradient')
    expect(style.background).toContain('90deg')

    // 檢查背景尺寸
    expect(style.backgroundSize).toBe('200% 100%')

    // 檢查動畫
    expect(style.animation).toContain('shine')
    expect(style.animation).toContain('1.5s')
    expect(style.animation).toContain('infinite')
  })

  test('應該要包含 CSS 動畫定義', () => {
    const { container } = render(<ImagePlaceholder aspectRatio='aspect-[2/3]' />)

    // 檢查是否包含 style 標籤
    const styleTag = container.querySelector('style')
    expect(styleTag).toBeInTheDocument()

    // 檢查動畫定義
    const styleContent = styleTag?.textContent || ''
    expect(styleContent).toContain('@keyframes shine')
    expect(styleContent).toContain('background-position: -200% 0')
    expect(styleContent).toContain('background-position: 200% 0')
  })

  test('應該要定義 CSS 變數用於亮色模式', () => {
    const { container } = render(<ImagePlaceholder aspectRatio='aspect-[2/3]' />)

    const styleTag = container.querySelector('style')
    const styleContent = styleTag?.textContent || ''

    // 檢查亮色模式 CSS 變數
    expect(styleContent).toContain(':root')
    expect(styleContent).toContain('--skeleton-color')
    expect(styleContent).toContain('--skeleton-highlight')
    expect(styleContent).toContain('#f0f0f0')
    expect(styleContent).toContain('#e0e0e0')
  })

  test('應該要定義 CSS 變數用於暗色模式', () => {
    const { container } = render(<ImagePlaceholder aspectRatio='aspect-[2/3]' />)

    const styleTag = container.querySelector('style')
    const styleContent = styleTag?.textContent || ''

    // 檢查暗色模式 CSS 變數（媒體查詢）
    expect(styleContent).toContain('@media (prefers-color-scheme: dark)')
    expect(styleContent).toContain('#2d2d2d')
    expect(styleContent).toContain('#3d3d3d')

    // 檢查 .dark class
    expect(styleContent).toContain('.dark')
  })

  test('應該要可以渲染多個骨架屏而不衝突', () => {
    const { container } = render(
      <div>
        <ImagePlaceholder aspectRatio='aspect-[2/3]' />
        <ImagePlaceholder aspectRatio='aspect-video' />
        <ImagePlaceholder aspectRatio='aspect-square' />
      </div>
    )

    // 檢查是否渲染了 3 個骨架屏
    const placeholders = container.querySelectorAll('div[class*="aspect-"]')
    expect(placeholders).toHaveLength(3)

    // 檢查每個都有正確的 class
    expect(placeholders[0]).toHaveClass('aspect-[2/3]')
    expect(placeholders[1]).toHaveClass('aspect-video')
    expect(placeholders[2]).toHaveClass('aspect-square')
  })
})
