const nextJest = require('next/jest')

// 建立 Next.js Jest 配置
const createJestConfig = nextJest({
  // 提供你的 Next.js app 路徑，這會載入 next.config.js 和 .env 檔案
  dir: './',
})

// 自訂 Jest 配置
const customJestConfig = {
  // 測試環境設定為 jsdom（模擬瀏覽器環境）
  testEnvironment: 'jest-environment-jsdom',

  // 測試前要執行的設定檔案
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // 模組路徑映射（對應 tsconfig.json 的 paths）
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // 收集測試覆蓋率的檔案範圍
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/_*.{js,jsx,ts,tsx}', // 忽略 _app.tsx, _document.tsx 等
  ],

  // 測試檔案的匹配模式
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],

  // 忽略的目錄
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
  ],
}

// 使用 createJestConfig 確保 Next.js 的配置被正確載入
module.exports = createJestConfig(customJestConfig)
