# -*- coding: utf-8 -*-
import urllib.request, json, sys

# 文字化けテンプレートを削除して正しく再登録する
base = "http://localhost:8000"

def delete_all():
    req = urllib.request.Request(f"{base}/api/templates")
    with urllib.request.urlopen(req) as r:
        templates = json.loads(r.read().decode("utf-8"))
    for t in templates:
        req = urllib.request.Request(f"{base}/api/templates/{t['id']}", method="DELETE")
        urllib.request.urlopen(req)
    print(f"{len(templates)} 件削除しました")

def create(name, content):
    data = json.dumps({"name": name, "format_type": "article", "content": content},
                      ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(f"{base}/api/templates", data=data,
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as r:
        t = json.loads(r.read().decode("utf-8"))
    print(f"作成: id={t['id']} name={t['name']}")

delete_all()

create("調査メモ", """# タイトル

## 概要

## 詳細

## まとめ
""")

create("技術メモ", """# タイトル

## 背景・目的

## 実装方法

## サンプルコード

## 注意点
""")

create("アイデアメモ", """# アイデアタイトル

## 概要

## メリット

## 課題・懸念点

## 次のアクション
""")
