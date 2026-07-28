# Open Tasks

**正本は GitHub Issues** → https://github.com/TechTM-0/Knowledge/issues

このファイルは薄いポインタ。詳細・完了条件・進捗バーは各issueを参照。
issueを閉じたら、ここのチェックを付けて「完了タスク」へ移動する。

## 次の一手

→ **[#7 画像挿入 + GitHub 自動アップロード](https://github.com/TechTM-0/Knowledge/issues/7)**
合意済みの仕様・必要な環境変数・変更ファイル5点の表はすべて issue 本文にある。`routers/images.py` の新規作成から着手する。

着手前に `.env` へ `GITHUB_TOKEN`（`contents: write` スコープ）と `GITHUB_REPO` の追加が必要。

## 残タスク

- [ ] [#7 画像挿入 + GitHub 自動アップロード](https://github.com/TechTM-0/Knowledge/issues/7) 〈着手中〉
- [ ] [#4 ベクトル検索の精度改善（エピック）](https://github.com/TechTM-0/Knowledge/issues/4)
  - [ ] [#9 タイトルと本文を別 embedding にして重み付け](https://github.com/TechTM-0/Knowledge/issues/9) 〈優先度中・再インデックス必要〉
  - [ ] [#10 クエリ拡張](https://github.com/TechTM-0/Knowledge/issues/10) 〈優先度低・latency増〉
- [ ] [#5 AI×ドキュメント統合（エピック）](https://github.com/TechTM-0/Knowledge/issues/5)
  - [ ] [#1 チャットラリー→ノート化](https://github.com/TechTM-0/Knowledge/issues/1) 〈この3本の中では最初に着手する〉
  - [ ] [#2 RAGチャット](https://github.com/TechTM-0/Knowledge/issues/2) 〈#1 が前提〉
  - [ ] [#3 ノート統合](https://github.com/TechTM-0/Knowledge/issues/3) 〈#2 の配管の応用〉
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
