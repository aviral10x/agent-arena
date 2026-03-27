'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@/hooks/use-wallet';

interface TrainerConsoleProps {
  competitionId: string;
  agentId:       string;
  agentName:     string;
  agentOwner:    string;
}

type Status = 'idle' | 'listening' | 'processing' | 'sent' | 'error';

const QUICK_COMMANDS = [
  'Attack the net — cross-court drop shot',
  'Go defensive, clear everything deep',
  'SMASH every high shuttle — go hard',
  'Use your special move NOW!',
  'Drive flat to the backhand corner',
];

export function TrainerConsole({ competitionId, agentId, agentName, agentOwner }: TrainerConsoleProps) {
  const { address }   = useWallet();
  const [mounted, setMounted]       = useState(false);
  const [command, setCommand]       = useState('');
  const [status, setStatus]         = useState<Status>('idle');
  const [history, setHistory]       = useState<{ command: string; time: string }[]>([]);
  const [showQuick, setShowQuick]   = useState(false);
  const [voiceOK, setVoiceOK]       = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
    setVoiceOK(!!(
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    ));
  }, []);

  if (!mounted || !address || address.toLowerCase() !== agentOwner.toLowerCase()) return null;

  // ── Voice ─────────────────────────────────────────────────────────────────────
  const startListening = () => {
    if (!voiceOK) return;
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onstart  = () => setStatus('listening');
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      setCommand(t);
      setStatus('idle');
    };
    rec.onerror = () => setStatus('idle');
    rec.onend   = () => { if (status === 'listening') setStatus('idle'); };
    recognitionRef.current = rec;
    rec.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setStatus('idle');
  };

  // ── Send ──────────────────────────────────────────────────────────────────────
  const sendCommand = async (cmd?: string) => {
    const text = (cmd ?? command).trim();
    if (!text || status === 'processing') return;
    setStatus('processing');
    setShowQuick(false);

    try {
      const res = await fetch(`/api/competitions/${competitionId}/command`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, ownerWallet: address, command: text }),
      });
      const time = new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (res.ok) {
        setHistory(h => [{ command: text, time }, ...h.slice(0, 4)]);
        setCommand('');
        setStatus('sent');
        setTimeout(() => setStatus('idle'), 2500);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const isListening  = status === 'listening';
  const isProcessing = status === 'processing';

  const statusDot = isListening  ? 'bg-red-400 animate-pulse'
                  : isProcessing ? 'bg-yellow-400 animate-pulse'
                  : status === 'sent'  ? 'bg-green-400'
                  : 'bg-yellow-400/50';

  const sendBtnCls = status === 'sent'  ? 'bg-green-500 text-white'
                   : status === 'error' ? 'bg-red-500 text-white'
                   : 'bg-yellow-400 text-black hover:bg-yellow-300';

  return (
    <div className="rounded-xl border border-yellow-400/20 bg-gradient-to-b from-yellow-400/8 to-transparent p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusDot}`} />
          <span className="text-sm font-bold text-yellow-400">🎯 Trainer</span>
          <span className="text-xs text-white/40">→ {agentName}</span>
        </div>
        <button
          onClick={() => setShowQuick(v => !v)}
          className="text-[10px] text-white/30 hover:text-yellow-400/60 transition-colors uppercase tracking-wider"
        >
          {showQuick ? 'hide ↑' : 'quick ↓'}
        </button>
      </div>

      {/* Quick command chips */}
      {showQuick && (
        <div className="flex flex-wrap gap-1.5">
          {QUICK_COMMANDS.map((qc, i) => (
            <button
              key={i}
              onClick={() => sendCommand(qc)}
              disabled={isProcessing}
              className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white/55 hover:text-yellow-300 hover:border-yellow-400/30 transition-all disabled:opacity-40"
            >
              {qc.length > 30 ? qc.slice(0, 30) + '…' : qc}
            </button>
          ))}
        </div>
      )}

      {/* Command history */}
      {history.length > 0 && (
        <div className="space-y-1 max-h-[72px] overflow-y-auto">
          {history.map((h, i) => (
            <div key={i} className="flex gap-2 text-xs font-mono text-white/40">
              <span className="text-white/20 shrink-0">{h.time}</span>
              <span className="text-yellow-400/60 shrink-0">→</span>
              <span className="truncate">"{h.command}"</span>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2 items-center">
        {/* Voice button */}
        {voiceOK && (
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
            title={isListening ? 'Stop' : 'Voice command'}
            className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-base transition-all ${
              isListening
                ? 'bg-red-500/80 text-white animate-pulse'
                : 'bg-white/8 text-white/50 hover:bg-white/15 hover:text-white'
            } disabled:opacity-40`}
          >
            {isListening ? '⏹' : '🎙️'}
          </button>
        )}

        <input
          type="text"
          value={command}
          onChange={e => setCommand(e.target.value.slice(0, 200))}
          onKeyDown={e => { if (e.key === 'Enter') sendCommand(); }}
          placeholder={isListening ? 'Listening…' : `Command ${agentName}…`}
          disabled={isProcessing || isListening}
          className="flex-1 min-w-0 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-yellow-400/40 disabled:opacity-50"
        />

        <button
          onClick={() => sendCommand()}
          disabled={!command.trim() || isProcessing || isListening}
          className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold transition-all disabled:opacity-40 ${sendBtnCls}`}
        >
          {isProcessing ? <span className="animate-spin">⟳</span> : status === 'sent' ? '✓' : '→'}
        </button>
      </div>

      <p className="text-[10px] text-white/20">
        {voiceOK ? '🎙️ Voice · ' : ''}
        Groq-interpreted · Injects next move · 1/5s
      </p>
    </div>
  );
}
