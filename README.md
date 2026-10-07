# 러닝메이트 (running-mate)

초보 러너를 위한 러닝 앱입니다. 질문과 인바디 수치로 나를 파악하고, "AI 러닝메이트"가 오늘 달릴지 쉴지,
어떻게 달릴지 추천합니다. GPS로 러닝을 기록하고 신발별 누적 거리를 관리합니다.

- React Native + Expo (SDK 57, TypeScript), Expo Router
- 모든 데이터는 휴대폰 안(SQLite)에만 저장되고 서버로 보내지 않습니다.

## 진행 상황

| 단계 | 내용 | 상태 |
|---|---|---|
| 1 | 프로젝트 생성, 탭 구조, DB 설정 | ✅ |
| 2 | 온보딩 질문 + 인바디 입력 (결과지 사진 첨부) | ✅ |
| 3 | GPS 기록측정 (백그라운드 포함) | ✅ (화면 끈 상태는 개발용 빌드에서 확인 예정) |
| 4 | 신발 마일리지 | ✅ |
| 5 | 추천 엔진 + 단위 테스트 | ✅ |
| 6 | 러닝메이트 화면 (말풍선·톤·이름·소리, 코스 추천) | 🔍 폰 확인 중 |
| 6-2 | 달리는 중 음성 코칭 | |
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
npx expo start --go        # Expo Go 앱으로 열 때
npx expo start             # 개발용 빌드(러닝메이트 테스트 앱)로 열 때
```

4. 폰에서 **Expo Go** 앱을 열고 **"Scan QR code"**로 컴퓨터 화면의 QR코드를 찍습니다.
5. 앱이 열리면 성공입니다.

**연결이 안 될 때** (Expo Go에 `Failed to download remote update`가 나올 때):
공유기가 기기끼리의 연결을 막는 경우가 많습니다. **폰의 모바일 핫스팟을 켜고 컴퓨터를 그 핫스팟에 연결**한 뒤
`npx expo start`를 다시 실행하면 됩니다.

## 개발용 빌드 (화면이 꺼져도 GPS 기록하기)

Expo Go는 백그라운드 위치 기록을 지원하지 않아서, 화면을 끄고 달리는 테스트는 **개발용 빌드**(내 앱 전용 테스트 앱)가 필요합니다.
새 네이티브 부품을 추가할 때만 다시 만들면 되고, 화면·코드 수정은 지금처럼 바로 반영됩니다.

1. https://expo.dev 에서 무료 계정을 만듭니다.
2. 명령 프롬프트에서 로그인합니다: `npx eas-cli@latest login`
3. 빌드를 요청합니다: `npx eas-cli@latest build --profile development --platform android`
   - 처음에 묻는 질문(프로젝트 만들기, 서명 키 만들기)은 모두 `Y`로 답합니다.
   - Expo 서버에서 앱을 만드는 데 10~30분 정도 걸립니다.
4. 끝나면 나오는 QR코드를 폰 카메라로 찍어 APK를 받아 설치합니다. ("출처를 알 수 없는 앱" 설치 허용 필요)
5. 컴퓨터에서 `npx expo start` → 폰에 설치된 **러닝메이트** 앱을 열고 서버를 고르거나 QR을 찍습니다.

## 폴더 구조

```
src/
├── app/            화면 (파일 하나 = 화면 하나)
│   ├── _layout.tsx     앱 전체 틀 + DB 준비
│   └── (tabs)/         하단 탭: 홈 / 기록 / 신발 / 내 정보
├── components/     공통 부품 (글씨, 카드, 큰 버튼, 화면 틀)
├── db/             SQLite 연결, 마이그레이션, 테이블별 읽기·쓰기
├── location/       GPS 기록(백그라운드), 거리·페이스 계산, GPX
├── engine/         추천 엔진 (rules.ts에 규칙 모음, recommend.ts 계산)
├── mate/           러닝메이트 말(generateMateMessage), 말투 문구, 음성
├── shoes/          신발 교체 시점 판단
├── photos/         사진 첨부(앱 폴더에만 저장)
└── theme/          색상·글자 크기 (한 곳에서 관리)
```

## 개발 명령어

```bash
npm run typecheck   # 타입 검사
npm run lint        # 코드 규칙 검사
npm test            # 단위 테스트 (GPS 거리 계산, 기록 저장 등)
```
