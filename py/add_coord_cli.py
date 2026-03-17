#!/usr/bin/env python3
"""
Добавление текущей позиции мыши в clicks.json.
Выводит в stdout JSON: {"x": N, "y": M}
"""
import argparse
import json
import os
import sys

try:
    import pyautogui
except ImportError:
    print("Установите pyautogui: pip install pyautogui")
    sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Добавить текущую позицию мыши в clicks.json")
    parser.add_argument("--clicks", required=True, help="Путь к clicks.json")
    args = parser.parse_args()

    clicks_path = os.path.abspath(args.clicks)
    clicks_dir = os.path.dirname(clicks_path)
    if not os.path.exists(clicks_dir):
        os.makedirs(clicks_dir, exist_ok=True)

    clicks = []
    if os.path.exists(clicks_path):
        try:
            with open(clicks_path, "r", encoding="utf-8") as f:
                clicks = json.load(f)
        except (json.JSONDecodeError, IOError):
            clicks = []
    if not isinstance(clicks, list):
        clicks = []

    x, y = pyautogui.position()
    clicks.append({"x": x, "y": y})
    with open(clicks_path, "w", encoding="utf-8") as f:
        json.dump(clicks, f, indent=2, ensure_ascii=False)

    print(json.dumps({"x": x, "y": y}))


if __name__ == "__main__":
    main()
