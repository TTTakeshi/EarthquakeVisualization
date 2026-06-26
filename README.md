# Earthquake Visualization

気象庁の公開地震一覧をもとに、日本周辺の地震情報を地図・指標・一覧で確認できる Next.js ダッシュボードです。

## Features

- 気象庁の地震一覧 JSON を取得して最新イベントを表示
- 日本地図上に震源位置をプロット
- マグニチュード閾値でイベントを絞り込み
- 選択中イベントの規模、深さ、震度、時刻、座標を表示
- API 取得に失敗した場合は内蔵デモデータへフォールバック

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- d3-geo
- topojson-client
- world-atlas

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
- 取得件数は最新 6 イベントに制限しています。
- ネットワーク障害や API 応答異常時は src/lib/earthquakes.ts のデモデータを表示します。

## Scripts

- `npm run dev`: 開発サーバー起動
- `npm run build`: 本番ビルド作成
- `npm run start`: 本番サーバー起動
- `npm run lint`: lint 実行