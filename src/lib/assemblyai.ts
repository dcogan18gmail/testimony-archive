const BASE_URL = "https://api.assemblyai.com/v2";

export type AAIUtterance = {
  speaker: string;
  start: number; // seconds
  end: number; // seconds
  text: string;
  textEnglish?: string;
};

type RawUtterance = {
  speaker: string;
  start: number;
  end: number;
  text: string;
  translated_texts?: Record<string, string>;
};

function parseUtterances(raw: RawUtterance[]): AAIUtterance[] {
  return raw.map((u) => ({
    speaker: u.speaker,
    start: u.start / 1000,
    end: u.end / 1000,
    text: u.text.trim(),
    textEnglish: u.translated_texts?.en?.trim(),
  }));
}

/**
 * Submit audio for transcription with speaker diarization and English translation.
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
      speech_understanding: {
        request: {
          translation: {
            target_languages: ["en"],
            match_original_utterance: true,
          },
        },
      },
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
    return {
      status: "completed",
      utterances: parseUtterances(data.utterances || []),
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
