"""
Transcribe and translate an audio file using OpenAI's Whisper API.

Splits large files into chunks (under 25MB) to stay within API limits,
then sends each chunk for translation to English.
"""

import os
import subprocess
import json
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(override=True)

AUDIO_FILE = "DEFILE_CAM_45848.mp3"
CHUNK_DIR = "chunks"
OUTPUT_FILE = "transcript.json"
OUTPUT_TEXT = "transcript.txt"
MAX_CHUNK_MB = 24  # Stay under 25MB API limit
CHUNK_DURATION_MINUTES = 10  # Each chunk is ~10 minutes


def split_audio(input_file, chunk_dir, chunk_minutes=CHUNK_DURATION_MINUTES):
    """Split audio into chunks using ffmpeg."""
    os.makedirs(chunk_dir, exist_ok=True)

    # Get total duration in seconds
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
         "-of", "csv=p=0", input_file],
        capture_output=True, text=True
    )
    total_seconds = float(result.stdout.strip())
    total_minutes = total_seconds / 60
    chunk_seconds = chunk_minutes * 60

    print(f"Total duration: {total_minutes:.1f} minutes")

    chunks = []
    start = 0
    i = 0
    while start < total_seconds:
        chunk_path = os.path.join(chunk_dir, f"chunk_{i:03d}.mp3")
        subprocess.run([
            "ffmpeg", "-y", "-i", input_file,
            "-ss", str(start), "-t", str(chunk_seconds),
            "-acodec", "libmp3lame", "-b:a", "48k",
            "-loglevel", "error",
            chunk_path
        ], check=True)

        size_mb = os.path.getsize(chunk_path) / (1024 * 1024)
        chunks.append({
            "path": chunk_path,
            "start_seconds": start,
            "size_mb": round(size_mb, 2)
        })
        print(f"  Chunk {i}: {start/60:.1f}m - {min((start + chunk_seconds)/60, total_minutes):.1f}m ({size_mb:.1f}MB)")
        start += chunk_seconds
        i += 1

    return chunks


def transcribe_chunks(chunks, client):
    """Send each chunk to OpenAI Whisper API for translation to English."""
    segments = []

    for i, chunk in enumerate(chunks):
        print(f"Translating chunk {i+1}/{len(chunks)}: {chunk['path']}")
        with open(chunk["path"], "rb") as f:
            response = client.audio.translations.create(
                model="whisper-1",
                file=f,
                response_format="verbose_json"
            )

        # Offset timestamps by chunk start time
        offset = chunk["start_seconds"]
        for seg in response.segments:
            segments.append({
                "start": round(seg.start + offset, 2),
                "end": round(seg.end + offset, 2),
                "text": seg.text.strip()
            })

        print(f"  Got {len(response.segments)} segments")

    return segments


def format_timestamp(seconds):
    """Convert seconds to HH:MM:SS format."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


def main():
    client = OpenAI()

    print("=== Step 1: Splitting audio into chunks ===")
    chunks = split_audio(AUDIO_FILE, CHUNK_DIR)
    print(f"\nCreated {len(chunks)} chunks\n")

    print("=== Step 2: Translating to English via Whisper API ===")
    segments = transcribe_chunks(chunks, client)
    print(f"\nGot {len(segments)} total segments\n")

    # Save structured JSON
    with open(OUTPUT_FILE, "w") as f:
        json.dump({"segments": segments, "source_file": AUDIO_FILE}, f, indent=2)
    print(f"Saved structured transcript to {OUTPUT_FILE}")

    # Save readable text version
    with open(OUTPUT_TEXT, "w") as f:
        for seg in segments:
            ts = format_timestamp(seg["start"])
            f.write(f"[{ts}] {seg['text']}\n")
    print(f"Saved readable transcript to {OUTPUT_TEXT}")

    print("\nDone!")


if __name__ == "__main__":
    main()
