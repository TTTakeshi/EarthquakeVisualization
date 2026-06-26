"use client";

import { useMemo, useState } from "react";
import { geoMercator, geoPath, type GeoProjection } from "d3-geo";
import { feature } from "topojson-client";
import japanTopology from "world-atlas/countries-110m.json";
import { computeMetrics, magnitudeTone, projectToMap, sortByRecency, type EarthquakeEvent } from "@/lib/earthquakes";

const focusLevels = [4.5, 5.0, 5.5, 6.0];

export function EarthquakeDashboard({ events }: { events: EarthquakeEvent[] }) {
  const [minimumMagnitude, setMinimumMagnitude] = useState(4.5);
  const [selectedId, setSelectedId] = useState(events[0]?.id ?? "");

  const japanMap = useMemo(() => {
    const japanGeometry = (japanTopology as any).objects.countries.geometries.find(
      (geometry: { id?: string | number }) => String(geometry.id) === "392"
    );
    const japanFeature = feature(japanTopology as any, japanGeometry as any) as GeoJSON.Feature<GeoJSON.Geometry>;
    const projection = geoMercator().fitExtent(
      [
        [8, 8],
        [92, 92]
      ],
      japanFeature
    );
    const path = geoPath(projection);

    return { projection, path, japanFeature };
  }, []);

  const filteredEvents = useMemo(() => {
    return sortByRecency(events).filter((event) => event.magnitude >= minimumMagnitude);
  }, [events, minimumMagnitude]);

  const selectedEvent = filteredEvents.find((event) => event.id === selectedId) ?? filteredEvents[0] ?? events[0];
  const metrics = computeMetrics(filteredEvents.length > 0 ? filteredEvents : events);

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
                key={level}
                type="button"
                className={level === minimumMagnitude ? "chip chip-active" : "chip"}
                onClick={() => setMinimumMagnitude(level)}
              >
                M{level.toFixed(1)}+
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
            <svg viewBox="0 0 100 100" className="map-svg" aria-label="日本付近の地震マップ">
              <defs>
                <linearGradient id="ocean" x1="0%" x2="100%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(14, 32, 55, 0.96)" />
                  <stop offset="100%" stopColor="rgba(4, 14, 28, 0.98)" />
                </linearGradient>
              </defs>

              <rect x="0" y="0" width="100" height="100" rx="6" fill="url(#ocean)" />
              <path d={japanMap.path(japanMap.japanFeature) ?? ""} className="map-land" />
              <path
                d={japanMap.path(japanMap.japanFeature) ?? ""}
                className="map-coastline"
              />

              <text x="16" y="18" className="map-label">北海道</text>
              <text x="62" y="17" className="map-label">東北</text>
              <text x="67" y="38" className="map-label">関東</text>
              <text x="44" y="78" className="map-label">九州</text>

              {filteredEvents.map((event) => {
                const projected = japanMap.projection([event.longitude, event.latitude]);
                const fallback = projectToMap(event.latitude, event.longitude);
                const [x, y] = projected ?? [fallback.x, fallback.y];
                const highlighted = event.id === selectedEvent.id;
                const tone = magnitudeTone(event.magnitude);

                return (
                  <g key={event.id}>
                    <circle
                      cx={x}
                      cy={y}
                      r={highlighted ? 4 : 2.6}
                      className={`quake-dot quake-dot-${tone}`}
                      onClick={() => setSelectedId(event.id)}
                    />
                    {highlighted && <circle cx={x} cy={y} r={7.5} className="quake-pulse" />}
                  </g>
                );
              })}
            </svg>
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

      <section className="panel list-panel">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">event stream</span>
            <h2>最新イベント一覧</h2>
          </div>
          <p className="panel-note">表示閾値は M{minimumMagnitude.toFixed(1)} 以上</p>
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