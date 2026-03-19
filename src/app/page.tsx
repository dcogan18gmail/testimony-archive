import KeySetup from "@/components/KeySetup";
import UploadZone from "@/components/UploadZone";

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 font-sans">
      <h1 className="mb-2 text-3xl font-semibold text-zinc-900">
        Transcription App
      </h1>
      <p className="mb-8 text-zinc-500">
        Upload audio, transcribe, translate, and identify speakers.
      </p>

      <div className="mb-8">
        <KeySetup />
      </div>

      <div className="mb-6">
        <UploadZone />
      </div>

      <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-400">
        Interview list coming in Phase 5
      </div>
    </div>
  );
}
