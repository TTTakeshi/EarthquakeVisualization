# Earthquake Visualization

気象庁の公開地震一覧をもとに、日本周辺の地震情報を地図・指標・一覧で確認できる Next.js ダッシュボードです。

## Features

- 気象庁の地震一覧 JSON を取得して最新イベントを表示
- Google Maps 上に震源位置をプロット
- 初期表示は全件表示（必要に応じてマグニチュード閾値で絞り込み）
- 規模は国際的なマグニチュード区分（Micro / Minor / Light / Moderate / Strong / Major / Great）で表示
- 選択中イベントの規模、深さ、震度、時刻、座標を表示
- 取得済みイベントから地震傾向の参考予想を生成し、警戒度・想定規模帯・注意点を表示
- 統計チャートで時間帯別件数・深さ分布・規模ヒストグラムを可視化
- API 取得に失敗した場合は内蔵デモデータへフォールバック

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- @react-google-maps/api

## Data Source

- 気象庁: https://www.jma.go.jp/bosai/quake/data/list.json

取得した一覧データからイベント ID ごとにレコードをまとめ、震源・震度情報を優先して整形しています。

## Getting Started

### Requirements

- Node.js 20 以降を推奨
- npm

### Install

```bash
npm install
```

### Google Maps API Key

Google Maps JavaScript API を使うため、プロジェクト直下に `.env.local` を作成して以下を設定します。

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key
```

Google Cloud 側で Maps JavaScript API を有効化し、必要に応じてリファラー制限を設定してください。

### Development

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開いて確認します。

### Production Build

```bash
npm run build
npm run start
```

## Project Structure

```text
src/
  app/
    globals.css
    layout.tsx
    page.tsx
  components/
    earthquake-dashboard.tsx
  lib/
    earthquakes.ts
    jma.ts
```

## Behavior Notes

- 地震データは 300 秒単位で再検証されます。
- 取得データは過去 1 年分のイベントを対象にしています。
- 初期フィルターは「すべて」です。必要に応じて M4.5+ / M5.0+ / M5.5+ / M6.0+ に切り替えできます。
- seismic map は規模に応じてマーカーサイズ、ズーム、凡例、詳細バッジを切り替えます。
- 規模表記は USGS などで一般的な国際区分をベースにしています。
- 参考予想は取得済みイベントの傾向から算出した指標で、将来の地震を断定的に予測するものではありません。
- 統計チャートは現在の表示条件（マグニチュード閾値）に連動して再集計されます。
- ネットワーク障害や API 応答異常時は src/lib/earthquakes.ts のデモデータを表示します。

## Scripts

- `npm run dev`: 開発サーバー起動
- `npm run build`: 本番ビルド作成
- `npm run start`: 本番サーバー起動
- `npm run lint`: lint 実行