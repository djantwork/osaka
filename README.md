# competitor-radar

自分用EC競合レーダー（クッション/着物向け）のMVPです。

## セットアップ

1. DB起動
```bash
docker compose up -d
```

2. 依存インストール
```bash
npm i
```

3. Playwrightブラウザのインストール
```bash
npx playwright install
```

4. 環境変数
```bash
cp .env.example .env
```

5. Prismaマイグレーション
```bash
npx prisma migrate dev --name init
```

6. 開発サーバ起動
```bash
npm run dev
```

## 使い方（自分用運用）

1. `/competitors` で競合名 + ドメインを登録
2. 競合カードでカテゴリ一覧URLを追加
3. 「全競合をクロール」を押す
4. `/ranking` で直近7日の件数ランキング確認
5. `/competitors/[id]` で価格帯・USP・最新商品を確認
6. `/insights` で今週の結論を確認

## カテゴリURL例
- Shopify系: `https://example-shop.com/collections/cushion`
- 非Shopify系: `https://example.com/category/kimono`

## クロール時の注意点
- 同一ドメインのみ商品URLを収集します。
- 商品URLはパターンベース（`/products/`, `/product/`, `/item/`, `/items/`, `/detail/`）で判定します。
- 1競合あたり最大取得件数はデフォルト8件です（`/api/crawl/ec` の `maxProducts` で変更可）。
- 一部URLが失敗しても全体クロールは継続し、`crawl_runs`/`crawl_logs` に保存します。

## 主要ページ
- `/competitors` : 競合管理 + クロール実行 + 直近クロール結果
- `/ranking` : モメンタムランキング（直近7日）
- `/competitors/[id]` : 競合詳細（推移、価格帯、USP、最新商品）
- `/insights` : 今週の結論（成長競合、価格中央値トレンド、USP増加）
