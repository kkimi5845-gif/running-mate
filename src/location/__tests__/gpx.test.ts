import { buildGpx } from '../gpx';

describe('buildGpx', () => {
  it('좌표와 시간을 trkpt로 만든다', () => {
    const gpx = buildGpx('아침 러닝 <1>', [
      { t: Date.UTC(2026, 9, 7, 0, 0, 0), lat: 37.5, lng: 127, altitude: 30 },
      { t: Date.UTC(2026, 9, 7, 0, 0, 5), lat: 37.5001, lng: 127.0001, altitude: null },
    ]);
    expect(gpx).toContain('<name>아침 러닝 &lt;1&gt;</name>');
    expect(gpx).toContain(
      '<trkpt lat="37.5000000" lon="127.0000000"><ele>30.0</ele><time>2026-10-07T00:00:00.000Z</time></trkpt>',
    );
    expect(gpx).toContain('<trkpt lat="37.5001000" lon="127.0001000"><time>2026-10-07T00:00:05.000Z</time></trkpt>');
  });
});
