"use client";

import { useMemo, useState, type ReactNode } from "react";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import { computeMetrics, magnitudeTone, sortByRecency, type EarthquakeEvent } from "@/lib/earthquakes";

const focusLevels = [
  { value: 0, label: "すべて" },
  { value: 4.5, label: "M4.5+" },
  { value: 5.0, label: "M5.0+" },
  { value: 5.5, label: "M5.5+" },
  { value: 6.0, label: "M6.0+" }
];
const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

const markerIconByTone: Record<ReturnType<typeof magnitudeTone>, string> = {
  calm: "https://maps.google.com/mapfiles/ms/icons/ltblue-dot.png",
  warning: "https://maps.google.com/mapfiles/ms/icons/orange-dot.png",
  danger: "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
};

export function EarthquakeDashboard({ events }: { events: EarthquakeEvent[] }) {
  const [minimumMagnitude, setMinimumMagnitude] = useState(0);
  const [selectedId, setSelectedId] = useState(events[0]?.id ?? "");
  const { isLoaded, loadError } = useJsApiLoader({
    id: "earthquake-google-map",
    googleMapsApiKey,
    language: "ja",
    region: "JP"
  });

  const filteredEvents = useMemo(() => {
    return sortByRecency(events).filter((event) => event.magnitude >= minimumMagnitude);
  }, [events, minimumMagnitude]);

  const selectedEvent = filteredEvents.find((event) => event.id === selectedId) ?? filteredEvents[0] ?? events[0];
  const metrics = computeMetrics(filteredEvents.length > 0 ? filteredEvents : events);

  const mapCenter = useMemo(
    () => ({ lat: selectedEvent?.latitude ?? 36.2048, lng: selectedEvent?.longitude ?? 138.2529 }),
    [selectedEvent?.latitude, selectedEvent?.longitude]
  );

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

  const magnitudeBands = [
    {
      label: "M4.5以上",
      count: events.filter((event) => event.magnitude >= 4.5).length
    },
    {
      label: "M5.0以上",
      count: events.filter((event) => event.magnitude >= 5.0).length
    },
    {
      label: "M6.0以上",
      count: events.filter((event) => event.magnitude >= 6.0).length
    }
  ];

  const chartEvents = filteredEvents.length > 0 ? filteredEvents : events;

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
                zoom={selectedEvent.magnitude >= 6 ? 5.8 : 5.2}
                options={mapOptions}
              >
                {filteredEvents.map((event) => {
                  const tone = magnitudeTone(event.magnitude);
                  const highlighted = event.id === selectedEvent.id;

                  return (
                    <MarkerF
                      key={event.id}
                      position={{ lat: event.latitude, lng: event.longitude }}
                      icon={markerIconByTone[tone]}
                      zIndex={highlighted ? 120 : 80}
                      title={`${event.place} M${event.magnitude.toFixed(1)} ${event.intensityLabel}`}
                      onClick={() => setSelectedId(event.id)}
                    />
                  );
                })}
              </GoogleMap>
            )}
          </div>

          <div className="legend-row">
            <span><i className="legend-dot danger" />M6.0以上</span>
            <span><i className="legend-dot warning" />M5.0以上</span>
            <span><i className="legend-dot calm" />M5.0未満</span>
          </div>
        </article>

        <aside className="panel detail-panel">
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
                <dd>M{selectedEvent.magnitude.toFixed(1)}</dd>
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
        </aside>
      </section>

      <section className="panel chart-panel">
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
      </section>

      <section className="panel list-panel">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">event stream</span>
            <h2>最新イベント一覧</h2>
          </div>
          <p className="panel-note">
            表示閾値は {minimumMagnitude === 0 ? "すべて" : `M${minimumMagnitude.toFixed(1)} 以上`}
          </p>
        </div>

        <div className="list-grid">
          {filteredEvents.map((event) => {
            const isActive = event.id === selectedEvent.id;

            return (
              <button
                key={event.id}
                type="button"
                className={isActive ? "event-card event-card-active" : "event-card"}
                onClick={() => setSelectedId(event.id)}
              >
                <div className="event-head">
                  <div>
                    <span className="event-region">{event.region}</span>
                    <h3>{event.place}</h3>
                  </div>
                  <span className={`status-pill status-${event.status}`}>{event.status}</span>
                </div>

                <div className="event-meta">
                  <span>M{event.magnitude.toFixed(1)}</span>
                  <span>{event.depthKm}km</span>
                  <span>{event.intensityLabel}</span>
                </div>

                <p>{event.summary}</p>
                <div className="event-time">{event.issuedAt}</div>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function inHourRange(issuedAt: string, minHour: number, maxHour: number) {
  const time = issuedAt.split(" ")[1] ?? "";
  const hour = Number(time.split(":")[0]);

  return Number.isFinite(hour) && hour >= minHour && hour <= maxHour;
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