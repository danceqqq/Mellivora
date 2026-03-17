#!/usr/bin/env python3
"""
Захват системного аудио (WASAPI loopback) для Shazam.
Записывает то, что играет на ПК, в WAV-файл.
"""
import argparse
import sys
import wave

try:
    import pyaudiowpatch as pyaudio
except ImportError:
    print("Установите: pip install PyAudioWPatch", file=sys.stderr)
    sys.exit(1)

DURATION_DEFAULT = 8.0
CHUNK_SIZE = 512


def main():
    parser = argparse.ArgumentParser(description="Захват системного аудио (loopback)")
    parser.add_argument("--output", required=True, help="Путь к выходному WAV-файлу")
    parser.add_argument("--duration", type=float, default=DURATION_DEFAULT, help="Длительность записи (сек)")
    args = parser.parse_args()

    try:
        with pyaudio.PyAudio() as p:
            try:
                wasapi_info = p.get_host_api_info_by_type(pyaudio.paWASAPI)
            except OSError:
                print("WASAPI недоступен", file=sys.stderr)
                sys.exit(1)

            default_speakers = p.get_device_info_by_index(wasapi_info["defaultOutputDevice"])

            if not default_speakers.get("isLoopbackDevice"):
                for loopback in p.get_loopback_device_info_generator():
                    if default_speakers["name"] in loopback["name"]:
                        default_speakers = loopback
                        break
                else:
                    print("Loopback устройство не найдено", file=sys.stderr)
                    sys.exit(1)

            wave_file = wave.open(args.output, "wb")
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
            ) as stream:
                import time
                time.sleep(min(args.duration, 25))

            wave_file.close()
            print(args.output)

    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
