了解🙂 じゃあ MVPは Fade 固定で行く前提に、指示書を“さらにブレない”形に最終調整した版を置くね。
（Transition UIも一旦消して、迷いを削る＝完成度が上がる）

⸻

Figma Make 指示書（最終・Fade固定版）：Editorial Mood MV Maker

ゴール

画像10〜20枚をアップロード → 10〜20秒の“上質な短尺エディトリアルMV風”を自動生成。
並べ替え／尺調整／手ブレ（上品）／Look（5つ）／Moodプリセット／共有。

⸻

方針（エディトリアル）
	•	動きは Fade + 微ズームのみ（派手さ排除）
	•	UIは余白・罫線・タイポ中心、モノトーン基調＋控えめアクセント
	•	Moodは「ルックの初期値」と「尺の初期値」を決めるもの

⸻

画面構成（3画面）

Import
	•	Upload（10〜20枚）
	•	Moodカード（Chill / Hype / Cute / Cinematic）
	•	Generate
	•	サムネグリッド（整然＋余白）

Edit
	•	大きいプレビュー（必要ならレターボックス）
	•	Play/Pause、時間表示
	•	タイムライン（秒グリッド）
	•	サムネストリップ（DnDで並べ替え）
	•	右パネル：
	•	Duration（10〜20秒）
	•	Handheld（On/Off + Amount + Speed）
	•	Look：Grain / Vignette / Contrast / Saturation / Blur
	•	Shuffle（seed）/ Reset Look

Share
	•	タイトル
	•	設定サマリ
	•	共有リンク

⸻

再生ロジック（尺優先Auto）
	•	durationSec（10..20）
	•	n = clips.length（10..20）
	•	cutMs = (durationSec*1000) / n
	•	activeIndex = floor(playheadMs / cutMs)（0..n-1）
	•	終了時：停止してReplay（ループでも可）

⸻

Fade固定の仕様
	•	クリップ切替時は必ず Crossfade
	•	フェード時間：min(350ms, cutMs*0.35) くらいの割合（短すぎるカットでも破綻しない）

⸻

手ブレ（上品）
	•	translate：±(2〜8px)
	•	rotate：±(0.2〜0.9deg)
	•	scale：1.02〜1.06（常時）
	•	seedで揺れ固定、Shuffleで更新
	•	jitter禁止（滑らかに補間）

⸻

Look（5つのみ）
	•	Grain / Vignette / Contrast / Saturation / Blur
※GrainとVignetteは上質感が出るので“薄く”推奨

⸻

Moodプリセット（Fade固定前提）
	•	Chill：duration 15 / handheld 0.22 slow / grain 0.22 vign 0.25 contrast +0.10 sat -0.08 blur 0.04 / letterbox ON薄
	•	Hype（上質テンポ）：duration 12 / handheld 0.28 medium / grain 0.15 vign 0.15 contrast +0.22 sat +0.08 blur 0 / letterbox OFF
	•	Cute（上質ポップ）：duration 14 / handheld 0.18 medium / grain 0.10 vign 0.10 contrast +0.08 sat +0.18 blur 0 / letterbox OFF
	•	Cinematic：duration 18 / handheld 0.26 slow / grain 0.32 vign 0.40 contrast +0.12 sat -0.15 blur 0.05 / letterbox ON強

⸻

Figma Make に貼るプロンプト（Fade固定版）

Prompt 1：UI骨格（Transition UIなし）

Build a premium editorial 3-screen app: Import, Edit, Share.
Style: lots of whitespace, thin dividers, small radius, high-quality typography, monochrome UI with one subtle accent color.
Motion style: restrained. The slideshow uses crossfade transitions only (no transition selector).

Import:
- Upload 10-20 images
- Thumbnail grid with generous spacing
- Mood picker cards: Chill / Hype / Cute / Cinematic
- Generate button

Edit:
- Large preview with optional letterbox overlay
- Play/Pause and time indicator (00:00 / 00:15)
- Timeline with subtle seconds grid for 10-20 seconds
- Draggable thumbnail strip for reordering
- Right panel controls:
  Duration slider 10..20 seconds
  Handheld toggle + Amount slider + Speed selector
  Look controls: Grain, Vignette, Contrast, Saturation, Blur
  Shuffle (seed) and Reset Look

Share:
- Title field
- Settings summary
- Share link field

No playback logic yet.

Prompt 2：状態管理 + Moodプリセット + DnD

Add state management:
screen, mood, clips[] (id, src, name), durationSec (10..20),
handheldEnabled, handheldAmount (0..1), handheldSpeed,
look (grain/vignette/contrast/saturation/blur), letterboxEnabled,
seed, isPlaying, playheadMs.

Implement mood presets that set: durationSec, handheld, look, letterboxEnabled.

Implement drag-and-drop reordering for clips[].
Wire navigation between screens.

Prompt 3：尺優先Auto再生 + Crossfade固定

Implement slideshow playback on Edit screen (duration-first auto timing) with crossfade only:

- n = clips.length
- cutMs = (durationSec * 1000) / n
- On Play, advance playheadMs with requestAnimationFrame
- activeIndex = floor(playheadMs / cutMs), clamped 0..n-1
- Render clips[activeIndex] in the preview
- Crossfade between previous and current clip on index changes:
  fadeMs = min(350, cutMs * 0.35)
- When playhead reaches durationSec, stop and show "Replay"

Keep it smooth and stable.

Prompt 4：Handheld（上質）

Add a premium handheld effect:
When enabled, apply smooth seeded motion to the preview container:
small translateX/Y, small rotate, subtle constant scale.
handheldAmount controls intensity (tasteful), handheldSpeed controls frequency (slow/medium/fast).
Use seed to make the motion deterministic. Shuffle changes seed and updates motion.
No jitter; feels like handheld cinematography.

Prompt 5：Look（5つ）＋レターボックス

Apply Look controls live to the preview:
- Grain: noise overlay is fine
- Vignette: edge darkening overlay is fine
- Contrast, Saturation, Blur: CSS-like filters are fine
Add a letterbox overlay (top/bottom bars) controlled by letterboxEnabled and mood presets.
Add Reset Look to return to the current mood preset defaults.


⸻

次は制作で詰まりやすいポイントを潰すね🙂
**Shuffle（seed変更）で「並び順も揺れも一緒に変える」**仕様でOK？（上質アプリだと“一括で別案”が出るのが気持ちいい）