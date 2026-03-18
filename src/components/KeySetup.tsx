"use client";

import { useState, useEffect } from "react";

export default function KeySetup() {
  const [openaiKey, setOpenaiKey] = useState("");
  const [assemblyaiKey, setAssemblyaiKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existingOpenai = localStorage.getItem("openai_api_key");
    const existingAssemblyai = localStorage.getItem("assemblyai_api_key");
    if (existingOpenai && existingAssemblyai) {
      setSaved(true);
    }
  }, []);

  function handleSave() {
    if (!openaiKey.trim() || !assemblyaiKey.trim()) return;
    localStorage.setItem("openai_api_key", openaiKey.trim());
    localStorage.setItem("assemblyai_api_key", assemblyaiKey.trim());
    setSaved(true);
    setOpenaiKey("");
    setAssemblyaiKey("");
  }

  function handleClear() {
    localStorage.removeItem("openai_api_key");
    localStorage.removeItem("assemblyai_api_key");
    setSaved(false);
  }

  return (
    <div className="w-full rounded-lg border border-zinc-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-zinc-900">API Keys</h2>

      {saved ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-600">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-sm font-medium">Keys saved</span>
          </div>
          <button
            onClick={handleClear}
            className="text-sm text-zinc-500 hover:text-zinc-700"
          >
            Clear Keys
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              AssemblyAI API Key
            </label>
            <input
              type="password"
              value={assemblyaiKey}
              onChange={(e) => setAssemblyaiKey(e.target.value)}
              placeholder="Your AssemblyAI key"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />
          </div>
          <button
            onClick={handleSave}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Save Keys
          </button>
        </div>
      )}
    </div>
  );
}
