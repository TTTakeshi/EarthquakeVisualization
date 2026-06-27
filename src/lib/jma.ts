import { earthquakeEvents, type EarthquakeEvent } from "@/lib/earthquakes";

type JmaListEntry = {
  ctt?: string;
  eid?: string;
  rdt?: string;
  ttl?: string;
  ift?: string;
  at?: string;
  anm?: string;
  mag?: string;
  maxi?: string;
  cod?: string;
  json?: string;
  en_ttl?: string;
  en_anm?: string;
};

const JMA_LIST_URL = "https://www.jma.go.jp/bosai/quake/data/list.json";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export async function getEarthquakeEvents(): Promise<EarthquakeEvent[]> {
  try {
    const response = await fetch(JMA_LIST_URL, {
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      throw new Error(`JMA feed request failed: ${response.status}`);
    }

    const items = (await response.json()) as JmaListEntry[];
    const normalized = normalizeJmaEarthquakes(items);

    return normalized.length > 0 ? normalized : earthquakeEvents;
  } catch {
    return earthquakeEvents;
  }
}

function normalizeJmaEarthquakes(items: JmaListEntry[]): EarthquakeEvent[] {
  const grouped = new Map<string, JmaListEntry[]>();

  for (const item of items) {
    const eventId = item.eid?.trim();

    if (!eventId) {
      continue;
    }

    const list = grouped.get(eventId) ?? [];
    list.push(item);
    grouped.set(eventId, list);
  }

  const preferred = Array.from(grouped.values())
    .map(selectBestRecord)
    .filter((item): item is JmaListEntry => Boolean(item?.mag && item?.anm))
    .filter((item) => isWithinPastYear(item));

  return preferred.map((item, index) => convertRecordToEvent(item, index));
}

function isWithinPastYear(record: JmaListEntry) {
  const issuedAt = parseIssuedDate(record);

  if (!issuedAt) {
    return false;
  }

  return Date.now() - issuedAt.getTime() <= ONE_YEAR_MS;
}

function parseIssuedDate(record: JmaListEntry) {
  const raw = record.at ?? record.rdt;

  if (!raw) {
    return undefined;
  }

  const parsed = new Date(raw);

  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function selectBestRecord(records: JmaListEntry[]) {
  return (
    records.find((record) => record.ttl === "震源・震度情報") ??
    records.find((record) => record.ttl === "震源に関する情報") ??
    records.find((record) => record.ttl === "地震の情報") ??
    records[0]
  );
}

function convertRecordToEvent(record: JmaListEntry, index: number): EarthquakeEvent {
  const coordinates = parseCoordinates(record.cod);
  const depthKm = coordinates.depthKm ?? 10;
  const magnitude = Number.parseFloat(record.mag ?? "0");
  const intensity = record.maxi?.trim() ? `震度${record.maxi}` : "震度不明";
  const status = record.ttl === "震度速報" ? "速報" : record.ttl === "震源に関する情報" ? "更新" : "確定";

  return {
    id: record.eid ?? `jma-${index}`,
    place: record.anm ?? "気象庁地震情報",
    region: regionFromPlace(record.anm ?? ""),
    issuedAt: formatIssuedAt(record.at ?? record.rdt ?? ""),
    magnitude: Number.isFinite(magnitude) ? magnitude : 0,
    depthKm,
    intensityLabel: intensity,
    latitude: coordinates.latitude ?? 0,
    longitude: coordinates.longitude ?? 0,
    source: record.ttl ?? record.en_ttl ?? "気象庁API",
    detailJson: record.json,
    status,
    summary: buildSummary(record)
  };
}

function parseCoordinates(cod?: string) {
  if (!cod) {
    return {} as { latitude?: number; longitude?: number; depthKm?: number };
  }

  const matches = cod.match(/^([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)([+-]\d+)(?:\/)?$/);

  if (!matches) {
    return {} as { latitude?: number; longitude?: number; depthKm?: number };
  }

  const latitude = Number.parseFloat(matches[1]);
  const longitude = Number.parseFloat(matches[2]);
  const depthRaw = Number.parseInt(matches[3], 10);

  return {
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
    depthKm: Number.isFinite(depthRaw) ? Math.abs(depthRaw) / 1000 : undefined
  };
}

function formatIssuedAt(value: string) {
  if (!value) {
    return "--";
  }

  return value.replace("T", " ").replace(":00+09:00", "").replace("+09:00", "");
}

function regionFromPlace(place: string) {
  const prefixes = ["北海道", "東北", "関東", "中部", "近畿", "中国", "四国", "九州", "沖縄"];

  for (const prefix of prefixes) {
    if (place.includes(prefix)) {
      return prefix;
    }
  }

  return "全国";
}

function buildSummary(record: JmaListEntry) {
  const intensity = record.maxi?.trim() ? `最大震度${record.maxi}` : "震度情報なし";
  const magnitude = record.mag ? `M${record.mag}` : "規模未取得";

  return `${record.anm ?? "地震"}で${magnitude}、${intensity}の発表です。`;
}