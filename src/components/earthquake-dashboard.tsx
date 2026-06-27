"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import {
  buildEarthquakeForecast,
  classifyMagnitude,
  computeMetrics,
  magnitudeDisplay,
  magnitudeTone,
  sortByRecency,
  type EarthquakeEvent
} from "@/lib/earthquakes";

const focusLevels = [
  { value: 0, label: "すべて" },
  { value: 4.5, label: "M4.5+" },
  { value: 5.0, label: "M5.0+" },
  { value: 5.5, label: "M5.5+" },
  { value: 6.0, label: "M6.0+" }
];
const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

const magnitudeBandOrder = ["micro", "minor", "light", "moderate", "strong", "major", "great"] as const;

const magnitudeBandLabels: Record<(typeof magnitudeBandOrder)[number], string> = {
  micro: "Micro",
  minor: "Minor",
  light: "Light",
  moderate: "Moderate",
  strong: "Strong",
  major: "Major",
  great: "Great"
};

const magnitudeBandRanges: Record<(typeof magnitudeBandOrder)[number], string> = {
  micro: "M0.0-1.9",
  minor: "M2.0-3.9",
  light: "M4.0-4.9",
  moderate: "M5.0-5.9",
  strong: "M6.0-6.9",
  major: "M7.0-7.9",
  great: "M8.0+"
};

const bandColorByTone: Record<ReturnType<typeof magnitudeTone>, string> = {
  calm: "#5be7d5",
  warning: "#ffb35c",
  danger: "#ff6c63"
};

const bandSizeByMagnitude: Record<(typeof magnitudeBandOrder)[number], number> = {
  micro: 26,
  minor: 28,
  light: 32,
  moderate: 38,
  strong: 44,
  major: 50,
  great: 56
};

type MapIntensityPoint = {
  id: string;
  name: string;
  intensityLabel: string;
  latitude: number;
  longitude: number;
};

