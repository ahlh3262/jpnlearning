// src/hooks/use-speech.ts
import { useCallback } from "react";

export const useSpeech = () => {
  const speak = useCallback((text: string, lang: string = "ja-JP") => {
    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.8;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  }, []);

  const stopSpeech = useCallback(() => {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  }, []);

  return { speak, stopSpeech };
};
