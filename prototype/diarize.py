"""
Transcribe + diarize audio using AssemblyAI REST API directly.
Produces a speaker-labeled transcript with timestamps.
"""

import os
import json
import time
import requests
from dotenv import load_dotenv

load_dotenv(override=True)

AUDIO_FILE = "DEFILE_CAM_45848.mp3"
OUTPUT_JSON = "transcript_speakers.json"
OUTPUT_TEXT = "transcript_speakers.txt"
API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
BASE_URL = "https://api.assemblyai.com/v2"
HEADERS = {"authorization": API_KEY}


def upload_file(filepath):
    print(f"Uploading {filepath}...")
    with open(filepath, "rb") as f:
        resp = requests.post(
            f"{BASE_URL}/upload",
            headers=HEADERS,
            data=f
        )
    resp.raise_for_status()
    url = resp.json()["upload_url"]
    print(f"Uploaded: {url[:60]}...")
    return url


def create_transcript(audio_url):
    print("Starting transcription with speaker diarization...")
    resp = requests.post(
        f"{BASE_URL}/transcript",
        headers=HEADERS,
        json={
            "audio_url": audio_url,
            "speaker_labels": True,
            "language_detection": True,
            "speech_models": ["universal-3-pro"],
        }
    )
    resp.raise_for_status()
    transcript_id = resp.json()["id"]
    print(f"Transcript ID: {transcript_id}")
    return transcript_id


def poll_transcript(transcript_id):
    url = f"{BASE_URL}/transcript/{transcript_id}"
    while True:
        resp = requests.get(url, headers=HEADERS)
        resp.raise_for_status()
        data = resp.json()
        status = data["status"]

        if status == "completed":
            print("Transcription complete!")
            return data
        elif status == "error":
            print(f"Error: {data['error']}")
            exit(1)
        else:
            print(f"  Status: {status}...")
            time.sleep(15)


def format_ts(ms):
    seconds = ms / 1000
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


def main():
    audio_url = upload_file(AUDIO_FILE)
    transcript_id = create_transcript(audio_url)
    data = poll_transcript(transcript_id)

    utterances = data.get("utterances", [])
    print(f"Got {len(utterances)} speaker-labeled segments")

    segments = []
    for utt in utterances:
        segments.append({
            "speaker": utt["speaker"],
            "start": utt["start"] / 1000,
            "end": utt["end"] / 1000,
            "text": utt["text"].strip()
        })

    with open(OUTPUT_JSON, "w") as f:
        json.dump({
            "segments": segments,
            "source_file": AUDIO_FILE,
            "detected_language": data.get("language_code", "unknown")
        }, f, indent=2)
    print(f"Saved to {OUTPUT_JSON}")

    with open(OUTPUT_TEXT, "w") as f:
        for seg in segments:
            ts = format_ts(seg["start"] * 1000)
            f.write(f"[{ts}] Speaker {seg['speaker']}: {seg['text']}\n\n")
    print(f"Saved to {OUTPUT_TEXT}")

    print("Done!")


if __name__ == "__main__":
    main()
