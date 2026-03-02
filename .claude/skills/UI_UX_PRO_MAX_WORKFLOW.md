# UI/UX Pro Max workflow（要点）

出典：UI/UX Pro Max Skill（How It Works）

## How it works（要約）
1. You ask：UI/UXタスクを依頼（build/design/implement/review/fix/improve）
2. Design System Generated：推論エンジンでデザインシステムを生成
3. Smart recommendations：プロダクト特性に合う色・タイポ等を推奨
4. Code generation：余白・フォント・ベストプラクティスで実装
5. Pre-delivery checks：UI/UXアンチパターンを検証

## Claude Code での呼び出しの感覚
- UI/UX関連の依頼で自動起動（Skill Mode）
- ここでは「思想」をこのスキルに取り込み、実装手順として再現する

## 参考：設計システムを保存して運用する（Master + Overrides）
- `design-system/MASTER.md` を全体のSource of Truthにする
- 画面ごとの例外は `design-system/pages/<page>.md` で上書き
