/** GPX 파일 만들기 (순수 함수). 다른 러닝 앱·지도 서비스에서 불러올 수 있는 표준 형식. */

export type GpxPoint = {
  t: number; // 밀리초
  lat: number;
  lng: number;
  altitude: number | null;
};

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildGpx(name: string, points: GpxPoint[]): string {
  const trkpts = points
    .map((p) => {
      const ele = p.altitude !== null ? `<ele>${p.altitude.toFixed(1)}</ele>` : '';
      return `      <trkpt lat="${p.lat.toFixed(7)}" lon="${p.lng.toFixed(7)}">${ele}<time>${new Date(p.t).toISOString()}</time></trkpt>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="러닝메이트" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${escapeXml(name)}</name>
    <type>running</type>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`;
}
