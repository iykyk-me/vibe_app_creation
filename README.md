# vibe_app_creation
=======
# 바이브 코딩 동아리 앱

중학교 코딩 동아리 수업용 단계별 활동 앱

## 설치 및 실행

```bash
npm install
npm run dev
```

## 환경변수 설정

`.env.example`을 복사해서 `.env` 파일 생성 후 Supabase 정보 입력

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 교사 화면 접속

URL 뒤에 `#teacher` 추가
예) `https://your-app.netlify.app/#teacher`

비밀번호: `1234`

## 배포

Netlify 연동 후 자동 배포
