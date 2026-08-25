'use client';

import { useState, useRef, useCallback } from 'react';

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  audioBase64: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  error: string | null;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioBase64(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          setAudioBase64(base64);
        };
        reader.readAsDataURL(blob);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    return new Promise<void>((resolve) => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            setAudioBase64(base64);
            setIsRecording(false);
            resolve();
          };
          reader.readAsDataURL(blob);

          mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
        };
        mediaRecorderRef.current.stop();
      } else {
        setIsRecording(false);
        resolve();
      }
    });
  }, [isRecording]);

  return {
    isRecording,
    audioBase64,
    startRecording,
    stopRecording,
    error,
  };
}
