#!/usr/bin/env python3
"""
Распознавание аудио через ShazamIO. Принимает путь к WAV/MP3/OGG.
Выводит JSON в stdout.
"""
import argparse
import json
import sys

try:
    from ShazamAPI import Shazam
except ImportError:
    print(json.dumps({"error": "Установите ShazamAPI: pip install ShazamAPI"}), file=sys.stderr)
    sys.exit(1)


def extract_result(data: dict) -> dict:
    """Извлекает title, artist, cover, ссылки из ответа ShazamIO."""
    if not data or not isinstance(data, dict):
        return {}
    track = data.get("track") or {}
    if not track:
        return {}

    title = track.get("title") or track.get("heading", {}).get("title", "")
    subtitle = track.get("subtitle") or track.get("heading", {}).get("subtitle", "")

    images = track.get("images") or {}
    cover = images.get("coverart") or images.get("coverarthq") or ""

    hub = track.get("hub") or {}
    providers = hub.get("providers") or []
    options = hub.get("options") or []

    spotify_url = ""
    apple_music_url = ""
    for p in providers:
        acts = p.get("actions") or []
        for a in acts:
            uri = a.get("uri", "")
            if "spotify" in uri.lower():
                spotify_url = uri
            elif "apple" in uri.lower() or "music.apple" in uri.lower():
                apple_music_url = uri

    for o in options:
        acts = o.get("actions") or []
        for a in acts:
            uri = a.get("uri", "")
            if "apple" in uri.lower() and not apple_music_url:
                apple_music_url = uri

    return {
        "title": str(title) if title else "",
        "artist": str(subtitle) if subtitle else "",
        "coverUrl": str(cover) if cover else "",
        "spotify": spotify_url and {"external_urls": {"spotify": spotify_url}} or None,
        "apple_music": apple_music_url and {"url": apple_music_url} or None,
    }


def recognize_file(file_path: str) -> dict:
    try:
        with open(file_path, "rb") as f:
            data = f.read()
        shazam = Shazam(data)
        last = None
        for offset, resp in shazam.recognizeSong():
            if resp and resp.get("track"):
                last = resp
        return extract_result(last) if last else {}
    except Exception as e:
        err = str(e)
        if "ffmpeg" in err.lower() or "ffprobe" in err.lower() or "WinError 2" in err:
            return {"_error": "Установите ffmpeg и добавьте в PATH: https://ffmpeg.org"}
        return {"_error": err}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Путь к аудиофайлу (WAV/MP3/OGG)")
    args = parser.parse_args()

    try:
        result = recognize_file(args.input)
        if result.get("_error"):
            print(json.dumps({"error": result["_error"]}), flush=True)
            sys.exit(1)
        if not result.get("title") and not result.get("artist"):
            print(json.dumps({"error": "Музыка не распознана"}), flush=True)
            sys.exit(1)
        print(json.dumps({"result": result}), flush=True)
    except Exception as e:
        print(json.dumps({"error": str(e)}), flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
