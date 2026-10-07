import { parseInbodyText } from '../ocr';

describe('parseInbodyText', () => {
  it('한 줄에 항목과 숫자가 있는 결과지', () => {
    const text = [
      'InBody 체성분 결과지',
      '신장 165cm  연령 48',
      '체중 Weight (kg) 62.4 (48.6~65.8)',
      '골격근량 Skeletal Muscle Mass (kg) 23.1 (22.0~26.9)',
      '체지방량 Body Fat Mass (kg) 19.8',
      '체지방률 Percent Body Fat (%) 31.7 (18.0~28.0)',
    ].join('\n');
    expect(parseInbodyText(text)).toEqual({ heightCm: 165, weightKg: 62.4, skeletalMuscleKg: 23.1, bodyFatPct: 31.7 });
  });

  it('쉼표 소수점과 영어 약어', () => {
    expect(parseInbodyText('Weight 70,5 kg\nSMM 30,2 kg\nPBF 22,4 %')).toEqual({
      weightKg: 70.5,
      skeletalMuscleKg: 30.2,
      bodyFatPct: 22.4,
    });
  });

  it('표준 범위 숫자는 고르지 않는다', () => {
    expect(parseInbodyText('체중 55.0~74.5 68.2')).toEqual({ weightKg: 68.2 });
  });

  it('체중조절(Weight Control)의 숫자는 체중이 아니다', () => {
    expect(parseInbodyText('체중조절 -5.0 kg\nWeight Control 5.0')).toEqual({});
  });

  it('항목 이름만 줄줄이 나오고 숫자가 따로 있으면 비워 둔다 (틀린 값을 넣지 않기)', () => {
    expect(parseInbodyText('체중\n골격근량\n체지방량\n62.4\n23.1\n19.8')).toEqual({});
  });

  it('체지방량(kg)을 체지방률(%)로 착각하지 않는다', () => {
    expect(parseInbodyText('체지방량 19.8')).toEqual({});
  });

  it('범위를 벗어난 숫자는 버린다', () => {
    expect(parseInbodyText('체지방률 310')).toEqual({});
  });

  it('글자를 못 읽었으면 빈 결과', () => {
    expect(parseInbodyText('')).toEqual({});
  });
});
