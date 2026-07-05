# BlockCraft

Three.js で作るブラウザ上で動作するマインクラフト風ボクセルゲーム。

**Demo:** https://nitou-kanazawa.github.io/demo-web-BlockCraft/

## 特徴

- ビルド不要の静的サイト（GitHub Pages の main ブランチ直配信）
- Three.js は `vendor/` に同梱し、importmap で解決
- ゲームロジック（地形生成・メッシング・物理・レイキャスト）は DOM 非依存の純粋モジュールとして実装し、Vitest でユニットテスト

## 開発

```bash
npm install        # devDependencies (vitest) のインストール
npm test           # ユニットテスト実行
npx http-server .  # ローカル配信（任意の静的サーバでよい）
```

## タスク計画

| # | タスク | 内容 | 状態 |
|---|--------|------|------|
| 1 | プロジェクト基盤 | index.html / Three.js vendor / Vitest / 最小シーン | ✅ |
| 2 | ボクセルワールドコア | ブロック定義・チャンク構造・ノイズ地形生成 | ⬜ |
| 3 | メッシング＆描画 | 面カリングメッシュ生成・テクスチャアトラス | ⬜ |
| 4 | プレイヤー＆物理 | ポインタロック・WASD・重力・AABB衝突 | ⬜ |
| 5 | ブロック操作 | DDAレイキャスト・設置/破壊・ホットバー | ⬜ |
| 6 | 仕上げ | ライティング・霧・HUD・ドキュメント | ⬜ |

## 操作方法（実装後）

- クリック: ポインタロック開始
- WASD: 移動 / Space: ジャンプ
- 左クリック: ブロック破壊 / 右クリック: 設置
- 1–9: ホットバー選択
