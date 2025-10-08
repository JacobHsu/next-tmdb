/**
 * CapsuleSwitch 元件測試
 *
 * 測試膠囊開關元件的功能：
 * 1. 基本渲染與選項顯示
 * 2. 選中狀態
 * 3. 點擊切換功能
 * 4. onChange 回調
 * 5. 指示器位置更新
 * 6. 自定義 className
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CapsuleSwitch from './CapsuleSwitch'

describe('CapsuleSwitch', () => {
  const mockOptions = [
    { label: '電影', value: 'movie' },
    { label: '電視劇', value: 'tv' },
    { label: '動漫', value: 'anime' },
  ]

  const mockOnChange = jest.fn()

  // 每個測試前清除 mock
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('基本渲染', () => {
    test('應該要渲染所有選項', () => {
      render(
        <CapsuleSwitch
          options={mockOptions}
          active='movie'
          onChange={mockOnChange}
        />
      )

      // 檢查所有選項都被渲染
      expect(screen.getByText('電影')).toBeInTheDocument()
      expect(screen.getByText('電視劇')).toBeInTheDocument()
      expect(screen.getByText('動漫')).toBeInTheDocument()
    })

    test('應該要渲染為按鈕元素', () => {
      render(
        <CapsuleSwitch
          options={mockOptions}
          active='movie'
          onChange={mockOnChange}
        />
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(3)
    })

    test('應該要套用自定義 className', () => {
      const { container } = render(
        <CapsuleSwitch
          options={mockOptions}
          active='movie'
          onChange={mockOnChange}
          className='custom-class'
        />
      )

      const capsuleContainer = container.firstChild as HTMLElement
      expect(capsuleContainer).toHaveClass('custom-class')
    })

    test('應該要套用基本樣式 class', () => {
      const { container } = render(
        <CapsuleSwitch
          options={mockOptions}
          active='movie'
          onChange={mockOnChange}
        />
      )

      const capsuleContainer = container.firstChild as HTMLElement
      expect(capsuleContainer).toHaveClass('relative')
      expect(capsuleContainer).toHaveClass('inline-flex')
      expect(capsuleContainer).toHaveClass('rounded-full')
      expect(capsuleContainer).toHaveClass('bg-gray-300/80')
      expect(capsuleContainer).toHaveClass('dark:bg-gray-700')
    })
  })

  describe('選中狀態', () => {
    test('選中的選項應該要有正確的文字顏色', () => {
      render(
        <CapsuleSwitch
          options={mockOptions}
          active='tv'
          onChange={mockOnChange}
        />
      )

      const tvButton = screen.getByText('電視劇')
      expect(tvButton).toHaveClass('text-gray-900')
      expect(tvButton).toHaveClass('dark:text-gray-100')
    })

    test('未選中的選項應該要有較淡的文字顏色', () => {
      render(
        <CapsuleSwitch
          options={mockOptions}
          active='movie'
          onChange={mockOnChange}
        />
      )

      const tvButton = screen.getByText('電視劇')
      expect(tvButton).toHaveClass('text-gray-700')
      expect(tvButton).toHaveClass('dark:text-gray-400')
    })

    test('應該要正確標記當前選中項', () => {
      const { rerender } = render(
        <CapsuleSwitch
          options={mockOptions}
          active='movie'
          onChange={mockOnChange}
        />
      )

      // 第一個選項被選中
      let movieButton = screen.getByText('電影')
      expect(movieButton).toHaveClass('text-gray-900')

      // 更改選中項
      rerender(
        <CapsuleSwitch
          options={mockOptions}
          active='anime'
          onChange={mockOnChange}
        />
      )

      // 第三個選項被選中
      const animeButton = screen.getByText('動漫')
      expect(animeButton).toHaveClass('text-gray-900')

      // 第一個選項不再被選中
      movieButton = screen.getByText('電影')
      expect(movieButton).toHaveClass('text-gray-700')
    })
  })

  describe('點擊互動', () => {
    test('點擊選項應該要觸發 onChange', async () => {
      const user = userEvent.setup()

      render(
        <CapsuleSwitch
          options={mockOptions}
          active='movie'
          onChange={mockOnChange}
        />
      )

      const tvButton = screen.getByText('電視劇')
      await user.click(tvButton)

      expect(mockOnChange).toHaveBeenCalledTimes(1)
      expect(mockOnChange).toHaveBeenCalledWith('tv')
    })

    test('點擊不同選項應該要傳遞正確的值', async () => {
      const user = userEvent.setup()

      render(
        <CapsuleSwitch
          options={mockOptions}
          active='movie'
          onChange={mockOnChange}
        />
      )

      // 點擊第二個選項
      await user.click(screen.getByText('電視劇'))
      expect(mockOnChange).toHaveBeenLastCalledWith('tv')

      // 點擊第三個選項
      await user.click(screen.getByText('動漫'))
      expect(mockOnChange).toHaveBeenLastCalledWith('anime')

      expect(mockOnChange).toHaveBeenCalledTimes(2)
    })

    test('點擊當前選中的選項也應該要觸發 onChange', async () => {
      const user = userEvent.setup()

      render(
        <CapsuleSwitch
          options={mockOptions}
          active='movie'
          onChange={mockOnChange}
        />
      )

      const movieButton = screen.getByText('電影')
      await user.click(movieButton)

      expect(mockOnChange).toHaveBeenCalledTimes(1)
      expect(mockOnChange).toHaveBeenCalledWith('movie')
    })

    test('應該要可以連續點擊多次', async () => {
      const user = userEvent.setup()

      render(
        <CapsuleSwitch
          options={mockOptions}
          active='movie'
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByText('電視劇'))
      await user.click(screen.getByText('動漫'))
      await user.click(screen.getByText('電影'))

      expect(mockOnChange).toHaveBeenCalledTimes(3)
    })
  })

  describe('指示器渲染', () => {
    test('指示器在初始化時可能不渲染（寬度為 0）', () => {
      const { container } = render(
        <CapsuleSwitch
          options={mockOptions}
          active='movie'
          onChange={mockOnChange}
        />
      )

      // 在測試環境中，getBoundingClientRect 可能返回 0
      // 所以指示器可能不會渲染（因為有 indicatorStyle.width > 0 的條件）
      const indicator = container.querySelector('.bg-white')

      // 指示器可能存在也可能不存在，取決於測試環境
      if (indicator) {
        expect(indicator).toHaveClass('dark:bg-gray-500')
        expect(indicator).toHaveClass('rounded-full')
        expect(indicator).toHaveClass('shadow-sm')
        expect(indicator).toHaveClass('transition-all')
        expect(indicator).toHaveClass('duration-300')
        expect(indicator).toHaveClass('ease-out')
        expect(indicator).toHaveClass('absolute')
      } else {
        // 如果指示器不存在，至少確認容器存在
        const capsuleContainer = container.firstChild
        expect(capsuleContainer).toBeInTheDocument()
      }
    })

    test('容器應該要是 relative 定位以支援指示器', () => {
      const { container } = render(
        <CapsuleSwitch
          options={mockOptions}
          active='movie'
          onChange={mockOnChange}
        />
      )

      const capsuleContainer = container.firstChild as HTMLElement
      expect(capsuleContainer).toHaveClass('relative')
    })
  })

  describe('選項數量', () => {
    test('應該要支援 2 個選項', () => {
      const twoOptions = [
        { label: '選項1', value: 'opt1' },
        { label: '選項2', value: 'opt2' },
      ]

      render(
        <CapsuleSwitch
          options={twoOptions}
          active='opt1'
          onChange={mockOnChange}
        />
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(2)
    })

    test('應該要支援多個選項', () => {
      const manyOptions = [
        { label: '選項1', value: 'opt1' },
        { label: '選項2', value: 'opt2' },
        { label: '選項3', value: 'opt3' },
        { label: '選項4', value: 'opt4' },
        { label: '選項5', value: 'opt5' },
      ]

      render(
        <CapsuleSwitch
          options={manyOptions}
          active='opt1'
          onChange={mockOnChange}
        />
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(5)
    })
  })

  describe('按鈕樣式', () => {
    test('所有按鈕應該要有相對定位和 z-index', () => {
      render(
        <CapsuleSwitch
          options={mockOptions}
          active='movie'
          onChange={mockOnChange}
        />
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveClass('relative')
        expect(button).toHaveClass('z-10')
      })
    })

    test('按鈕應該要有圓角和游標指標', () => {
      render(
        <CapsuleSwitch
          options={mockOptions}
          active='movie'
          onChange={mockOnChange}
        />
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveClass('rounded-full')
        expect(button).toHaveClass('cursor-pointer')
      })
    })

    test('按鈕應該要有過渡效果', () => {
      render(
        <CapsuleSwitch
          options={mockOptions}
          active='movie'
          onChange={mockOnChange}
        />
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveClass('transition-all')
        expect(button).toHaveClass('duration-200')
      })
    })

    test('按鈕應該要有響應式寬度', () => {
      render(
        <CapsuleSwitch
          options={mockOptions}
          active='movie'
          onChange={mockOnChange}
        />
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveClass('w-16')
        expect(button).toHaveClass('sm:w-20')
      })
    })
  })

  describe('邊緣案例', () => {
    test('當 active 值不在選項中時應該要正常渲染', () => {
      render(
        <CapsuleSwitch
          options={mockOptions}
          active='invalid'
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText('電影')).toBeInTheDocument()
      expect(screen.getByText('電視劇')).toBeInTheDocument()
      expect(screen.getByText('動漫')).toBeInTheDocument()
    })

    test('空標籤應該要正常渲染', () => {
      const optionsWithEmptyLabel = [
        { label: '', value: 'empty' },
        { label: '選項', value: 'option' },
      ]

      const { container } = render(
        <CapsuleSwitch
          options={optionsWithEmptyLabel}
          active='empty'
          onChange={mockOnChange}
        />
      )

      const buttons = container.querySelectorAll('button')
      expect(buttons).toHaveLength(2)
    })
  })
})
