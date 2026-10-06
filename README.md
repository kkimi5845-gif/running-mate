# 러닝메이트 (running-mate)

초보 러너를 위한 러닝 앱입니다. 질문과 인바디 수치로 나를 파악하고, "AI 러닝메이트"가 오늘 달릴지 쉴지,
어떻게 달릴지 추천합니다. GPS로 러닝을 기록하고 신발별 누적 거리를 관리합니다.

- React Native + Expo (SDK 57, TypeScript), Expo Router
- 모든 데이터는 휴대폰 안(SQLite)에만 저장되고 서버로 보내지 않습니다.

## 진행 상황

| 단계 | 내용 | 상태 |
|---|---|---|
| 1 | 프로젝트 생성, 탭 구조, DB 설정 | ✅ |
| 2 | 온보딩 질문 + 인바디 입력 | |
| 3 | GPS 기록측정 (백그라운드 포함) | |
| 4 | 신발 마일리지 | |
| 5 | 추천 엔진 + 단위 테스트 | |
| 6 | 러닝메이트 화면 (말풍선·톤 설정) | |
| 7 | 다듬기 | |

## 폰에서 실행하기 (처음 한 번 준비)

1. **Node.js 설치** — https://nodejs.org 에서 "LTS" 버전을 받아 설치합니다.
2. **Git 설치** — https://git-scm.com 에서 받아 설치합니다.
3. **안드로이드폰에 Expo Go 설치** — Play 스토어에서 "Expo Go"를 검색해 설치합니다.

## 폰에서 실행하기 (매번)

```bash
# 1) 코드 내려받기 (처음 한 번만)
git clone https://github.com/kkimi5845-gif/running-mate.git
cd running-mate

# 2) 필요한 부품 설치 (처음 한 번, 그리고 package.json이 바뀌었을 때)
npm install

# 3) 개발 서버 켜기 → 화면에 QR코드가 나옵니다
npx expo start
```

4. 폰에서 **Expo Go** 앱을 열고 **"Scan QR code"**로 컴퓨터 화면의 QR코드를 찍습니다.
5. 앱이 열리면 성공입니다.

**연결이 안 될 때**: 컴퓨터와 폰이 **같은 와이파이**에 연결돼 있는지 확인하세요.
그래도 안 되면 `npx expo start --tunnel`로 켜 보세요.

## 폴더 구조

```
src/
├── app/            화면 (파일 하나 = 화면 하나)
│   ├── _layout.tsx     앱 전체 틀 + DB 준비
│   └── (tabs)/         하단 탭: 홈 / 기록 / 신발 / 내 정보
├── components/     공통 부품 (글씨, 카드, 큰 버튼, 화면 틀)
├── db/             SQLite 연결과 마이그레이션
└── theme/          색상·글자 크기 (한 곳에서 관리)
```

## 개발 명령어

```bash
npm run typecheck   # 타입 검사
npm run lint        # 코드 규칙 검사
```
