"use client";

import { useState, useEffect, useRef } from "react";

export default function KeySetup() {
  const [openaiKey, setOpenaiKey] = useState("");
  const [assemblyaiKey, setAssemblyaiKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const existingOpenai = localStorage.getItem("openai_api_key");
    const existingAssemblyai = localStorage.getItem("assemblyai_api_key");
    if (existingOpenai && existingAssemblyai) {
      setSaved(true);
    }
    setLoaded(true);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  function handleSave() {
    if (!openaiKey.trim() || !assemblyaiKey.trim()) return;
    localStorage.setItem("openai_api_key", openaiKey.trim());
    localStorage.setItem("assemblyai_api_key", assemblyaiKey.trim());
    setSaved(true);
    setOpenaiKey("");
    setAssemblyaiKey("");
    setMenuOpen(false);
  }

  function handleClear() {
    localStorage.removeItem("openai_api_key");
    localStorage.removeItem("assemblyai_api_key");
    setSaved(false);
    setMenuOpen(false);
  }

  // Avoid flash of wrong state before localStorage is read
  if (!loaded) return null;

  // Keys already saved: small settings icon (rendered in the header area by parent)
  if (saved) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-subtle hover:text-body transition-colors"
          aria-label="API key settings"
          title="API key settings"
        >
          <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-10 z-50 w-64 rounded-lg border border-border bg-card p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-heading">API Keys</span>
              <div className="flex items-center gap-1 text-success">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[11px]">Connected</span>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="w-full rounded-md border border-border px-3 py-1.5 text-[13px] text-muted hover:bg-subtle hover:text-body transition-colors"
            >
              Clear Keys
            </button>
          </div>
        )}
      </div>
    );
  }

  // No keys: focused setup screen
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h2 className="font-serif text-[28px] tracking-[0.01em] text-heading">
            Get Started
          </h2>
          <p className="mt-2 text-[15px] text-muted">
            Enter your API keys to begin transcribing interviews.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-[13px] font-semibold text-body">
                OpenAI API Key
              </label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full rounded-md border border-border px-3 py-2 text-[13px] text-body focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-semibold text-body">
                AssemblyAI API Key
              </label>
              <input
                type="password"
                value={assemblyaiKey}
                onChange={(e) => setAssemblyaiKey(e.target.value)}
                placeholder="Your AssemblyAI key"
                className="w-full rounded-md border border-border px-3 py-2 text-[13px] text-body focus:border-accent focus:outline-none"
              />
            </div>
            <button
              onClick={handleSave}
              className="rounded-md bg-accent px-4 py-2.5 text-[13px] font-medium text-white hover:bg-accent-hover transition-colors"
            >
              Save Keys
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
