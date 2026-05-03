import json, urllib.request, re, sys

DRY_RUN = '--apply' not in sys.argv

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

def update_colors(html):
    # 1. background-color → transparent
    html = re.sub(r'background-color\s*:\s*[^;}"\']+', 'background-color:transparent', html)
    # 2. color → #ffffff（background-color の color 部分は除外）
    html = re.sub(r'(?<!-)color\s*:\s*[^;}"\']+', 'color:#ffffff', html)
    # 3. <strong> の color を #a5b4fc に設定（step2 で #ffffff になったものも含め上書き）
    def fix_strong(m):
        tag = m.group(0)
        if 'style=' in tag:
            if re.search(r'(?<!-)color\s*:', tag):
                tag = re.sub(r'(?<!-)color\s*:\s*[^;}"\']+', 'color:#a5b4fc', tag)
            else:
                tag = re.sub(r'style="', 'style="color:#a5b4fc;', tag)
        else:
            tag = tag[:-1] + ' style="color:#a5b4fc">'
        return tag
    html = re.sub(r'<strong[^>]*>', fix_strong, html)
    return html

notes = fetch("http://localhost:8000/api/notes")
slides = [n for n in notes if n.get("format_type") == "slide"]
print(f"スライドノート {len(slides)} 件  ({'ドライラン' if DRY_RUN else '適用'})\n")

for n in slides:
    note = fetch(f"http://localhost:8000/api/notes/{n['id']}")
    updated = update_colors(note["content"])
    changed = updated != note["content"]
    print(f"{'変更あり' if changed else '変更なし'}: id={note['id']} title={note['title']}")
    if changed and DRY_RUN:
        # 変更箇所を diff 的に表示（最初の差分行のみ）
        orig_lines = note["content"].splitlines()
        new_lines  = updated.splitlines()
        shown = 0
        for o, nw in zip(orig_lines, new_lines):
            if o != nw and shown < 5:
                print(f"  - {o.strip()[:100]}")
                print(f"  + {nw.strip()[:100]}")
                shown += 1
    if changed and not DRY_RUN:
        put(note["id"], updated)

if DRY_RUN:
    print("\n--apply を付けて実行すると全件更新します")
