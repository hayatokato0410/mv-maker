# Monetization Awareness（課金認知）実装ガイド

出典：abtest.design「Monetization awareness」
例：Mobbin の Pro badge テスト（無料→有料転換 +35%）
例：Busuu の Content locking（コンバージョン +83%）

## 目的
- 無料ユーザーが「どこが有料か」「アップグレードで何が得られるか」を**事前に理解**できるようにする
- "突然の壁"による不満（期待違い）を減らし、転換を上げる

---

## パターン1：Pro badge（有料機能の明示）
### UIの型
- 有料限定の機能・メニュー・ボタンに **Pro** / **Premium** バッジを付ける
- Hover/タップで「何が追加されるか」を短く説明（ツールチップ/ミニモーダル）

### 実装チェックリスト
- [ ] バッジは **視覚的階層** を壊さない（主CTAより強くしない）
- [ ] 色だけに依存しない（アイコン/ラベル併用）
- [ ] 説明は 1〜2行（認知負荷を増やさない）
- [ ] バッジ表示イベントを計測（view / click / tooltip_open）

### 計測例
- event: `pro_badge_view`, props: `{feature_key, surface, plan_state}`
- event: `pro_badge_click` / `upgrade_cta_click`

---

## パターン2：Content locking（コンテンツ/機能ロック）
### UIの型
- ロックされた領域を"見えるが使えない"状態で表示（プレビュー＋ロックアイコン）
- 解除方法（アップグレード）を、その場で1アクションにする

### 実装チェックリスト
- [ ] ロック前に「到達した価値」を見せる（価値提示→ロック）
- [ ] ロックの理由を明確に（例：Pro限定、保存回数上限）
- [ ] 解除後の体験を予告（何ができるかを具体化）
- [ ] 解除しないユーザーにも代替案を示す（無料枠でできること）

### 計測例
- event: `locked_feature_view`, props: `{feature_key, surface, user_segment}`
- event: `unlock_paywall_open` / `purchase_success` / `purchase_cancel`

---

## A/Bテスト設計テンプレ
- 仮説：例「有料機能にProバッジを付けると、課金認知が上がり無料→有料転換が増える」
- 介入：バッジの有無、文言、配置、ツールチップの有無
- 主要指標：free→paid conversion、paywall open率、upgrade CTA CTR
- ガードレール：離脱率、CS問い合わせ、ネガティブ反応（キャンセル、返品）
