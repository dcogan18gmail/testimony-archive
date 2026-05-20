const BASE_URL = "https://api.assemblyai.com/v2";

export type AAIUtterance = {
  speaker: string;
  start: number; // seconds
  end: number;   // seconds
  text: string;
};

/**
 * Submit an audio URL to AssemblyAI for transcription with speaker diarization.
 * Returns the transcript ID for polling.
 */
export async function submitToAssemblyAI(
  audioBlobUrl: string,
  apiKey: string
): Promise<string> {
  const res = await fetch(`${BASE_URL}/transcript`, {
    method: "POST",
    headers: {
      authorization: apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      audio_url: audioBlobUrl,
      speaker_labels: true,
      language_detection: true,
      // universal-3-pro alone does not cover all languages (e.g. ru); universal-2 fills the gap
      speech_models: ["universal-3-pro", "universal-2"],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `AssemblyAI submit error: ${res.status}`);
  }

  const data = await res.json();
  return data.id;
}

/**
 * Poll AssemblyAI for transcript status.
 * Returns { status, utterances, detectedLanguage } when complete.
 */
export async function pollAssemblyAI(
  transcriptId: string,
  apiKey: string
): Promise<{
  status: "queued" | "processing" | "completed" | "error";
  utterances: AAIUtterance[];
  detectedLanguage: string | null;
  error: string | null;
}> {
  const res = await fetch(`${BASE_URL}/transcript/${transcriptId}`, {
    headers: { authorization: apiKey },
  });

  if (!res.ok) {
    throw new Error(`AssemblyAI poll error: ${res.status}`);
  }

  const data = await res.json();

  if (data.status === "completed") {
    const utterances: AAIUtterance[] = (data.utterances || []).map(
      (u: { speaker: string; start: number; end: number; text: string }) => ({
        speaker: u.speaker,
        start: u.start / 1000, // ms to seconds
        end: u.end / 1000,
        text: u.text.trim(),
      })
    );
    return {
      status: "completed",
      utterances,
      detectedLanguage: data.language_code || null,
      error: null,
    };
  }

  return {
    status: data.status,
    utterances: [],
    detectedLanguage: null,
    error: data.error || null,
  };
}
