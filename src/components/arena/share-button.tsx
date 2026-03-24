"use client";

import { useState } from "react";

interface ShareButtonProps {
  text: string;
  url: string;
  label?: string;
}

export function ShareButton({ text, url, label = "Share" }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="flex items-center gap-2">
      <a
        href={tweetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10 active:scale-95"
      >
        <svg width="15" height="15" viewBox="0 0 300 300" fill="currentColor">
          <path d="M178.57 127.15 290.27 0h-26.46l-96.79 112.41L89.34 0H0l117.13 170.39L0 305.87h26.46l102.4-118.97 81.8 118.97H300zm-36.33 42.19-11.86-16.97L36.16 19.9h40.66l76.13 108.9 11.86 16.97 98.99 141.59h-40.66z" />
        </svg>
        {label}
      </a>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10 active:scale-95"
        title="Copy link"
      >
        {copied ? (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy
          </>
        )}
      </button>
    </div>
  );
}
