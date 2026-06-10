from pathlib import Path

root = Path(__file__).resolve().parent.parent
listing = Path(__file__).resolve().parent
index = (listing / "index.html").read_text(encoding="utf-8")
anno_css = (root / "import" / "prototype-annotate.css").read_text(encoding="utf-8")
anno_js = (root / "import" / "prototype-annotate.js").read_text(encoding="utf-8")

index = index.replace(
    '<link rel="stylesheet" href="../../import/prototype-annotate.css" />',
    f"<style>\n/* prototype-annotate.css */\n{anno_css}\n</style>",
)
index = index.replace(
    '<script src="../../import/prototype-annotate.js"></script>',
    f"<script>\n{anno_js}\n</script>",
)
index = index.replace(
    "storageKey: 'qinquan-chuli-list-annotations-v2'",
    "storageKey: 'listing-shanci-list-annotations-v2'",
)
hint = (
    '<span class="proto-hint" style="position:fixed;top:8px;left:8px;z-index:9999;'
    'background:#fff7e6;border:1px solid #ffd591;color:#d46b08;font-size:11px;'
    'padding:4px 10px;border-radius:4px;">PRD 附件 · 单文件（浏览器打开）</span>'
)
index = index.replace("<body>", "<body>\n" + hint)

out = listing / "Listing删词列表-原型-PRD单文件.html"
out.write_text(index, encoding="utf-8")
print(out)
