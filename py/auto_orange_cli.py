#!/usr/bin/env python3
"""
Автосбор апельсинов — CLI-режим для управления из Electron.
Запускается без GUI. Останавливается по SIGTERM или при наличии stop.flag.
"""
import argparse
import json
import os
import signal
import sys
import time
from datetime import datetime

try:
    import pyautogui
except ImportError:
    print("Установите pyautogui: pip install pyautogui")
    sys.exit(1)

ORANGE_COLORS = [
    (251, 167, 45), (222, 84, 21), (237, 122, 13), (215, 79, 21),
    (248, 235, 167), (242, 139, 18), (121, 20, 0), (137, 47, 10),
]
COLOR_TOLERANCE = 25

_stop_requested = False


def _on_signal(signum, frame):
    global _stop_requested
    _stop_requested = True


def color_matches(pixel, target, tolerance=COLOR_TOLERANCE):
    if len(pixel) < 3:
        return False
    return all(abs(pixel[i] - target[i]) <= tolerance for i in range(3))


def main():
    parser = argparse.ArgumentParser(description="Автосбор апельсинов")
    parser.add_argument("--clicks", required=True, help="Путь к clicks.json")
    parser.add_argument("--stats", required=True, help="Путь к orange_stats.json")
    parser.add_argument("--delay", type=float, default=0.5, help="Задержка между кликами (сек)")
    parser.add_argument("--move", type=float, default=0.3, help="Длительность перемещения мыши (сек)")
    args = parser.parse_args()

    clicks_path = os.path.abspath(args.clicks)
    stats_path = os.path.abspath(args.stats)
    json_dir = os.path.dirname(clicks_path)
    stop_flag_path = os.path.join(json_dir, "stop.flag")

    signal.signal(signal.SIGTERM, _on_signal)
    signal.signal(signal.SIGINT, _on_signal)

    if not os.path.exists(clicks_path):
        sys.exit(1)
    with open(clicks_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    coords = [(p["x"], p["y"]) for p in data if isinstance(p, dict) and "x" in p and "y" in p]
    if not coords:
        sys.exit(1)

    stats = {"total_matches": 0, "total_clicks": 0, "last_updated": None}
    if os.path.exists(stats_path):
        try:
            with open(stats_path, "r", encoding="utf-8") as f:
                stats = json.load(f)
        except (json.JSONDecodeError, IOError):
            pass

    click_delay = max(0, args.delay)
    move_dur = max(0, args.move)

    while not _stop_requested:
        if os.path.exists(stop_flag_path):
            try:
                os.remove(stop_flag_path)
            except OSError:
                pass
            break

        for x, y in coords:
            if _stop_requested:
                break
            if os.path.exists(stop_flag_path):
                break
            try:
                pixel = pyautogui.pixel(x, y)
                for target in ORANGE_COLORS:
                    if color_matches(pixel, target):
                        stats["total_matches"] += 1
                        stats["total_clicks"] += 1
                        stats["last_updated"] = datetime.now().isoformat()
                        pyautogui.click(x, y, duration=move_dur)
                        if click_delay > 0:
                            time.sleep(click_delay)
                        with open(stats_path, "w", encoding="utf-8") as f:
                            json.dump(stats, f, indent=2, ensure_ascii=False)
                        break
            except (pyautogui.FailSafeException, Exception):
                pass

        time.sleep(0.5)


if __name__ == "__main__":
    main()
