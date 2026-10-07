import TextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';
import Constants, { ExecutionEnvironment } from 'expo-constants';

import type { MetricKey } from './metrics';
import { parseInbodyText } from './ocr';

/**
 * 사진 속 글자 읽기는 휴대폰 안의 구글 ML Kit로 한다 (인터넷으로 사진을 보내지 않음).
 * Expo Go에는 이 부품이 없어서, 개발용 빌드(러닝메이트 앱)에서만 쓸 수 있다.
 */
export const canReadPhoto = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

export async function readInbodyPhoto(uri: string): Promise<Partial<Record<MetricKey, number>>> {
  const result = await TextRecognition.recognize(uri, TextRecognitionScript.KOREAN);
  return parseInbodyText(result.text);
}
