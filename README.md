# BlockCraft

Three.js で作る、ブラウザ上で動作するマインクラフト風ボクセルゲーム。

**▶ Play:** https://nitou-kanazawa.github.io/demo-web-BlockCraft/

![screenshot](docs/screenshot.png)

## 操作方法

| 操作 | キー / マウス |
|------|---------------|
| 開始 | 画面クリック（ポインタロック） |
| 移動 | WASD / 矢印キー |
| ジャンプ | Space |
| 視点 | マウス |
| ブロック破壊 | 左クリック |
| ブロック設置 | 右クリック |
| ブロック選択 | 1–8 キー / マウスホイール |
| 解除 | Esc |

URL に `?seed=123` を付けると別のワールドが生成されます。

## 特徴

- **ビルド不要の静的サイト** — GitHub Pages（main ブランチ）から直接配信。Three.js は `vendor/` に同梱し importmap で解決
- **手続き地形生成** — シード付き値ノイズ（fBm）によるハイトマップ、砂浜・水面・チャンク境界を跨いでも整合する樹木
- **チャンクベース描画** — 16×64×16 チャンク、隠面カリングメッシング、面方向の陰影を頂点色にベイク、プレイヤー追従のチャンクストリーミング
- **物理** — AABB 軸分離衝突、サブステップによるトンネリング防止、重力・ジャンプ・壁ずり
- **ブロック操作** — ボクセル DDA レイキャスト、注視ハイライト、破壊/設置、8種のブロック
- **テクスチャもプロシージャル** — Canvas 2D で描くテクスチャアトラス（画像アセットなし）

## 開発

```bash
npm install        # devDependencies (vitest) のインストール
npm test           # ユニットテスト実行
npx http-server .  # ローカル配信（任意の静的サーバでよい）
```

## アーキテクチャ

ゲームロジックは DOM / Three.js 非依存の純粋モジュール（`src/core/`）に分離し、Node 上の Vitest でテストしています。

```
src/
├── core/          # 純ロジック（すべてユニットテスト対象）
│   ├── math.js      # clamp / floored mod / lerp / smootherstep
│   ├── noise.js     # シード付き 2D 値ノイズ + fBm（mulberry32）
│   ├── blocks.js    # ブロック定義（solid / transparent 属性）
│   ├── chunk.js     # 16×64×16 ボクセル格納（Uint8Array）
│   ├── worldgen.js  # 地形・砂浜・水面・樹木の生成
│   ├── world.js     # チャンク管理・ワールド座標アクセス・dirty 伝播
│   ├── mesher.js    # 隠面カリングメッシング・UV・面陰影
│   ├── physics.js   # AABB 衝突・重力・ジャンプ
│   └── raycast.js   # ボクセル DDA（注視ブロック特定）
├── render/        # Three.js 依存
│   ├── atlas.js         # プロシージャルテクスチャアトラス
│   └── worldRenderer.js # チャンクメッシュの構築 / 破棄管理
├── player/
│   ├── controls.js    # ポインタロック・キー入力 → 移動方向
│   └── interaction.js # 破壊 / 設置・ハイライト
├── ui/
│   └── hotbar.js      # ホットバー UI
└── main.js        # 配線とゲームループ
```

## 開発タスク（各タスク = 1 PR）

| # | タスク | PR | 状態 |
|---|--------|----|------|
| 1 | プロジェクト基盤（Three.js vendor / Vitest / 最小シーン） | #1 | ✅ |
| 2 | ボクセルワールドコア（ブロック・チャンク・地形生成） | #2 | ✅ |
| 3 | メッシング＆描画（面カリング・テクスチャアトラス） | #3 | ✅ |
| 4 | プレイヤー＆物理（ポインタロック・WASD・AABB衝突） | #4 | ✅ |
| 5 | ブロック操作（DDAレイキャスト・設置/破壊・ホットバー） | #5 | ✅ |
| 6 | 仕上げ（面陰影・HUD・ドキュメント） | #6 | ✅ |

各 PR にはユニットテスト（Vitest, 計60件）とヘッドレス Chromium での動作確認を含みます。
