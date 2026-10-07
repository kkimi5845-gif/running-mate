import { Alert } from 'react-native';

/** 오류 내용을 짧게 (개발자에게 알려 줄 때 쓰는 꼬리표) */
export function errorDetail(e: unknown): string {
  const text = e instanceof Error ? e.message : String(e);
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
}

/**
 * 문제가 생겼을 때 쉬운 말 안내 + 다시 해 볼 방법을 보여 준다.
 * 영어 오류 문구는 맨 아래 작게(개발자에게 알려 줄 용도) 붙인다.
 */
export function showError(title: string, e: unknown, hint = '잠시 후 다시 시도해 주세요.') {
  Alert.alert(title, `${hint}\n계속되면 앱을 완전히 껐다가 다시 열어 주세요.\n\n(오류 내용: ${errorDetail(e)})`);
}