export function EarthquakeDashboard({ events }: { events: EarthquakeEvent[] }) {
  const [minimumMagnitude, setMinimumMagnitude] = useState(4.5);
  const [selectedId, setSelectedId] = useState(() => sortByRecency(events)[0]?.id ?? "");
  const [shouldShowIntensityOnMap, setShouldShowIntensityOnMap] = useState(false);
  const [shouldFocusSingleLocation, setShouldFocusSingleLocation] = useState(false);
  const [nearbyIntensityPoints, setNearbyIntensityPoints] = useState<MapIntensityPoint[]>([]);
  const [showAllNearbyLabels, setShowAllNearbyLabels] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [currentMapZoom, setCurrentMapZoom] = useState<number | null>(null);
  const { isLoaded, loadError } = useJsApiLoader({
    id: "earthquake-google-map",
    googleMapsApiKey,
    language: "ja",
    region: "JP"
  });

  const filteredEvents = useMemo(() => {
    return sortByRecency(events).filter((event) => event.magnitude >= minimumMagnitude);
  }, [events, minimumMagnitude]);

  const effectiveEvents = filteredEvents.length > 0 ? filteredEvents : sortByRecency(events);
  const isFilterFallback = filteredEvents.length === 0 && minimumMagnitude > 0;

  const selectedEvent = effectiveEvents.find((event) => event.id === selectedId) ?? effectiveEvents[0] ?? events[0];
  const metrics = computeMetrics(effectiveEvents);
  const selectedMagnitudeDisplay = selectedEvent ? magnitudeDisplay(selectedEvent.magnitude) : undefined;
  const selectedMagnitudeTone = selectedEvent ? magnitudeTone(selectedEvent.magnitude) : "calm";
  const forecast = useMemo(() => buildEarthquakeForecast(effectiveEvents), [effectiveEvents]);
  const latestEvent = effectiveEvents[0];

  const mapCenter = useMemo(
    () => ({ lat: selectedEvent?.latitude ?? 36.2048, lng: selectedEvent?.longitude ?? 138.2529 }),
    [selectedEvent?.latitude, selectedEvent?.longitude]
  );

  const mapZoom = useMemo(() => getMapZoom(selectedEvent?.magnitude ?? 0), [selectedEvent?.magnitude]);
  const zoomScale = useMemo(() => getZoomScale(currentMapZoom ?? mapZoom), [currentMapZoom, mapZoom]);

  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: true,
      zoomControl: true,
      fullscreenControl: true,
      mapTypeControl: true,
      streetViewControl: false,
      clickableIcons: false
    }),
    []
  );

  const magnitudeBands = useMemo(
    () =>
      magnitudeBandOrder.map((band) => ({
        band,
        label: magnitudeBandLabels[band],
        range: magnitudeBandRanges[band],
        count: events.filter((event) => classifyMagnitude(event.magnitude).band === band).length
      })),
    [events]
  );

  const chartEvents = effectiveEvents;
  const mapEvents = shouldFocusSingleLocation && selectedEvent ? [selectedEvent] : effectiveEvents;
  const visibleNearbyPoints = useMemo(() => {
    if (!shouldFocusSingleLocation || !selectedEvent) {
      return [] as MapIntensityPoint[];
    }

    const prioritized = nearbyIntensityPoints
      .map((point) => ({
        point,
        rank: intensityRank(point.intensityLabel),
        distanceKm: distanceKm(selectedEvent.latitude, selectedEvent.longitude, point.latitude, point.longitude)
      }))
      .sort((left, right) => right.rank - left.rank || left.distanceKm - right.distanceKm);

    return prioritized.map((entry) => entry.point);
  }, [nearbyIntensityPoints, selectedEvent, shouldFocusSingleLocation]);

  useEffect(() => {
    if (!shouldFocusSingleLocation || !selectedEvent?.detailJson) {
      setNearbyIntensityPoints([]);

      return;
    }

    setNearbyIntensityPoints([]);

    let cancelled = false;

    const loadNearbyIntensity = async () => {
      try {
        const response = await fetch(`/api/earthquake-intensity?detail=${encodeURIComponent(selectedEvent.detailJson ?? "")}`);

        if (!response.ok) {
          if (!cancelled) {
            setNearbyIntensityPoints([]);
          }

          return;
        }

        const payload = (await response.json()) as { points?: MapIntensityPoint[] };

        if (!cancelled) {
          setNearbyIntensityPoints(payload.points ?? []);
        }
      } catch {
        if (!cancelled) {
          setNearbyIntensityPoints([]);
        }
      }
    };

    loadNearbyIntensity();

    return () => {
      cancelled = true;
    };
  }, [selectedEvent?.detailJson, shouldFocusSingleLocation]);

  const selectEvent = (eventId: string) => {
    setSelectedId(eventId);
    setShouldShowIntensityOnMap(true);
    setShouldFocusSingleLocation(true);
    setNearbyIntensityPoints([]);
  };

  const timeBands = useMemo(() => {
    return [
      {
        label: "深夜 (0-3時)",
        value: chartEvents.filter((event) => inHourRange(event.issuedAt, 0, 3)).length
      },
      {
        label: "早朝 (4-7時)",
        value: chartEvents.filter((event) => inHourRange(event.issuedAt, 4, 7)).length
      },
      {
        label: "朝 (8-11時)",
        value: chartEvents.filter((event) => inHourRange(event.issuedAt, 8, 11)).length
      },
      {
        label: "昼 (12-15時)",
        value: chartEvents.filter((event) => inHourRange(event.issuedAt, 12, 15)).length
      },
      {
        label: "夕方 (16-19時)",
        value: chartEvents.filter((event) => inHourRange(event.issuedAt, 16, 19)).length
      },
      {
        label: "夜 (20-23時)",
        value: chartEvents.filter((event) => inHourRange(event.issuedAt, 20, 23)).length
      }
    ];
  }, [chartEvents]);

  const depthBands = useMemo(() => {
    return [
      { label: "浅い (0-30km)", value: chartEvents.filter((event) => event.depthKm <= 30).length },
      { label: "中間 (31-70km)", value: chartEvents.filter((event) => event.depthKm > 30 && event.depthKm <= 70).length },
      { label: "深い (71km以上)", value: chartEvents.filter((event) => event.depthKm > 70).length }
    ];
  }, [chartEvents]);

  const magnitudeHistogram = useMemo(() => {
    return [
      { label: "M4.4以下", value: chartEvents.filter((event) => event.magnitude < 4.5).length },
      {
        label: "M4.5-4.9",
        value: chartEvents.filter((event) => event.magnitude >= 4.5 && event.magnitude < 5.0).length
      },
      {
        label: "M5.0-5.9",
        value: chartEvents.filter((event) => event.magnitude >= 5.0 && event.magnitude < 6.0).length
      },
      { label: "M6.0以上", value: chartEvents.filter((event) => event.magnitude >= 6.0).length }
    ];
  }, [chartEvents]);

  if (!selectedEvent) {
    return (
      <main className="shell">
        <section className="hero-card">
          <div className="hero-copy">
            <div className="eyebrow">Japan seismic overview</div>
            <h1>地震情報を取得できませんでした</h1>
            <p>気象庁 API への接続失敗時は、次回更新で再試行します。</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="hero-card">
        <div className="hero-copy">
          <div className="eyebrow">Japan seismic overview</div>
          <h1>地震を地図・一覧・指標で一目で把握する</h1>
          <p>
            気象庁の公開データを直接取り込み、最新の震源・規模・深さ・震度をまとめて確認できるダッシュボードです。
          </p>

          <div className="hero-actions">
            {focusLevels.map((level) => (
              <button
                key={level.value}
                type="button"
                className={level.value === minimumMagnitude ? "chip chip-active" : "chip"}
                onClick={() => setMinimumMagnitude(level.value)}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>

        <div className="hero-stats">
          <StatCard label="観測件数" value={`${metrics.total}件`} detail="表示中の地震イベント" />
          <StatCard label="最大規模" value={`M${metrics.strongest.magnitude.toFixed(1)}`} detail={metrics.strongest.place} />
          <StatCard label="平均規模" value={`M${metrics.recentAverage}`} detail="表示範囲の平均" />
          <StatCard
            label="最新発生"
            value={latestEvent ? latestEvent.issuedAt.split(" ")[1] : "--:--"}
            detail={latestEvent ? latestEvent.place : "データなし"}
          />
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel map-panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">seismic map</span>
              <h2>発生位置の俯瞰</h2>
            </div>
            <div className="panel-badge">深さ30km以下 {metrics.shallowCount}件</div>
          </div>

          <div className={`magnitude-badge magnitude-badge-${selectedMagnitudeTone}`}>
            Global standard: {selectedMagnitudeDisplay?.displayLabel ?? "Unknown"}
          </div>

          <p className="panel-note">
            地点を選択すると、震源地にフォーカスし周辺観測点の震度を表示します。
            {shouldFocusSingleLocation && `（表示 ${visibleNearbyPoints.length} / 取得 ${nearbyIntensityPoints.length} 件）`}
          </p>

          {shouldFocusSingleLocation && nearbyIntensityPoints.length > 0 && (
            <div className="hero-actions" style={{ marginTop: 0, marginBottom: 10 }}>
              <button
                type="button"
                className={showAllNearbyLabels ? "chip chip-active" : "chip"}
                onClick={() => setShowAllNearbyLabels((current) => !current)}
              >
                {showAllNearbyLabels ? "周辺ラベルを簡易表示" : "周辺ラベルを全表示"}
              </button>
            </div>
          )}

          <div className="map-frame">
            {!googleMapsApiKey && (
              <div className="map-fallback" role="status" aria-live="polite">
                <h3>Google Maps API キーが未設定です</h3>
                <p>.env.local に NEXT_PUBLIC_GOOGLE_MAPS_API_KEY を追加すると地図が表示されます。</p>
              </div>
            )}

            {googleMapsApiKey && loadError && (
              <div className="map-fallback" role="status" aria-live="polite">
                <h3>Google Maps の読み込みに失敗しました</h3>
                <p>API キー、リファラー制限、または Maps JavaScript API の有効化状態を確認してください。</p>
              </div>
            )}

            {googleMapsApiKey && !loadError && !isLoaded && (
              <div className="map-fallback" role="status" aria-live="polite">
                <h3>地図を読み込み中です</h3>
                <p>Google Maps API への接続を待っています。</p>
              </div>
            )}

            {googleMapsApiKey && isLoaded && (
              <GoogleMap
                mapContainerClassName="map-canvas"
                center={mapCenter}
                zoom={mapZoom}
                options={mapOptions}
                onLoad={(map) => {
                  setMapInstance(map);
                  setCurrentMapZoom(map.getZoom() ?? mapZoom);
                }}
                onZoomChanged={() => {
                  const nextZoom = mapInstance?.getZoom();

                  if (typeof nextZoom === "number") {
                    setCurrentMapZoom(nextZoom);
                  }
                }}
              >
                {mapEvents.map((event) => {
                  const display = magnitudeDisplay(event.magnitude);
                  const highlighted = event.id === selectedEvent.id;
                  const markerIcon = createMagnitudeMarkerIcon(event.magnitude, zoomScale);
                  const intensityText = mapIntensityLabel(event.intensityLabel);
                  const intensityColor = mapIntensityLabelColor(event.intensityLabel);
                  const markerLabel = shouldShowIntensityOnMap
                    ? {
                        text: intensityText,
                        color: intensityColor,
                        fontWeight: "700",
                        fontSize: `${Math.round(16 * zoomScale)}px`
                      }
                    : undefined;

                  return (
                    <MarkerF
                      key={event.id}
                      position={{ lat: event.latitude, lng: event.longitude }}
                      icon={markerIcon}
                      label={markerLabel}
                      zIndex={highlighted ? 120 : 80}
                      title={`${event.place} ${display.displayLabel} ${event.intensityLabel}`}
                      onClick={() => selectEvent(event.id)}
                    />
                  );
                })}

                {shouldFocusSingleLocation &&
                  visibleNearbyPoints.map((point, index) => {
                    const rank = intensityRank(point.intensityLabel);
                    const shouldShowLabel = showAllNearbyLabels || rank >= 3 || index < 8;

                    return (
                    <MarkerF
                      key={point.id}
                      position={{ lat: point.latitude, lng: point.longitude }}
                      icon={createObservationMarkerIcon(zoomScale)}
                      label={
                        shouldShowLabel
                          ? {
                              text: mapIntensityLabel(point.intensityLabel),
                              color: mapIntensityLabelColor(point.intensityLabel),
                              fontWeight: "700",
                              fontSize: `${Math.round(15 * zoomScale)}px`
                            }
                          : undefined
                      }
                      zIndex={60}
                      title={`${point.name} ${point.intensityLabel}`}
                    />
                    );
                  })}
              </GoogleMap>
            )}
          </div>

          <div className="legend-row">
            {magnitudeBands.map((band) => {
              const tone = bandToneForBand(band.band);

              return (
                <span key={band.band}>
                  <i className={`legend-dot ${tone}`} />
                  {band.label} {band.range}
                </span>
              );
            })}
          </div>
        </article>

        <aside className="panel detail-panel sticky-panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">event detail</span>
              <h2>選択中の地震</h2>
            </div>
            <div className={`status-pill status-${selectedEvent.status}`}>{selectedEvent.status}</div>
          </div>

          <div className="detail-card">
            <h3>{selectedEvent.place}</h3>
            <p>{selectedEvent.summary}</p>
            <dl className="detail-grid">
              <div>
                <dt>発生時刻</dt>
                <dd>{selectedEvent.issuedAt}</dd>
              </div>
              <div>
                <dt>規模</dt>
                <dd>{selectedMagnitudeDisplay?.displayLabel ?? `M${selectedEvent.magnitude.toFixed(1)}`}</dd>
              </div>
              <div>
                <dt>深さ</dt>
                <dd>{selectedEvent.depthKm}km</dd>
              </div>
              <div>
                <dt>震度</dt>
                <dd>{selectedEvent.intensityLabel}</dd>
              </div>
              <div>
                <dt>表示形式</dt>
                <dd>{selectedMagnitudeDisplay?.label ?? "Unknown"}</dd>
              </div>
              <div>
                <dt>座標</dt>
                <dd>{selectedEvent.latitude.toFixed(2)}, {selectedEvent.longitude.toFixed(2)}</dd>
              </div>
              <div>
                <dt>ソース</dt>
                <dd>{selectedEvent.source}</dd>
              </div>
            </dl>
          </div>

          <div className="timeline-card">
            <h3>規模の内訳</h3>
            <div className="band-list">
              {magnitudeBands.map((band) => (
                <div className="band-row" key={band.label}>
                  <span>{band.label}</span>
                  <strong>{band.count}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="forecast-card">
            <div className="forecast-head">
              <div>
                <span className="panel-kicker">forecast</span>
                <h3>地震傾向の参考予想</h3>
              </div>
              <div className={`forecast-pill forecast-pill-${forecast.level}`}>{forecast.label}</div>
            </div>

            <p>{forecast.summary}</p>

            <dl className="forecast-grid">
              <div>
                <dt>想定規模帯</dt>
                <dd>{forecast.expectedMagnitudeRange}</dd>
              </div>
              <div>
                <dt>想定深さ帯</dt>
                <dd>{forecast.expectedDepthRange}</dd>
              </div>
              <div>
                <dt>信頼度</dt>
                <dd>{forecast.confidence}</dd>
              </div>
            </dl>

            <div className="forecast-signals">
              {forecast.signals.map((signal) => (
                <span key={signal}>{signal}</span>
              ))}
            </div>

            <div className="forecast-advice">{forecast.advice}</div>
          </div>
        </aside>
      </section>

      <section className="insight-grid">
        <article className="panel chart-panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">stats</span>
              <h2>統計チャート</h2>
            </div>
            <p className="panel-note">現在の表示条件で {chartEvents.length} 件を集計</p>
          </div>

          <div className="chart-grid">
            <ChartCard title="時間帯別件数" description="発生時刻を6区分で集計">
              <BarChart items={timeBands} tone="accent" />
            </ChartCard>

            <ChartCard title="深さ分布" description="震源深さの偏りを確認">
              <BarChart items={depthBands} tone="warning" />
            </ChartCard>

            <ChartCard title="規模ヒストグラム" description="マグニチュード帯ごとの件数">
              <BarChart items={magnitudeHistogram} tone="danger" />
            </ChartCard>
          </div>
        </article>

        <article className="panel list-panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">event stream</span>
              <h2>最新イベント一覧</h2>
            </div>
            <p className="panel-note">
              {isFilterFallback
                ? `M${minimumMagnitude.toFixed(1)} 以上は該当なしのため全件表示`
                : `表示閾値は ${minimumMagnitude === 0 ? "すべて" : `M${minimumMagnitude.toFixed(1)} 以上`}`}
            </p>
          </div>

          <div className="list-scroll">
            <div className="list-grid">
              {effectiveEvents.map((event) => {
                const isActive = event.id === selectedEvent.id;

                return (
                  <button
                    key={event.id}
                    type="button"
                    className={isActive ? "event-card event-card-active" : "event-card"}
                    onClick={() => selectEvent(event.id)}
                  >
                    <div className="event-head">
                      <div>
                        <span className="event-region">{event.region}</span>
                        <h3>{event.place}</h3>
                      </div>
                      <span className={`status-pill status-${event.status}`}>{event.status}</span>
                    </div>

                    <div className="event-meta">
                      <span>{magnitudeDisplay(event.magnitude).displayLabel}</span>
                      <span>{event.depthKm}km</span>
                      <span>{event.intensityLabel}</span>
                    </div>

                    <p>{event.summary}</p>
                    <div className="event-time">{event.issuedAt}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}

function inHourRange(issuedAt: string, minHour: number, maxHour: number) {
  const time = issuedAt.split(" ")[1] ?? "";
  const hour = Number(time.split(":")[0]);

  return Number.isFinite(hour) && hour >= minHour && hour <= maxHour;
}

function getMapZoom(magnitude: number) {
  if (magnitude >= 7) {
    return 4.5;
  }

  if (magnitude >= 6) {
    return 5.1;
  }

  if (magnitude >= 5) {
    return 5.7;
  }

  if (magnitude >= 4) {
    return 6.2;
  }

  return 6.8;
}

function bandToneForBand(band: (typeof magnitudeBandOrder)[number]) {
  if (band === "major" || band === "great") {
    return "danger" as const;
  }

  if (band === "moderate" || band === "strong") {
    return "warning" as const;
  }

  return "calm" as const;
}

function createMagnitudeMarkerIcon(magnitude: number, zoomScale: number): google.maps.Icon {
  const display = magnitudeDisplay(magnitude);
  const size = Math.round(bandSizeByMagnitude[display.band] * zoomScale);
  const color = bandColorByTone[display.tone];

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="18" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="3" />
      <circle cx="24" cy="24" r="7" fill="${color}" />
    </svg>
  `;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
    labelOrigin: new google.maps.Point(size / 2, size + 6)
  };
}

function createObservationMarkerIcon(zoomScale: number): google.maps.Icon {
  const size = Math.round(24 * zoomScale);
  const color = "#8fa3b8";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="7" fill="${color}" fill-opacity="0.22" stroke="${color}" stroke-width="2" />
      <circle cx="12" cy="12" r="3" fill="${color}" />
    </svg>
  `;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
    labelOrigin: new google.maps.Point(size / 2, size + 8)
  };
}

function mapIntensityLabel(intensityLabel: string) {
  return intensityLabel.replace("震度", "").trim() || "?";
}

function mapIntensityLabelColor(intensityLabel: string) {
  const normalized = mapIntensityLabel(intensityLabel).replaceAll("＋", "+").replaceAll("－", "-");

  if (normalized === "7") {
    return "#ff2f2f";
  }

  if (normalized.startsWith("6") || normalized.startsWith("5") || normalized.includes("強")) {
    return "#ff8a3c";
  }

  if (normalized.startsWith("4")) {
    return "#ffd982";
  }

  return "#8ce7ff";
}

function intensityRank(intensityLabel: string) {
  const normalized = mapIntensityLabel(intensityLabel).replaceAll("＋", "+").replaceAll("－", "-");

  if (normalized === "7") {
    return 7;
  }

  if (normalized.startsWith("6") && normalized.includes("強")) {
    return 6.8;
  }

  if (normalized.startsWith("6")) {
    return 6.2;
  }

  if (normalized.startsWith("5") && normalized.includes("強")) {
    return 5.8;
  }

  if (normalized.startsWith("5")) {
    return 5.2;
  }

  if (normalized.startsWith("4")) {
    return 4;
  }

  if (normalized.startsWith("3")) {
    return 3;
  }

  if (normalized.startsWith("2")) {
    return 2;
  }

  if (normalized.startsWith("1")) {
    return 1;
  }

  return 0;
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadiusKm = 6371;
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const latDelta = toRadians(lat2 - lat1);
  const lonDelta = toRadians(lon2 - lon1);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function ChartCard({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="chart-card">
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </article>
  );
}

function BarChart({
  items,
  tone
}: {
  items: Array<{ label: string; value: number }>;
  tone: "accent" | "warning" | "danger";
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="chart-list" role="img" aria-label="地震統計の棒グラフ">
      {items.map((item) => {
        const ratio = item.value / maxValue;
        const fillWidth = item.value === 0 ? 0 : Math.max(8, Math.round(ratio * 100));

        return (
          <div className="chart-row" key={item.label}>
            <div className="chart-row-head">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
            <div className="chart-track" aria-hidden="true">
              <i className={`chart-fill chart-fill-${tone}`} style={{ width: `${fillWidth}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  );
}

function getZoomScale(zoom: number) {
  const baseline = 6;
  const raw = 1 + (zoom - baseline) * 0.24;

  return Math.max(0.85, Math.min(2.8, raw));
}