#!/usr/bin/env python3
"""Build a lightweight API/scenario catalog for k6auto.

Scans apiTest/**/*.js and scenarios/**/*.js and writes report/catalog/catalog.json.
The index is a disposable cache; source code remains the source of truth.
"""

from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
API_DIR = ROOT / "apiTest"
SCENARIO_DIR = ROOT / "scenarios"
OUTPUT_PATH = ROOT / "report" / "catalog" / "catalog.json"


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def split_route_entries(block: str) -> list[tuple[str, str]]:
    lines = block.splitlines(keepends=True)
    base_indent = None
    entries = []
    current_key = None
    current_lines = []

    for line in lines:
        match = re.match(r"^(\s*)([A-Za-z_$][\w$]*):\s*\{", line)
        if match:
            indent = match.group(1)
            if base_indent is None:
                base_indent = indent
            if indent == base_indent:
                if current_key is not None:
                    entries.append((current_key, "".join(current_lines)))
                current_key = match.group(2)
                current_lines = [line]
                continue
        if current_key is not None:
            current_lines.append(line)

    if current_key is not None:
        entries.append((current_key, "".join(current_lines)))

    return entries


def extract_field(body: str, name: str) -> str:
    match = re.search(rf"{re.escape(name)}:\s*'([^']*)'", body)
    return match.group(1) if match else ""


def extract_path(body: str) -> str:
    pattern = re.compile(
        r"path:\s*(?:\([^)]*\)\s*=>\s*)?(?:`([^`]*)`|'([^']*)'|\"([^\"]*)\")",
        re.S,
    )
    match = pattern.search(body)
    if not match:
        return ""
    return next((group for group in match.groups() if group is not None), "")


def exported_functions(text: str) -> list[str]:
    return re.findall(r"^export function\s+([A-Za-z_$][\w$]*)\s*\(", text, re.M)


def parse_api_file(path: Path) -> dict | None:
    text = read_text(path)
    relative = path.relative_to(ROOT).as_posix()

    module_match = re.search(r"export const\s+(\w+Api)\s*=\s*\{", text)
    module_name = module_match.group(1) if module_match else ""

    route_match = re.search(r"const\s+(\w+Routes)\s*=\s*\{(.*?)\n\};", text, re.S)
    routes = []
    if route_match:
        route_block = route_match.group(2)
        for key, body in split_route_entries(route_block):
            routes.append({
                "name": key,
                "method": extract_field(body, "method"),
                "path": extract_path(body),
                "description": extract_field(body, "description"),
            })

    if not routes:
        routes = [{"name": fn, "method": "", "path": "", "description": ""} for fn in exported_functions(text)]

    if not routes:
        return None

    return {
        "file": relative,
        "module": module_name,
        "routes": routes,
    }


def parse_scenario_file(path: Path) -> dict | None:
    text = read_text(path)
    relative = path.relative_to(ROOT).as_posix()
    functions = exported_functions(text)
    if not functions:
        return None

    casenames = re.findall(r"casename:\s*'([^']*)'", text)
    groups = re.findall(r"group:\s*'([^']*)'", text)

    return {
        "file": relative,
        "functions": functions,
        "casenames": casenames[:20],
        "groups": groups[:10],
    }


def main() -> None:
    apis = []
    scenarios = []

    for path in sorted(API_DIR.rglob("*.js")):
        parsed = parse_api_file(path)
        if parsed:
            apis.append(parsed)

    for path in sorted(SCENARIO_DIR.rglob("*.js")):
        parsed = parse_scenario_file(path)
        if parsed:
            scenarios.append(parsed)

    catalog = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "apiCount": sum(len(item["routes"]) for item in apis),
        "scenarioFunctionCount": sum(len(item["functions"]) for item in scenarios),
        "apis": apis,
        "scenarios": scenarios,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"[OK] catalog written: {OUTPUT_PATH}")
    print(f"[OK] api routes: {catalog['apiCount']}, scenario functions: {catalog['scenarioFunctionCount']}")


if __name__ == "__main__":
    main()
