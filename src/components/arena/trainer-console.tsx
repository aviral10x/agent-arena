'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';

interface TrainerConsoleProps {
  competitionId: string;
  agentId:       string;
  agentName:     string;
  agentOwner:    string; // wallet address that owns this agent
}

type Status = 'idle' | 'sending' | 'sent' | 'error';

const QUICK_COMMANDS = [
  'Attack the net — he keeps going deep',
  'Switch to defensive — protect your lead',
  'Go cross-court, he\'s leaning down the line',
  'Use your special move now!',
  'SMASH everything — finish the rally fast',
];

export function TrainerConsole({ competitionId, agentId, agentName, agentOwner }: TrainerConsoleProps) {
  const { address } = useAccount();
  const [command, setCommand]   = useState('');
  const [status, setStatus]     = useState<Status>('idle');
  const [history, setHistory]   = useState<{ command: string; time: string }[]>([]);
  const [showQuick, setShowQuick] = useState(false);

  // Only render for the agent owner
  if (!address || address.toLowerCase() !== agentOwner.toLowerCase()) {
    return null;
  }

  const sendCommand = async (cmd?: string) => {
    const text = (cmd ?? command).trim();
    if (!text || status === 'sending') return;

    setStatus('sending');
    setShowQuick(false);

    try {
      const res = await fetch(`/api/competitions/${competitionId}/command`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ agentId, ownerWallet: address, command: text }),
      });

      if (res.ok) {
        setHistory(h => [
          { command: text, time: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
          ...h.slice(0, 4),
        ]);
        setCommand('');
        setStatus('sent');
        setTimeout(() => setStatus('idle'), 2000);
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('[trainer-console] Error:', err);
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const btnLabel =
    status === 'sending' ? '…'
    : status === 'sent'  ? '✓'
    : status === 'error' ? '!'
    : '→';

  const btnClass =
    status === 'sent'  ? 'bg-green-500 text-white'
    : status === 'error' ? 'bg-red-500 text-white'
    : 'bg-yellow-400 text-black hover:bg-yellow-300';

  return (
    <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-yellow-400 text-sm">🎯</span>
          <span className="text-sm font-semibold text-yellow-400">Trainer Console</span>
          <span className="text-xs text-white/40">→ {agentName}</span>
        </div>
        <button
          onClick={() => setShowQuick(v => !v)}
          className="text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          {showQuick ? 'hide quick' : 'quick ▾'}
        </button>
      </div>

      {/* Quick commands */}
      {showQuick && (
        <div className="flex flex-wrap gap-1.5">
          {QUICK_COMMANDS.map((qc, i) => (
            <button
              key={i}
              onClick={() => sendCommand(qc)}
              className="text-xs px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-yellow-400/30 transition-all"
            >
              {qc.slice(0, 30)}{qc.length > 30 ? '…' : ''}
            </button>
          ))}
        </div>
      )}

      {/* Command history */}
      {history.length > 0 && (
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {history.map((h, i) => (
            <div key={i} className="text-xs font-mono text-white/40 flex gap-2">
              <span className="text-white/20 shrink-0">{h.time}</span>
              <span className="truncate">"{h.command}"</span>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={command}
          onChange={e => setCommand(e.target.value.slice(0, 200))}
          onKeyDown={e => { if (e.key === 'Enter') sendCommand(); }}
          placeholder={`Command ${agentName}…`}
          disabled={status === 'sending'}
          className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-yellow-400/50 disabled:opacity-50"
        />
        <button
          onClick={() => sendCommand()}
          disabled={!command.trim() || status === 'sending'}
          className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-40 ${btnClass}`}
        >
          {btnLabel}
        </button>
      </div>

      <p className="text-xs text-white/25">
        Commands inject into your agent's next AI decision. Rate limited: 1 per 5s.
      </p>
    </div>
  );
}
