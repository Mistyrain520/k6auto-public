#!/usr/bin/env python3
"""Summarize the latest zaplogger result files into a compact checklist.

Usage:
    python summarize_logs.py                 # newest YYYY-MM-DD dir under cwd
    python summarize_logs.py --path 2026-08-02
"""
import argparse
import glob
import json
import os
import sys


def summarize(path):
    files = sorted(
        glob.glob(os.path.join(path, "*-result.json")),
        key=os.path.getmtime,
        reverse=True,
    )
    rows = []
    for f in files:
        try:
            with open(f, encoding="utf-8") as fh:
                obj = json.load(fh)
        except Exception as exc:
            rows.append((os.path.basename(f), "unreadable", "", str(exc)))
            continue
        name = obj.get("name") or obj.get("msg") or os.path.basename(f)
        status = obj.get("status", "")
        message = obj.get("statusDetails", {}).get("message", "")
        failed = [
            step.get("name")
            for step in (obj.get("steps") or [])
            if step.get("status") != "passed"
        ]
        rows.append((name, status, "; ".join(failed), message))

    if not rows:
        print(f"No *-result.json found under {path}")
        return
    print(f"# {len(rows)} results from {path}")
    for name, status, failed, message in rows:
        message = (message or "").replace("\n", " ")
        if len(message) > 160:
            message = message[:160] + "..."
        flag = "FAIL" if failed or status != "passed" else "ok  "
        print(f"- [{flag}] {name} | {status} | failed-steps: {failed or '-'} | {message}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--path",
        default=None,
        help="Log directory (default: newest YYYY-MM-DD dir under report/allure)",
    )
    args = parser.parse_args()
    base = args.path
    if not base:
        dirs = [
            d
            for d in glob.glob(os.path.join(os.getcwd(), "report", "allure", "20??-??-??"))
            if os.path.isdir(d)
        ]
        base = max(dirs, key=os.path.getmtime) if dirs else None
        if not base:
            print("No date log directories found; pass --path explicitly")
            sys.exit(1)
    summarize(base)


if __name__ == "__main__":
    main()
