# Earthquake Visualization

気象庁の公開地震一覧をもとに、日本周辺の地震情報を地図・指標・一覧で確認できる Next.js ダッシュボードです。

## Features

- 気象庁の地震一覧 JSON を取得して最新イベントを表示
- Google Maps 上に震源位置をプロット
- FullHD（1920x1080）表示を想定したワイドレイアウト
- 地図・詳細・統計・一覧を視線移動しやすい 2 段構成で表示
- 初期表示は M4.5 以上（必要に応じて閾値を切り替え）
- 規模は国際的なマグニチュード区分（Micro / Minor / Light / Moderate / Strong / Major / Great）で表示
- 選択中イベントの規模、深さ、震度、時刻、座標を表示
- 一覧または地図で地点を選択すると、地図は選択地点にフォーカスして 1 か所表示に切り替え
- 選択イベントの気象庁詳細 JSON から周辺観測点の震度を取得し、地図上に重ねて表示
- 周辺震度ラベルは「簡易表示 / 全表示」を切り替え可能（簡易表示では重要度を優先）
- 震度ラベル色は震度階級に応じて切り替え（例: 5弱以上は警告色）
- 地図のズーム操作に連動して、震源マーカー・観測点マーカー・ラベル文字サイズを自動調整
- 大画面では詳細パネルを追従表示（sticky）し、一覧閲覧中も選択情報を維持
- 取得済みイベントから地震傾向の参考予想を生成し、警戒度・想定規模帯・注意点を表示
- 統計チャートで時間帯別件数・深さ分布・規模ヒストグラムを可視化
- 閾値に該当データがない場合は全件表示にフォールバックして継続閲覧を支援
- API 取得に失敗した場合は内蔵デモデータへフォールバック

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- @react-google-maps/api

## Data Source

- 気象庁: https://www.jma.go.jp/bosai/quake/data/list.json
- 気象庁詳細データ: https://www.jma.go.jp/bosai/quake/data/{detail_json_file}

取得した一覧データからイベント ID ごとにレコードをまとめ、震源・震度情報を優先して整形しています。
選択時の周辺観測点震度は、イベントごとの詳細 JSON をサーバールート経由で取得して利用します。

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
    api/
      earthquake-intensity/
        route.ts
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
- 初期フィルターは M4.5+ です。必要に応じて「すべて」/ M5.0+ / M5.5+ / M6.0+ に切り替えできます。
- 選択中フィルターに該当イベントがない場合は、自動で全件表示にフォールバックし、注記を表示します。
- seismic map は規模に応じてマーカーサイズ、ズーム、凡例、詳細バッジを切り替えます。
- 地点選択後は地図を単一点フォーカス表示に切り替え、選択地点以外の震源マーカーは非表示になります。
- 周辺観測点震度は選択イベントの詳細データがある場合に表示され、詳細データがないイベントでは震源のみ表示されます。
- 周辺観測点の表示対象は取得済み全点（優先順に並べ替え）で、ラベルは簡易表示時に「震度3以上 + 上位点」を優先表示します。
- 「周辺ラベルを全表示」を有効にすると、表示対象の観測点ラベルをすべて表示します。
- 地図のズームに応じてマーカーとラベルが拡大・縮小し、拡大時の視認性を高めます。
- 規模表記は USGS などで一般的な国際区分をベースにしています。
- 参考予想は取得済みイベントの傾向から算出した指標で、将来の地震を断定的に予測するものではありません。
- 統計チャートは現在の表示条件（マグニチュード閾値）に連動して再集計されます。
- FullHD 以上では統計パネルとイベント一覧を横並び表示し、一覧は独立スクロールで情報密度を高めます。
- ネットワーク障害や API 応答異常時は src/lib/earthquakes.ts のデモデータを表示します。

## Scripts

- `npm run dev`: 開発サーバー起動
- `npm run build`: 本番ビルド作成
- `npm run start`: 本番サーバー起動
- `npm run lint`: lint 実行