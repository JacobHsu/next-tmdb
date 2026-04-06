module.exports = {
  ci: {
    collect: {
      // 啟動 production server 的指令
      // 注意：必須先 npm run build，這裡啟動的是已 build 好的 server
      startServerCommand: 'npm run start',

      // lhci 會等到 terminal 輸出包含這段文字才開始測試
      // Next.js 15 啟動時會印出 "Ready in"
      startServerReadyPattern: 'Ready in',

      // 要測試的 URL 列表
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/tmdb',
      ],

      // 每個 URL 跑幾次，取中位數 → 減少網路抖動造成的誤差
      numberOfRuns: 3,
    },

    assert: {
      assertions: {
        // 'warn' = 不到門檻只警告，不會讓 lhci 失敗
        // 'error' = 不到門檻會 exit code 1（CI 會失敗）
        // minScore 範圍 0.0 ~ 1.0，0.8 = 80 分，0.9 = 90 分
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
      },
    },

    upload: {
      // 'filesystem' = 輸出到本地資料夾（不上傳到雲端）
      target: 'filesystem',

      // 報告存放的資料夾
      outputDir: '.lighthouseci',

      // 報告檔名格式：路徑-時間戳-report.html / report.json
      reportFilenamePattern: '%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%',
    },
  },
}
