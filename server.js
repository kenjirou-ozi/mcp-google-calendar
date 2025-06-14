const express = require('express');
const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// JSON パースのミドルウェア
app.use(express.json());

// CORS設定（カスタムGPTからのアクセス用）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Google Calendar API設定
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const CREDENTIALS_PATH = path.join(__dirname, 'google-credentials.json');

// Google認証
async function authorize() {
  const credentials = require(CREDENTIALS_PATH);
  const { client_email, private_key } = credentials;
  
  const auth = new google.auth.JWT(
    client_email,
    null,
    private_key,
    SCOPES
  );
  
  return auth;
}

// カレンダー予定追加エンドポイント
app.post('/add-event', async (req, res) => {
  try {
    const { title, startDateTime, endDateTime, description = '', calendarId = 'primary' } = req.body;
    
    // 入力検証
    if (!title || !startDateTime || !endDateTime) {
      return res.status(400).json({
        error: 'タイトル、開始時間、終了時間は必須です'
      });
    }
    
    // Google認証
    const auth = await authorize();
    const calendar = google.calendar({ version: 'v3', auth });
    
    // イベント作成
    const event = {
      summary: title,
      description: description,
      start: {
        dateTime: startDateTime,
        timeZone: 'Asia/Tokyo',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'Asia/Tokyo',
      },
    };
    
    const response = await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
    });
    
    res.json({
      success: true,
      message: '予定が正常に追加されました',
      eventId: response.data.id,
      eventLink: response.data.htmlLink
    });
    
  } catch (error) {
    console.error('予定追加エラー:', error);
    res.status(500).json({
      error: '予定の追加に失敗しました',
      details: error.message
    });
  }
});

// ヘルスチェック用エンドポイント
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'MCP Calendar Server is running' });
});

// ルート
app.get('/', (req, res) => {
  res.json({
    message: 'MCP Google Calendar Server',
    endpoints: {
      health: '/health',
      addEvent: '/add-event (POST)'
    }
  });
});

// サーバー起動
app.listen(port, () => {
  console.log(`MCP Calendar Server running on port ${port}`);
});
