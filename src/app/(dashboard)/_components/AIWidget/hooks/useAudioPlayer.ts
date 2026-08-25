'use client';

import { useState, useRef, useCallback } from 'react';

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  play: (audioBase64: string) => Promise<void>;
  stop: () => void;
  error: string | null;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const play = useCallback(async (audioBase64: string) => {
    try {
      setError(null);
      stop();

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const audioContext = audioContextRef.current;

      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      source.onended = () => {
        setIsPlaying(false);
        sourceRef.current = null;
      };

      source.start(0);
      sourceRef.current = source;
      setIsPlaying(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to play audio');
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  return {
    isPlaying,
    play,
    stop,
    error,
  };
}
