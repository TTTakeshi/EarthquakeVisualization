export type EarthquakeEvent = {
  id: string;
  place: string;
  region: string;
  issuedAt: string;
  magnitude: number;
  depthKm: number;
  intensityLabel: string;
  latitude: number;
  longitude: number;
  source: string;
  status: "速報" | "更新" | "確定";
  summary: string;
};

export const earthquakeEvents: EarthquakeEvent[] = [
  {
    id: "eq-001",
    place: "三陸沖",
    region: "東北",
    issuedAt: "2026-06-27 08:14",
    magnitude: 5.8,
    depthKm: 32,
    intensityLabel: "震度4",
    latitude: 39.12,
    longitude: 143.05,
    source: "気象庁デモデータ",
    status: "速報",
    summary: "海域で浅めの地震。沿岸部で揺れを感じやすい想定です。"
  },
  {
    id: "eq-002",
    place: "能登半島沖",
    region: "北陸",
    issuedAt: "2026-06-27 07:40",
    magnitude: 4.9,
    depthKm: 16,
    intensityLabel: "震度3",
    latitude: 37.35,
    longitude: 137.18,
    source: "気象庁デモデータ",
    status: "更新",
    summary: "内陸寄りの浅い震源。局所的に強い揺れになりやすいタイプです。"
  },
  {
    id: "eq-003",
    place: "日向灘",
    region: "九州",
    issuedAt: "2026-06-26 23:18",
    magnitude: 6.2,
    depthKm: 44,
    intensityLabel: "震度4",
    latitude: 31.65,
    longitude: 131.85,
    source: "気象庁デモデータ",
    status: "確定",
    summary: "プレート境界付近の活動。広い範囲で波形の変化が出やすい震源です。"
  },
  {
    id: "eq-004",
    place: "関東地方南部",
    region: "関東",
    issuedAt: "2026-06-26 21:05",
    magnitude: 4.2,
    depthKm: 58,
    intensityLabel: "震度2",
    latitude: 35.42,
    longitude: 139.68,
    source: "気象庁デモデータ",
    status: "更新",
    summary: "深めの震源で、揺れの広がり方は比較的なだらかです。"
  },
  {
    id: "eq-005",
    place: "十勝沖",
    region: "北海道",
    issuedAt: "2026-06-26 18:47",
    magnitude: 5.4,
    depthKm: 38,
    intensityLabel: "震度3",
    latitude: 42.57,
    longitude: 145.02,
    source: "気象庁デモデータ",
    status: "確定",
    summary: "海底域の地震。沿岸の観測点で比較的一様な揺れとして現れやすいです。"
  },
  {
    id: "eq-006",
    place: "伊豆半島東方沖",
    region: "中部",
    issuedAt: "2026-06-26 16:22",
    magnitude: 4.7,
    depthKm: 24,
    intensityLabel: "震度3",
    latitude: 34.85,
    longitude: 139.12,
    source: "気象庁デモデータ",
    status: "速報",
    summary: "比較的近海の震源。沿岸の観測点で短時間の揺れが出やすいです。"
  }
];

export const statusOrder: Record<EarthquakeEvent["status"], number> = {
  速報: 0,
  更新: 1,
  確定: 2
};

export function sortByRecency(events: EarthquakeEvent[]): EarthquakeEvent[] {
  return [...events].sort((left, right) => {
    const statusDelta = statusOrder[left.status] - statusOrder[right.status];

    if (statusDelta !== 0) {
      return statusDelta;
    }

    return right.issuedAt.localeCompare(left.issuedAt);
  });
}

export function projectToMap(latitude: number, longitude: number) {
  const lonMin = 122;
  const lonMax = 154;
  const latMin = 24;
  const latMax = 46;

  const x = ((longitude - lonMin) / (lonMax - lonMin)) * 100;
  const y = (1 - (latitude - latMin) / (latMax - latMin)) * 100;

  return {
    x: Math.max(2, Math.min(98, x)),
    y: Math.max(2, Math.min(98, y))
  };
}

export function magnitudeTone(magnitude: number) {
  if (magnitude >= 6.0) {
    return "danger";
  }

  if (magnitude >= 5.0) {
    return "warning";
  }

  return "calm";
}

export function intensityLabel(intensity: number) {
  return `震度${intensity}`;
}

export function computeMetrics(events: EarthquakeEvent[]) {
  const strongest = [...events].sort((left, right) => right.magnitude - left.magnitude)[0];
  const recentAverage = events.reduce((sum, event) => sum + event.magnitude, 0) / events.length;
  const shallowCount = events.filter((event) => event.depthKm <= 30).length;

  return {
    total: events.length,
    strongest,
    recentAverage: recentAverage.toFixed(1),
    shallowCount
  };
}