"""
Apply identified speaker names to the English transcript.
Uses timestamp ranges to map generic labels to real names.
"""

import json


# Timeline of who Speaker B is at each point
SPEAKER_B_TIMELINE = [
    (0, 1754, "Unknown Guest 1"),
    (1754, 2156, "Nicole"),
    (2156, 2326, "Arlette Wolam"),
    (2326, 2968, "Caroline (makeup artist)"),
    (2968, 3218, "Unknown Guest (mother of Raphael)"),
    (3218, 3874, "Jeanette"),
    (3874, 4655, "Jess"),
    (4655, 4746, "Unknown Guest"),
    (4746, 6114, "Frania Verniote"),
    (6114, 7247, "Marcelle"),
    (7247, 7528, "Elisa"),
    (7528, 8318, "Elisa"),
    (8318, 8400, "Unknown Guest (family group)"),
    (8400, 9526, "Laetitia"),
    (9526, 10165, "Unknown Guest"),
    (10165, 10591, "Cornelia"),
    (10591, 10831, "Lola Puell"),
    (10831, 11248, "Edward"),
    (11248, 11700, "Unknown Guest (lost mother at 5)"),
    (11700, 12178, "Nicole"),
    (12178, 13364, "Unknown Guest (seamstress)"),
    (13364, 14167, "Skornik family member"),
    (14167, 14265, "Unknown Guest"),
    (14265, 14526, "Unknown Guest"),
    (14526, 14900, "Eveline"),
    (14900, 15402, "Susan"),
    (15402, 15728, "Staff discussion"),
    (15728, 16364, "Helene Marie Schmitz"),
]

SPEAKER_A_NAME = "Solange Raffovitch"


def get_speaker_b_name(start_seconds):
    for range_start, range_end, name in SPEAKER_B_TIMELINE:
        if range_start <= start_seconds < range_end:
            return name
    return "Unknown"


def format_ts(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


def main():
    with open("transcript_english_speakers.json") as f:
        data = json.load(f)

    named_segments = []
    for seg in data["segments"]:
        if seg["speaker"] == "A":
            name = SPEAKER_A_NAME
        elif seg["speaker"] == "B":
            name = get_speaker_b_name(seg["start"])
        else:
            name = get_speaker_b_name(seg["start"])

        named_segments.append({
            "speaker": name,
            "speaker_label": seg["speaker"],
            "start": seg["start"],
            "end": seg["end"],
            "text": seg["text"]
        })

    # Save JSON
    with open("transcript_final.json", "w") as f:
        json.dump({"segments": named_segments, "source_file": "DEFILE_CAM_45848.mp3"}, f, indent=2)

    # Save readable text
    with open("transcript_final.txt", "w") as f:
        for seg in named_segments:
            ts = format_ts(seg["start"])
            f.write(f"[{ts}] {seg['speaker']}: {seg['text']}\n\n")

    print(f"Applied names to {len(named_segments)} segments")
    print("Saved to transcript_final.json")
    print("Saved to transcript_final.txt")

    # Summary
    from collections import Counter
    names = Counter(seg["speaker"] for seg in named_segments)
    print("\nSpeaker breakdown:")
    for name, count in names.most_common():
        print(f"  {name}: {count} segments")


if __name__ == "__main__":
    main()
