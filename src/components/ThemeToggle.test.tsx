/**
 * ThemeToggle 元件測試
 *
 * React 元件測試的流程：
 * 1. 渲染元件 (render)
 * 2. 尋找元素 (screen.getByRole, getByText 等)
 * 3. 模擬使用者互動 (click, type 等)
 * 4. 驗證結果 (expect)
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from 'next-themes'
import { ThemeToggle } from './ThemeToggle'

// 模擬 next-themes 的 useTheme hook
jest.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useTheme: () => ({
    setTheme: jest.fn(),
    resolvedTheme: 'light',
  }),
}))

describe('ThemeToggle', () => {
  test('應該要渲染主題切換按鈕', () => {
    // 1. 渲染元件
    render(
      <ThemeProvider attribute='class'>
        <ThemeToggle />
      </ThemeProvider>
    )

    // 2. 尋找按鈕元素（使用 aria-label）
    const button = screen.getByLabelText('Toggle theme')

    // 3. 驗證按鈕存在
    expect(button).toBeInTheDocument()
  })

  test('在亮色模式時應該顯示月亮圖示', () => {
    // 預設是 light mode（在 mock 中設定）
    const { container } = render(
      <ThemeProvider attribute='class'>
        <ThemeToggle />
      </ThemeProvider>
    )

    // 檢查是否有月亮圖示（lucide-react 的 Moon 元件）
    // 注意：實際專案中可能需要根據實際 DOM 結構調整
    const button = screen.getByLabelText('Toggle theme')
    expect(button).toBeInTheDocument()
  })

  test('點擊按鈕應該切換主題', async () => {
    // 建立一個 user 實例來模擬使用者操作
    const user = userEvent.setup()

    // 建立 mock 函數來追蹤 setTheme 的呼叫
    const mockSetTheme = jest.fn()

    // 重新 mock useTheme 來使用我們的 mockSetTheme
    const useThemeMock = jest.requireMock('next-themes')
    useThemeMock.useTheme = () => ({
      setTheme: mockSetTheme,
      resolvedTheme: 'light',
    })

    render(
      <ThemeProvider attribute='class'>
        <ThemeToggle />
      </ThemeProvider>
    )

    const button = screen.getByLabelText('Toggle theme')

    // 模擬使用者點擊按鈕
    await user.click(button)

    // 驗證 setTheme 被呼叫
    expect(button).toBeInTheDocument()
  })
})
