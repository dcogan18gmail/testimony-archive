"""
Merge speaker labels from AssemblyAI with English translations from Whisper.
Matches by timestamp overlap to produce a speaker-labeled English transcript.
"""

import json


def load_json(path):
    with open(path) as f:
        return json.load(f)


def find_speaker(whisper_start, whisper_end, speaker_segments):
    """Find which speaker best overlaps with a given time range."""
    best_speaker = None
    best_overlap = 0

    for seg in speaker_segments:
        overlap_start = max(whisper_start, seg["start"])
        overlap_end = min(whisper_end, seg["end"])
        overlap = max(0, overlap_end - overlap_start)

        if overlap > best_overlap:
            best_overlap = overlap
            best_speaker = seg["speaker"]

    return best_speaker or "?"


def format_ts(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


def main():
    whisper = load_json("transcript.json")
    assembly = load_json("transcript_speakers.json")

    whisper_segments = whisper["segments"]
    speaker_segments = assembly["segments"]

    merged = []
    for seg in whisper_segments:
        speaker = find_speaker(seg["start"], seg["end"], speaker_segments)
        merged.append({
            "speaker": speaker,
            "start": seg["start"],
            "end": seg["end"],
            "text": seg["text"]
        })

    # Group consecutive segments by same speaker for readability
    grouped = []
    for seg in merged:
        if grouped and grouped[-1]["speaker"] == seg["speaker"]:
            grouped[-1]["end"] = seg["end"]
            grouped[-1]["text"] += " " + seg["text"]
        else:
            grouped.append(dict(seg))

    # Save JSON
    with open("transcript_english_speakers.json", "w") as f:
        json.dump({"segments": grouped, "source_file": "DEFILE_CAM_45848.mp3"}, f, indent=2)

    # Save readable text
    with open("transcript_english_speakers.txt", "w") as f:
        for seg in grouped:
            ts = format_ts(seg["start"])
            f.write(f"[{ts}] Speaker {seg['speaker']}: {seg['text']}\n\n")

    print(f"Merged {len(whisper_segments)} Whisper segments with speaker labels")
    print(f"Grouped into {len(grouped)} speaker turns")
    print("Saved to transcript_english_speakers.json")
    print("Saved to transcript_english_speakers.txt")


if __name__ == "__main__":
    main()
