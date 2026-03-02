# Design System — Editorial MV Maker
> Source of Truth. 画面ごとの例外は `design-system/pages/<page>.md` に書く。

---

## 1. ブランドトーン
- **スタイル**: Editorial / Minimal / Dark-first
- **キーワード**: 静けさ、精度、映像制作のプロ感
- **アンチ**: 派手なグラデーション、過剰な影、視線を奪うアニメーション

---

## 2. カラー（ThemeContext.tsx より抽出）

### 共通
| トークン | 値 | 用途 |
|---|---|---|
| `accent` | `#c8b89a` | Primary CTA・選択状態・強調・プログレスバー |
| `accentFg` | `#1a1a1a` | accent上のテキスト |

### Dark テーマ（デフォルト）
| トークン | 値 | 用途 |
|---|---|---|
| `bg` | `#0d0d0d` | ページ背景 |
| `bgAlt` | `#0f0f0f` | 右パネル背景 |
| `surface` | `#111111` | カード・ボタン背景 |
| `surface2` | `#1a1a1a` | 浮き上がったサーフェス・セパレータ |
| `border` | `#1e1e1e` | ヘッダー下線など主要ボーダー |
| `border2` | `#222222` | セカンダリボーダー |
| `border3` | `#2a2a2a` | 破線・薄いボーダー |
| `fg` | `#f0ede8` | 主要テキスト |
| `fgDim` | `#d0cdc8` | やや暗いテキスト |
| `textDim` | `#333333` | ほぼ見えないテキスト（ラベル薄め） |
| `text1–6` | `#3a3a3a`〜`#aaaaaa` | テキスト階層（6段階） |

### Light テーマ
| トークン | 値 |
|---|---|
| `bg` | `#f5f2ec` |
| `surface` | `#e8e4de` |
| `fg` | `#1a1714` |
| `accent` | `#c8b89a`（同一） |

### Mood アクセント（ImportScreen）
| Mood | 色 |
|---|---|
| Chill | `#8ca8b8` |
| Hype | `#c8b89a` |
| Cute | `#c8a8b8` |
| Cinematic | `#a0a0a0` |

---

## 3. タイポグラフィ

### フォント
- **ファミリー**: Inter（Google Fonts）、weight 300/400/500
- **フォールバック**: system-ui, -apple-system, sans-serif

### サイズスケール（実コードから抽出）
| 用途 | サイズ | letter-spacing | その他 |
|---|---|---|---|
| セクションラベル | 10px | 0.2em | uppercase |
| バッジ・補助テキスト | 10px | 0.12em | uppercase |
| ボタン・メタ情報 | 11px | 0.2em | uppercase |
| ファイル名・説明 | 12px | 0.1em | — |
| Moodカード見出し | 13px | 0.05em | — |
| タイトル入力 | 24px | -0.01em | — |
| 書き出し進捗数字 | 28px | -0.02em | tabular-nums |

---

## 4. スペーシング・レイアウト

### 角丸
- **原則**: `border-radius: 2px`（全体的にシャープ）
- **例外**: モーダル = `4px`、スクロールバー = `2px`、スライダーつまみ = `50%`

### 主要余白
| 要素 | 値 |
|---|---|
| ヘッダー横パディング | `px-4`（sp）/ `px-10`（pc） |
| ヘッダー縦パディング | `py-4` |
| メインコンテンツ横 | `px-4`（sp）/ `px-8`（pc） |
| メインコンテンツ縦 | `py-8`（sp）/ `py-12`（pc） |
| セクション間 | `mb-8`〜`mb-12` |
| セクションラベル下 | `pb-12`（border付き） |

### ブレークポイント
- `sm`（640px）: パディング拡大
- `md`（768px）: ステップナビ表示

---

## 5. コンポーネントパターン

### ボタン
```
Primary CTA:
  background: theme.accent (#c8b89a)
  color: theme.accentFg (#1a1a1a)
  border: 1px solid theme.accent
  border-radius: 2px
  padding: 15-16px 0 (full-width)
  font: 11px, uppercase, letter-spacing 0.2em

Disabled:
  background: theme.surface2
  color: theme.textDim
  cursor: not-allowed

Secondary / Toggle:
  background: transparent or theme.surface2
  color: theme.text3〜text4
  選択時: accent背景
```

### セクションラベル（h2相当）
```
font-size: 10px
color: theme.text3
letter-spacing: 0.2em
text-transform: uppercase
border-bottom: 1px solid theme.surface2
padding-bottom: 12px
margin-bottom: 16-20px
```

### カード（Moodカードなど）
```
background: theme.surface（非選択）/ rgba(200,184,154,0.06)（選択）
border: 1px solid theme.border3（非選択）/ theme.accent（選択）
border-radius: 2px
padding: 14px 12px
transition: border-color 0.2s, background 0.2s
```

### セパレータRow（ShareScreen）
```
display: flex; justify-content: space-between; align-items: start
padding: 12px 0
border-bottom: 1px solid theme.surface2
label: 10px, theme.text3, uppercase, letter-spacing 0.15em
value: 11px, theme.text5, letter-spacing 0.05em
```

### ヘッダー
```
height: auto (py-4)
border-bottom: 1px solid theme.border
左: ロゴ（appTitle + separator + appSub）
右: ステップ表示 (md+) + 言語切替 + テーマトグル
```

### モーダル（エクスポート中）
```
overlay: rgba(0,0,0,0.75), fixed, z-index: 100
card: theme.bg, border: theme.border3, border-radius: 4px, padding: 40px 48px
プログレスバー: height 2px, theme.surface2 背景, theme.accent 進捗
```

---

## 6. アニメーション・トランジション

| 種類 | 値 |
|---|---|
| 背景・テキスト色 | `transition: background 0.25s, color 0.25s` |
| ボタンhover | `transition: background 0.15s, color 0.15s` |
| ドラッグエリア | `transition: border-color 0.2s, background 0.2s` |
| プログレスバー幅 | `transition: width 0.1s linear` |
| 波形アニメ | `@keyframes wave-bar` scaleY 0.4→1.0 |

---

## 7. アクセシビリティ基準
- タッチターゲット最小: `min-height: 32px`（sp）
- スクロールバー: 4px（細め）
- カラーのみに依存しない（ラベル・アイコン併用）
- `outline: none` 使用箇所はキーボードフォーカスの代替手段を要確認

---

## 8. 将来追加予定パターン（未実装）
- `ProBadge` コンポーネント（accent色 + 小文字ラベル）
- `LockedFeatureCard`（コンテンツロック + アップグレードCTA）
- `UpgradeCTA`（インライン課金誘導）
- Feature Flag によるA/Bテスト分岐
- 計測イベント（pro_badge_view, locked_feature_view 等）

> 実装ガイドは `.claude/skills/MONETIZATION_AWARENESS.md` を参照
