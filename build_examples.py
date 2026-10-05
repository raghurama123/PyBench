from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent
EXAMPLES = ROOT / "examples"
CATALOG = EXAMPLES / "catalog.json"
BUNDLE = EXAMPLES / "bundle.js"

catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
files = {}

for module in catalog["modules"]:
    for example in module["examples"]:
        relative = example["file"]
        files[relative] = (EXAMPLES / relative).read_text(encoding="utf-8")

payload = {"catalog": catalog, "files": files}
BUNDLE.write_text(
    "window.PY_EXAMPLE_BUNDLE = "
    + json.dumps(payload, ensure_ascii=False, indent=2)
    + ";\n",
    encoding="utf-8",
)

print(f"Built {BUNDLE} with {len(files)} examples.")
