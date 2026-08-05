# Open Tasks

**正本は GitHub Issues** → https://github.com/TechTM-0/Knowledge/issues

このファイルは薄いポインタ。詳細・完了条件・進捗バーは各issueを参照。
issueを閉じたら、ここのチェックを付けて「完了タスク」へ移動する。

## 次の一手

→ **実装ではなく方針決定が先。[#17](https://github.com/TechTM-0/Knowledge/issues/17) / [#18](https://github.com/TechTM-0/Knowledge/issues/18) / [#19](https://github.com/TechTM-0/Knowledge/issues/19) の3件は「検討中」issue で、選択肢を記録してあるだけ。まだ決めていない。**

- **[#17 埋め込みバックエンド](https://github.com/TechTM-0/Knowledge/issues/17) から決めるのが効率的。** #15 の再インデックスコストが直結し、#16 は決定次第で問題ごと消滅する
- **[#18 チャットUIの置き場所](https://github.com/TechTM-0/Knowledge/issues/18) と [#19 生成バックエンド](https://github.com/TechTM-0/Knowledge/issues/19) は互いを制約するのでセットで決める。** 組み合わせの成立表は #18 の本文にある。ここが決まるまで #1 / #2 は着手しない

決定を待たずに動かせる実装は [#15 チャンク分割](https://github.com/TechTM-0/Knowledge/issues/15)（設計は埋め込みバックエンドに依存しない）。ただし #17 を先に決めたほうが試行錯誤を回しやすい。

[#7 画像挿入](https://github.com/TechTM-0/Knowledge/issues/7) は着手途中で中断している。再開時は `.env` へ `GITHUB_TOKEN`（`contents: write` スコープ）と `GITHUB_REPO` の追加から。**2026-08-06 に画像まわりの新issue 2件（[#20](https://github.com/TechTM-0/Knowledge/issues/20) / [#21](https://github.com/TechTM-0/Knowledge/issues/21)）が立ち、どちらも #7 が前提になったため優先度が上がった。**

## 残タスク

- [ ] [#4 ベクトル検索の精度改善（エピック）](https://github.com/TechTM-0/Knowledge/issues/4)
  - [ ] [#17 埋め込みは Gemini API のままか、ローカルモデルか](https://github.com/TechTM-0/Knowledge/issues/17) 〈**検討中**・#15 / #16 の前提〉
  - [ ] [#15 チャンク単位に分割して embedding](https://github.com/TechTM-0/Knowledge/issues/15) 〈#17 決定後が望ましい・再インデックス必要〉
  - [ ] [#16 embedding 失敗の握り潰しを直す](https://github.com/TechTM-0/Knowledge/issues/16) 〈#17 次第で消滅〉
  - [ ] [#9 タイトルと本文を別 embedding にして重み付け](https://github.com/TechTM-0/Knowledge/issues/9) 〈#15 の後に設計を決める〉
  - [ ] [#10 クエリ拡張](https://github.com/TechTM-0/Knowledge/issues/10) 〈優先度低・latency増〉
- [ ] [#5 AI×ドキュメント統合（エピック）](https://github.com/TechTM-0/Knowledge/issues/5)
  - [ ] [#18 チャットUIをアプリ内かターミナルか](https://github.com/TechTM-0/Knowledge/issues/18) 〈**検討中**・#19 とセット・#1 の要否が変わる〉
  - [ ] [#19 生成側を Gemini API / MCP / headless のどれか](https://github.com/TechTM-0/Knowledge/issues/19) 〈**検討中**・#18 とセット〉
  - [ ] [#1 チャットラリー→ノート化](https://github.com/TechTM-0/Knowledge/issues/1) 〈#18 / #19 決定まで着手しない。不要になる可能性あり〉
  - [ ] [#2 RAGチャット](https://github.com/TechTM-0/Knowledge/issues/2) 〈#1 #15 #18 #19 が前提〉
  - [ ] [#3 ノート統合](https://github.com/TechTM-0/Knowledge/issues/3) 〈**検索精度の施策ではない**・執筆支援として再定義。#2 への依存は不要と判明〉
- [ ] [#7 画像挿入 + GitHub 自動アップロード](https://github.com/TechTM-0/Knowledge/issues/7) 〈中断中・#20 / #21 の前提〉
- [ ] [#21 手書きメモ・図を画像から読み取ってノート本文に変換](https://github.com/TechTM-0/Knowledge/issues/21) 〈#7 が前提・既存の生成経路にほぼそのまま乗る〉
- [ ] [#20 手書き図を AI で清書して表示できるか](https://github.com/TechTM-0/Knowledge/issues/20) 〈**検討中**・実現性未検証。#7 が前提・手書き図1枚で実測すれば判定できる〉
- [ ] [#6 ノート整理・閲覧まわりの機能追加（エピック）](https://github.com/TechTM-0/Knowledge/issues/6)
  - [ ] [#11 カテゴリ廃止 → タグ検索一本化](https://github.com/TechTM-0/Knowledge/issues/11) 〈DBマイグレーション必要〉
  - [ ] [#12 ノート間リンク記法](https://github.com/TechTM-0/Knowledge/issues/12)
  - [ ] [#13 ノート一覧のソート切り替え](https://github.com/TechTM-0/Knowledge/issues/13) 〈クライアント側のみ・着手コスト低〉
  - [ ] [#14 エクスポート機能](https://github.com/TechTM-0/Knowledge/issues/14) 〈クライアント側のみ・着手コスト低〉
- [ ] [#8 AI生成のストリーミング表示](https://github.com/TechTM-0/Knowledge/issues/8)

## 完了タスク

issue 化前に完了したものは、経緯だけ issue のコメントに残してある。

- [x] ハイブリッド検索（FTS5 + RRF） 〈`routers/vector_search.py:132-138` / 経緯: [#4 コメント](https://github.com/TechTM-0/Knowledge/issues/4#issuecomment-5108454644)〉
- [x] 相対閾値による絞り込み 〈`routers/vector_search.py:57` / 経緯: [#4 コメント](https://github.com/TechTM-0/Knowledge/issues/4#issuecomment-5108454431)〉
- [x] 閾値スライダー UI 〈`static/index.html:58,70` / `static/app.js:307-308`〉
- [x] Gemini API エラーハンドリング（429クォータ超過の即時通知） 〈2026-05-10〉
- [x] サーバー起動・停止 GUI 〈`server-gui.ps1` / `server.ps1` / 2026-07-29〉
