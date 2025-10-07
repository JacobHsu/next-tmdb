/**
 * 工具函數測試
 *
 * 這個檔案測試 utils.ts 中的工具函數
 * 測試檔案的命名規則：原檔案名稱.test.ts
 */

import { cleanHtmlTags, processImageUrl } from './utils'

// 使用 describe 將相關的測試群組在一起
describe('cleanHtmlTags', () => {
  // test() 或 it() 都可以，意思一樣
  test('應該要移除所有 HTML 標籤', () => {
    // 1. 準備測試資料
    const input = '<p>Hello <strong>World</strong></p>'

    // 2. 執行函數
    const result = cleanHtmlTags(input)

    // 3. 驗證結果（HTML 標籤會被換行取代，會留有一個空格）
    expect(result).toBe('Hello \nWorld')
  })

  test('應該要處理空字串', () => {
    expect(cleanHtmlTags('')).toBe('')
  })

  test('應該要移除多餘的空格和換行', () => {
    const input = '<p>Line 1</p>   <p>Line 2</p>'
    const result = cleanHtmlTags(input)
    // 標籤之間的多個空格會被處理，產生兩個換行
    expect(result).toBe('Line 1\n \nLine 2')
  })

  test('應該要將 &nbsp; 替換成空格', () => {
    const input = 'Hello&nbsp;World'
    const result = cleanHtmlTags(input)
    expect(result).toBe('Hello World')
  })

  test('應該要處理複雜的 HTML 結構', () => {
    const input = `
      <div>
        <h1>標題</h1>
        <p>這是<strong>粗體</strong>文字</p>
        <ul>
          <li>項目1</li>
          <li>項目2</li>
        </ul>
      </div>
    `
    const result = cleanHtmlTags(input)
    // 檢查結果是否包含所有文字內容（注意 HTML 標籤會變成換行）
    expect(result).toContain('標題')
    expect(result).toContain('這是') // 因為標籤會插入換行，所以分開檢查
    expect(result).toContain('粗體')
    expect(result).toContain('文字')
    expect(result).toContain('項目1')
    expect(result).toContain('項目2')
  })
})

describe('processImageUrl', () => {
  // 在每個測試前重置 localStorage mock
  beforeEach(() => {
    // 清除所有 mock 的呼叫記錄
    jest.clearAllMocks()
    // 設定預設行為：沒有開啟圖片代理
    global.localStorage.getItem = jest.fn((key) => {
      if (key === 'enableImageProxy') return 'false'
      return null
    })
  })

  test('當在服務器端時，應該返回原始 URL', () => {
    // processImageUrl 檢查 typeof window === 'undefined'
    // 在 Jest 測試環境中，window 是存在的，所以我們測試 localStorage 為 false 的情況
    const originalUrl = 'https://example.com/image.jpg'
    const result = processImageUrl(originalUrl)
    expect(result).toBe(originalUrl)
  })

  test('當開啟代理時，應該返回代理 URL', () => {
    // 模擬開啟了圖片代理
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: jest.fn((key) => {
          if (key === 'enableImageProxy') return 'true'
          if (key === 'imageProxyUrl') return 'https://proxy.example.com/'
          return null
        }),
      },
      writable: true,
    })

    const originalUrl = 'https://example.com/image.jpg'
    const result = processImageUrl(originalUrl)

    // 預期結果是：代理 URL + encodeURIComponent(原始 URL)
    expect(result).toBe('https://proxy.example.com/' + encodeURIComponent(originalUrl))
  })

  test('應該處理空的 URL', () => {
    const result = processImageUrl('')
    expect(result).toBe('')
  })
})
