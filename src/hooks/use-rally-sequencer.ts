'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { RallyFrame } from '@/lib/game-engine';

export type SequencerState = {
  /** Currently playing frame (or null if idle) */
  currentFrame: RallyFrame | null;
  /** Index into current rally */
  frameIndex: number;
  /** Progress within current frame (0–1, for animation interpolation) */
  frameProgress: number;
  /** Is a rally currently playing? */
  isPlaying: boolean;
  /** Total frames in current rally */
  totalFrames: number;
  /** All frames for inspection */
  frames: RallyFrame[];
};

/**
 * Client-side rally animation sequencer.
 * Accepts a batch of RallyFrames and plays them back at proper game speed.
 * Each frame's durationMs controls how long that shot animates.
 *
 * Usage:
 *   const seq = useRallySequencer();
 *   // When server returns a batch rally:
 *   seq.play(frames);
 *   // In your render loop, read seq.state for current positions
 */
export function useRallySequencer(onFrameStart?: (frame: RallyFrame) => void) {
  const [state, setState] = useState<SequencerState>({
    currentFrame: null,
    frameIndex: 0,
    frameProgress: 0,
    isPlaying: false,
    totalFrames: 0,
    frames: [],
  });

  const framesRef = useRef<RallyFrame[]>([]);
  const indexRef = useRef(0);
  const startTimeRef = useRef(0);
  const rafRef = useRef(0);
  const onFrameStartRef = useRef(onFrameStart);
  onFrameStartRef.current = onFrameStart;

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const tick = useCallback(() => {
    const frames = framesRef.current;
    const idx = indexRef.current;

    if (idx >= frames.length) {
      // Rally complete — single setState
      setState(s => ({ ...s, isPlaying: false, frameProgress: 1 }));
      return;
    }

    const frame = frames[idx];
    const elapsed = performance.now() - startTimeRef.current;
    const progress = Math.min(1, elapsed / frame.durationMs);

    if (progress >= 1) {
      // Frame complete — advance and setState ONCE per frame transition (not 60x/sec)
      indexRef.current = idx + 1;
      startTimeRef.current = performance.now();

      const nextIdx = idx + 1;
      if (nextIdx < frames.length) {
        const nextFrame = frames[nextIdx];
        setState({
          currentFrame: nextFrame,
          frameIndex: nextIdx,
          frameProgress: 0,
          isPlaying: true,
          totalFrames: frames.length,
          frames,
        });
        if (onFrameStartRef.current) onFrameStartRef.current(nextFrame);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  /** Start playing a sequence of rally frames */
  const play = useCallback((frames: RallyFrame[]) => {
    cancelAnimationFrame(rafRef.current);
    framesRef.current = frames;
    indexRef.current = 0;
    startTimeRef.current = performance.now();

    setState({
      currentFrame: frames[0] ?? null,
      frameIndex: 0,
      frameProgress: 0,
      isPlaying: true,
      totalFrames: frames.length,
      frames,
    });

    // Fire callback for first frame
    if (frames[0] && onFrameStartRef.current) {
      onFrameStartRef.current(frames[0]);
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  /** Stop playback */
  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setState(s => ({ ...s, isPlaying: false }));
  }, []);

  return { state, play, stop };
}
