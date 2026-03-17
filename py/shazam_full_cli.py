#!/usr/bin/env python3
"""
Захват системного аудио (WASAPI loopback) + распознавание через ShazamIO.
Без API ключа. Выводит JSON с результатом в stdout.
"""
import argparse
import json
import os
import sys
import tempfile
import time
import wave

try:
    import pyaudiowpatch as pyaudio
except ImportError:
    print(json.dumps({"error": "Установите PyAudioWPatch: pip install PyAudioWPatch"}), file=sys.stderr)
    sys.exit(1)

try:
    from ShazamAPI import Shazam
except ImportError as e:
    print(json.dumps({"error": "Установите: pip install ShazamAPI pydub audioop-lts. Нужен ffmpeg в PATH."}), file=sys.stderr)
    sys.exit(1)

DURATION_DEFAULT = 8.0
CHUNK_SIZE = 512


def capture_audio(output_path: str, duration: float) -> bool:
    """Захват системного аудио в WAV."""
    try:
        with pyaudio.PyAudio() as p:
            try:
                wasapi_info = p.get_host_api_info_by_type(pyaudio.paWASAPI)
            except OSError:
                return False

            default_speakers = p.get_device_info_by_index(wasapi_info["defaultOutputDevice"])
            if not default_speakers.get("isLoopbackDevice"):
                for loopback in p.get_loopback_device_info_generator():
                    if default_speakers["name"] in loopback["name"]:
                        default_speakers = loopback
                        break
                else:
                    return False

            wave_file = wave.open(output_path, "wb")
            wave_file.setnchannels(int(default_speakers["maxInputChannels"]))
            wave_file.setsampwidth(pyaudio.get_sample_size(pyaudio.paInt16))
            wave_file.setframerate(int(default_speakers["defaultSampleRate"]))

            def callback(in_data, frame_count, time_info, status):
                wave_file.writeframes(in_data)
                return (in_data, pyaudio.paContinue)

            with p.open(
                format=pyaudio.paInt16,
                channels=int(default_speakers["maxInputChannels"]),
                rate=int(default_speakers["defaultSampleRate"]),
                frames_per_buffer=CHUNK_SIZE,
                input=True,
                input_device_index=default_speakers["index"],
                stream_callback=callback,
            ):
                time.sleep(min(duration, 25))

            wave_file.close()
            return True
    except Exception:
        return False


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
    actions = hub.get("actions") or []

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
    """Распознаёт аудио через ShazamAPI."""
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
    parser = argparse.ArgumentParser(description="Захват + распознавание через Shazam")
    parser.add_argument("--duration", type=float, default=DURATION_DEFAULT, help="Длительность записи (сек)")
    args = parser.parse_args()

    wav_path = None
    try:
        fd, wav_path = tempfile.mkstemp(suffix=".wav")
        os.close(fd)

        if not capture_audio(wav_path, args.duration):
            print(json.dumps({"error": "Ошибка захвата звука. Установите PyAudioWPatch."}), flush=True)
            sys.exit(1)

        if not os.path.exists(wav_path) or os.path.getsize(wav_path) < 1000:
            print(json.dumps({"error": "Запись слишком короткая или пустая"}), flush=True)
            sys.exit(1)

        result = recognize_file(wav_path)

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
    finally:
        if wav_path and os.path.exists(wav_path):
            try:
                os.unlink(wav_path)
            except OSError:
                pass


if __name__ == "__main__":
    main()
