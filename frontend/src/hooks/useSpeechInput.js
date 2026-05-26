// hooks/useSpeechInput.js
import { useState, useEffect, useRef, useCallback } from 'react';

export function useSpeechInput({ lang = 'fr-FR', onResult, continuous = true } = {}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);

  const recogRef      = useRef(null);
  const activeRef     = useRef(false);
  const onResultRef   = useRef(onResult);
  const accumulatedRef = useRef('');   // طھط¬ظ…يع ظƒظ„ ط§ظ„ظ†ص
  const silenceTimer  = useRef(null);  // ظ…ط¤ظ‚ت ط§ظ„طµظ…ت

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);

    const recog           = new SR();
    recog.lang            = lang;
    recog.interimResults  = true;   // ✅ ظ†تائج ظ…ط¤ظ‚تة ط£ط«ظ†اء ط§ظ„ظƒظ„ط§ظ…
    recog.maxAlternatives = 1;
    recog.continuous      = true;   // ✅ ظ„ا ظٹطھظˆظ‚ف بعد ط£ظˆظ„ ط¬ظ…ظ„ة

    recog.onstart = () => {
      activeRef.current = true;
      accumulatedRef.current = '';
      setListening(true);
    };

    recog.onresult = (e) => {
      // ظ†ط¬ظ…ع ظپظ‚ط ط§ظ„ظ†تائج ط§ظ„ظ†ظ‡ائية
      let finalText = '';
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalText += e.results[i][0].transcript + ' ';
        }
      }
      if (finalText.trim()) {
        accumulatedRef.current = finalText.trim();
      }

      // ظ…ط¤ظ‚ت طµظ…ت — إذا طھظˆظ‚ف ط§ظ„ظƒظ„ط§ظ… 1.5 ط«ط§ظ†ية ظ†ط±ط³ظ„ ط§ظ„ظ†تيجة
      clearTimeout(silenceTimer.current);
      silenceTimer.current = setTimeout(() => {
        if (accumulatedRef.current && activeRef.current) {
          onResultRef.current?.(accumulatedRef.current);
          accumulatedRef.current = '';
        }
      }, 1500);
    };

    recog.onend = () => {
      // إذا ظƒط§ظ† ظ„ا ظٹط²ط§ظ„ في ظˆضع ط§ظ„ط§ط³طھظ…اع أعد ط§ظ„طھط´ط؛ظٹظ„ (continuous workaround)
      if (activeRef.current) {
        try { recog.start(); } catch (_) {}
        return;
      }
      // ط¥ط±ط³ط§ظ„ ظ…ا طھط¨ظ‚ظ‰
      clearTimeout(silenceTimer.current);
      if (accumulatedRef.current) {
        onResultRef.current?.(accumulatedRef.current);
        accumulatedRef.current = '';
      }
      setListening(false);
    };

    recog.onerror = (e) => {
      if (e.error === 'no-speech') return; // طھط¬ط§ظ‡ظ„ خطأ ط§ظ„طµظ…ت
      activeRef.current = false;
      clearTimeout(silenceTimer.current);
      setListening(false);
    };

    recogRef.current = recog;
    return () => {
      recog.onstart = recog.onresult = recog.onend = recog.onerror = null;
      clearTimeout(silenceTimer.current);
      try { recog.abort(); } catch (_) {}
      activeRef.current = false;
    };
  }, [lang]);

  const start = useCallback(() => {
    if (!recogRef.current || activeRef.current) return;
    accumulatedRef.current = '';
    try { recogRef.current.start(); } catch (_) {}
  }, []);

  const stop = useCallback(() => {
    if (!recogRef.current || !activeRef.current) return;
    activeRef.current = false;
    clearTimeout(silenceTimer.current);
    // ط¥ط±ط³ط§ظ„ ظ…ا طھط¬ظ…ع ظ‚ط¨ظ„ ط§ظ„ط¥ظٹظ‚اف
    if (accumulatedRef.current) {
      onResultRef.current?.(accumulatedRef.current);
      accumulatedRef.current = '';
    }
    try { recogRef.current.stop(); } catch (_) {}
  }, []);

  const toggle = useCallback(() => {
    activeRef.current ? stop() : start();
  }, [start, stop]);

  return { listening, supported, start, stop, toggle };
}