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

export type EarthquakeForecastLevel = "low" | "elevated" | "high";

export type EarthquakeForecast = {
  level: EarthquakeForecastLevel;
  label: string;
  summary: string;
  confidence: string;
  expectedMagnitudeRange: string;
  expectedDepthRange: string;
  signals: string[];
  advice: string;
};

export type MagnitudeBand = "micro" | "minor" | "light" | "moderate" | "strong" | "major" | "great";

const magnitudeBandDefinitions: Array<{
  band: MagnitudeBand;
  min: number;
  max: number;
  label: string;
  range: string;
  tone: "calm" | "warning" | "danger";
}> = [
  { band: "micro", min: 0, max: 2, label: "Micro", range: "M0.0-1.9", tone: "calm" },
  { band: "minor", min: 2, max: 4, label: "Minor", range: "M2.0-3.9", tone: "calm" },
  { band: "light", min: 4, max: 5, label: "Light", range: "M4.0-4.9", tone: "calm" },
  { band: "moderate", min: 5, max: 6, label: "Moderate", range: "M5.0-5.9", tone: "warning" },
  { band: "strong", min: 6, max: 7, label: "Strong", range: "M6.0-6.9", tone: "warning" },
  { band: "major", min: 7, max: 8, label: "Major", range: "M7.0-7.9", tone: "danger" },
  { band: "great", min: 8, max: Number.POSITIVE_INFINITY, label: "Great", range: "M8.0+", tone: "danger" }
];

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
  const classification = classifyMagnitude(magnitude);

  return classification.tone;
}

export function classifyMagnitude(magnitude: number) {
  return (
    magnitudeBandDefinitions.find((definition) => magnitude >= definition.min && magnitude < definition.max) ??
    magnitudeBandDefinitions[0]
  );
}

export function magnitudeDisplay(magnitude: number) {
  const classification = classifyMagnitude(magnitude);

  return {
    ...classification,
    displayLabel: `${classification.label} (${classification.range})`
  };
}

export function magnitudePresentation(magnitude: number) {
  const classification = classifyMagnitude(magnitude);

  if (classification.band === "major" || classification.band === "great") {
    return "danger";
  }

  if (classification.band === "moderate" || classification.band === "strong") {
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

export function buildEarthquakeForecast(events: EarthquakeEvent[]): EarthquakeForecast {
  if (events.length === 0) {
    return {
      level: "low",
      label: "静穏",
      summary: "有効な地震イベントがないため、予想指標は算出できません。",
      confidence: "データ不足",
      expectedMagnitudeRange: "M0.0-0.0",
      expectedDepthRange: "0-0km",
      signals: ["イベントが未取得です"],
      advice: "データ取得後に再計算されます。"
    };
  }

  const sorted = sortByRecency(events);
  const sample = sorted.slice(0, Math.min(sorted.length, 6));
  const strongest = [...sample].sort((left, right) => right.magnitude - left.magnitude)[0] ?? sample[0];
  const averageMagnitude = sample.reduce((sum, event) => sum + event.magnitude, 0) / sample.length;
  const averageDepth = sample.reduce((sum, event) => sum + event.depthKm, 0) / sample.length;
  const shallowRatio = sample.filter((event) => event.depthKm <= 30).length / sample.length;
  const strongRatio = sample.filter((event) => event.magnitude >= 5.5).length / sample.length;
  const spreadHours = getSpreadHours(sample);
  const densityScore = Math.max(0, 24 - Math.min(24, spreadHours));

  const score = Math.round(
    Math.min(
      100,
      averageMagnitude * 11 + shallowRatio * 24 + strongRatio * 28 + densityScore * 1.2 + strongest.magnitude * 2
    )
  );

  const level: EarthquakeForecastLevel = score >= 68 ? "high" : score >= 42 ? "elevated" : "low";

  const labels: Record<EarthquakeForecastLevel, string> = {
    low: "静穏",
    elevated: "注意",
    high: "警戒"
  };

  const summaries: Record<EarthquakeForecastLevel, string> = {
    low: "現状は比較的落ち着いた推移です。小さめの揺れが続く場合は、周辺の動きだけ継続監視してください。",
    elevated:
      "M5級の地震や浅い震源が見られます。局地的に揺れが強まる可能性があるため、沿岸部と古い建物に注意してください。",
    high:
      "大きめの地震か、浅い震源が連続しています。余震や広い範囲の揺れを想定し、強い揺れへの備えを優先してください。"
  };

  const advice: Record<EarthquakeForecastLevel, string> = {
    low: "情報更新を追いながら、避難経路と備蓄の確認をしておくと安心です。",
    elevated: "家具固定、充電、海沿いの移動計画を再確認してください。",
    high: "揺れの強い可能性を前提に、家族・職場で行動基準を共有してください。"
  };

  return {
    level,
    label: labels[level],
    summary: summaries[level],
    confidence: `${score}%の参考指標`,
    expectedMagnitudeRange: formatMagnitudeRange(averageMagnitude, strongest.magnitude),
    expectedDepthRange: formatDepthRange(averageDepth),
    signals: [
      averageMagnitude >= 5 ? "M5級以上が中心" : "M4台中心",
      shallowRatio >= 0.5 ? "浅い震源が多い" : "深さは中間帯が中心",
      strongRatio >= 0.34 ? "M5.5以上が混在" : "大きな規模は限定的",
      spreadHours <= 8 ? "短時間に発生が集中" : "発生間隔は比較的ゆるやか"
    ],
    advice: advice[level]
  };
}

function formatMagnitudeRange(averageMagnitude: number, strongestMagnitude: number) {
  const min = Math.max(3, averageMagnitude - 0.4).toFixed(1);
  const max = Math.min(8.5, strongestMagnitude + 0.5).toFixed(1);

  return `M${min}-${max}`;
}

function formatDepthRange(averageDepth: number) {
  const min = Math.max(0, Math.round(Math.min(averageDepth, 40) - 8));
  const max = Math.round(Math.min(averageDepth + 12, 120));

  return `${min}-${max}km`;
}

function getSpreadHours(events: EarthquakeEvent[]) {
  if (events.length < 2) {
    return 0;
  }

  const times = events
    .map((event) => parseIssuedAt(event.issuedAt))
    .filter((time): time is number => Number.isFinite(time) && time > 0);

  if (times.length < 2) {
    return 0;
  }

  const latest = Math.max(...times);
  const earliest = Math.min(...times);

  return Math.max(0, (latest - earliest) / 1000 / 60 / 60);
}

function parseIssuedAt(issuedAt: string) {
  const normalized = issuedAt.replace(" ", "T");
  const parsed = Date.parse(`${normalized}:00+09:00`);

  return Number.isFinite(parsed) ? parsed : Number.NaN;
}