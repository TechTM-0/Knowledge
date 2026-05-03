import json, urllib.request, re

def fetch(url):
    with urllib.request.urlopen(url) as res:
        return json.loads(res.read())

def put(note_id, content):
    data = json.dumps({"content": content}).encode("utf-8")
    req = urllib.request.Request(
        f"http://localhost:8000/api/notes/{note_id}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="PUT"
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())

notes = fetch("http://localhost:8000/api/notes")
slides = [n for n in notes if n.get("format_type") == "slide"]
print(f"スライドノート {len(slides)} 件")

# 1件目の内容を確認
note = fetch(f"http://localhost:8000/api/notes/{slides[0]['id']}")
print(f"\n=== id={note['id']} title={note['title']} ===")
print(note["content"][:3000])
