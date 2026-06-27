import { NextResponse } from "next/server";

type JmaIntensityStation = {
  Name?: string;
  Int?: string;
  latlon?: {
    lat?: number;
    lon?: number;
  };
};

type JmaCity = {
  Name?: string;
  IntensityStation?: JmaIntensityStation[] | "";
};

type JmaArea = {
  City?: JmaCity[];
};

type JmaPref = {
  Area?: JmaArea[];
};

type JmaDetailResponse = {
  Body?: {
    Intensity?: {
      Observation?: {
        Pref?: JmaPref[];
      };
    };
  };
};

const JMA_DETAIL_BASE = "https://www.jma.go.jp/bosai/quake/data/";
const DETAIL_FILE_PATTERN = /^\d{14}_\d{14}_[A-Za-z0-9]+_\d+\.json$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const detail = searchParams.get("detail")?.trim() ?? "";

  if (!DETAIL_FILE_PATTERN.test(detail)) {
    return NextResponse.json({ points: [] }, { status: 400 });
  }

  try {
    const response = await fetch(`${JMA_DETAIL_BASE}${detail}`, {
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      return NextResponse.json({ points: [] }, { status: 502 });
    }

    const payload = (await response.json()) as JmaDetailResponse;
    const points = extractIntensityPoints(payload);

    return NextResponse.json({ points });
  } catch {
    return NextResponse.json({ points: [] }, { status: 500 });
  }
}

function extractIntensityPoints(payload: JmaDetailResponse) {
  const prefs = payload.Body?.Intensity?.Observation?.Pref ?? [];
  const points: Array<{
    id: string;
    name: string;
    intensityLabel: string;
    latitude: number;
    longitude: number;
  }> = [];

  for (const pref of prefs) {
    for (const area of pref.Area ?? []) {
      for (const city of area.City ?? []) {
        const stations = Array.isArray(city.IntensityStation) ? city.IntensityStation : [];

        for (const station of stations) {
          const latitude = station.latlon?.lat;
          const longitude = station.latlon?.lon;

          if (typeof latitude !== "number" || typeof longitude !== "number") {
            continue;
          }

          const rawIntensity = (station.Int ?? "").trim();

          points.push({
            id: `${city.Name ?? "city"}-${station.Name ?? "station"}-${latitude}-${longitude}`,
            name: station.Name ?? city.Name ?? "観測点",
            intensityLabel: rawIntensity ? `震度${rawIntensity}` : "震度不明",
            latitude,
            longitude
          });
        }
      }
    }
  }

  return points;
}
