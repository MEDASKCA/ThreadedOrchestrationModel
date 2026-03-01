"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";
import ReactMarkdown from "react-markdown";
import RichResponseRenderer from "@/components/RichResponseRenderer";
import type { RichResponse, RichSection } from "@/lib/tom/rich-response";
import { getRelatedStates, type ProcessingState } from "@/lib/processingState";
import { getGreeting, type GreetingResult } from "@/lib/greetingEngine";

const mdComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  p:      ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-[#0f172a]">{children}</strong>,
  em:     ({ children }) => <em className="italic">{children}</em>,
  ul:     ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>,
  ol:     ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>,
  li:     ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1:     ({ children }) => <p className="font-semibold text-[#0f172a] mt-3 mb-1">{children}</p>,
  h2:     ({ children }) => <p className="font-semibold text-[#0f172a] mt-2 mb-1">{children}</p>,
  h3:     ({ children }) => <p className="font-medium text-[#0f172a] mt-2 mb-0.5">{children}</p>,
  code:   ({ children }) => <code className="bg-[#f1f5f9] text-[#0f172a] rounded px-1.5 py-0.5 text-[0.85em] font-mono">{children}</code>,
  pre:    ({ children }) => <pre className="bg-[#f1f5f9] rounded-lg p-4 overflow-x-auto text-[0.85em] font-mono my-2">{children}</pre>,
  hr:     () => <hr className="border-[#e2e8f0] my-3" />,
};

export type ChatRole = "user" | "assistant";
export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  rich?: RichResponse | null;
  debug_routing_path?: string;
  trace_routing_path?: string;
  debug_stage?: "think" | "read" | "verify" | "respond";
};

// --- VOICE WAVE ---------------------------------------------------------------
// 7-bar audio-visualiser style - different from GPT (orb) and Claude (circle)

const VOICE_DELAYS = [0, 0.15, 0.07, 0.22, 0.11, 0.18, 0.04];
const VOICE_HEIGHTS = [10, 22, 16, 28, 18, 24, 12]; // base heights in px

function VoiceWave() {
  return (
    <>
      <style>{`
        @keyframes tom-voice-bar {
          0%   { transform: scaleY(0.25); opacity: 0.5; }
          100% { transform: scaleY(1);    opacity: 1;   }
        }
      `}</style>
      <div className="flex items-center gap-[4px]" style={{ height: 36 }}>
        {VOICE_HEIGHTS.map((h, i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: h,
              borderRadius: 99,
              background: "linear-gradient(180deg, #38bdf8 0%, #0ea5e9 100%)",
              transformOrigin: "center",
              animation: `tom-voice-bar 0.55s ease-in-out ${VOICE_DELAYS[i]}s infinite alternate`,
            }}
          />
        ))}
      </div>
    </>
  );
}

// --- VOICE TRIGGER ICON ------------------------------------------------------
// 5 bars of varying height - like a live EQ / sound level meter.
// Distinct from ChatGPT (mic circle) and Claude (horizontal ripple).

function VoiceTriggerIcon({ color }: { color: string }) {
  // bar heights as % of viewBox (20px tall)
  const bars = [6, 13, 18, 10, 15]; // px heights within 20px viewBox
  const gap  = 3;   // px gap between bars
  const w    = 3;   // px bar width
  const totalW = bars.length * w + (bars.length - 1) * gap; // 27px
  const offsetX = (20 - totalW) / 2;

  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-[18px] h-[18px]">
      {bars.map((h, i) => (
        <rect
          key={i}
          x={offsetX + i * (w + gap)}
          y={20 - h - 1}
          width={w}
          height={h}
          rx={1.5}
          fill={color}
        />
      ))}
    </svg>
  );
}

function VoiceTrigger({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      title="Voice mode"
      className="relative shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all overflow-hidden"
      style={{ background: hovered ? "#e0f2fe" : "#f1f5f9" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src="/voice-eq.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover rounded-full transition-opacity"
        style={{ opacity: hovered ? 0 : 1 }}
        draggable={false}
      />
      <img
        src="/voice-eq.gif"
        alt=""
        className="absolute inset-0 w-full h-full object-cover rounded-full transition-opacity"
        style={{ opacity: hovered ? 1 : 0 }}
        draggable={false}
      />
    </button>
  );
}

// --- PROCESSING STATE BANNER --------------------------------------------------

function ProcessingBanner({ processingState }: { processingState: ProcessingState }) {
  const [stateIndex, setStateIndex] = useState(0);
  const [dotPhase, setDotPhase] = useState(0);

  const relatedTexts = getRelatedStates(processingState);
  const allTexts = [processingState.text, ...relatedTexts];

  useEffect(() => {
    const t = setInterval(() => setStateIndex(p => (p + 1) % allTexts.length), 1600);
    return () => clearInterval(t);
  }, [allTexts.length]);

  useEffect(() => {
    const t = setInterval(() => setDotPhase(p => (p + 1) % 3), 480);
    return () => clearInterval(t);
  }, []);

  const baseText = allTexts[stateIndex].replace(/[.…]+$/, "");
  const dotStr = [".", "..", "..."][dotPhase];

  return (
    <div className="flex justify-start">
      <div className="flex items-start gap-3">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1"
          style={{ background: "linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)" }}
        >
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 11 }}>T</span>
        </div>
        <div className="pt-0.5">
          <div
            className="text-[12px] font-semibold tracking-widest uppercase mb-1"
            style={{ color: "#94a3b8" }}
          >
            {processingState.category} · {processingState.domain}
          </div>
          <div className="text-[17px] leading-snug" style={{ color: "#64748b" }}>
            {baseText}
            <span style={{ color: "#0ea5e9", fontWeight: 600 }}>{dotStr}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- INPUT BAR ----------------------------------------------------------------

function InputBar({
  inputRef,
  inputText,
  onInputChange,
  onSubmit,
  onKeyDown,
  voiceMode,
  onVoiceToggle,
  fontSize,
}: {
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  inputText: string;
  onInputChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  voiceMode: boolean;
  onVoiceToggle: () => void;
  fontSize?: number;
}) {
  return (
    <form onSubmit={onSubmit}>
      <div
        className="flex flex-col rounded-2xl px-4"
        style={{
          border: voiceMode ? "1.5px solid #0ea5e9" : "1px solid #dde3ed",
          background: "#ffffff",
          boxShadow: voiceMode ? "0 0 0 3px rgba(14,165,233,0.12), 0 2px 8px rgba(0,0,0,0.06)" : "0 2px 8px rgba(0,0,0,0.06)",
          minHeight: 114,
          paddingTop: 8,
          paddingBottom: 8,
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
      >
        {voiceMode ? (
          /* -- VOICE MODE ----------------------------------------------- */
          <>
            {/* Listening label */}
            <span className="text-[15px] text-[#0ea5e9] font-medium shrink-0 select-none">
              Listening...
            </span>

            {/* Wave - takes up remaining space, centred */}
            <div className="flex-1 flex items-center justify-center py-3">
              <VoiceWave />
            </div>

            {/* Stop button */}
            <button
              type="button"
              onClick={onVoiceToggle}
              title="Stop listening"
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all"
              style={{ background: "#dc2626", color: "#ffffff" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#b91c1c"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#dc2626"; }}
            >
              <Square className="w-4 h-4" fill="currentColor" />
            </button>
          </>
        ) : (
          /* -- TEXT MODE ------------------------------------------------ */
          <>
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="What's your focus today?"
              rows={1}
              className="flex-1 resize-none bg-transparent focus:outline-none leading-relaxed"
              style={{ color: "#0f172a", caretColor: "#0ea5e9", height: "100%", overflowY: "auto", fontSize: fontSize ?? 18 }}
            />

            <div className="mt-2 flex items-center gap-2 justify-end">
              {/* Voice trigger */}
              <VoiceTrigger onClick={onVoiceToggle} />

              {/* Send */}
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: inputText.trim() ? "#0ea5e9" : "#e2e8f0",
                  color:      inputText.trim() ? "#ffffff" : "#94a3b8",
                  cursor:     inputText.trim() ? "pointer"  : "default",
                  boxShadow:  inputText.trim() ? "0 2px 6px rgba(2,132,199,0.2)" : "none",
                }}
                onMouseEnter={e => { if (inputText.trim()) e.currentTarget.style.background = "#0284c7"; }}
                onMouseLeave={e => { if (inputText.trim()) e.currentTarget.style.background = "#0ea5e9"; }}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </form>
  );
}

// --- CHAT PANEL ---------------------------------------------------------------

export default function ChatPanel({
  messages,
  onSend,
  inputText,
  onInputChange,
  onOpenView,
  onOpenCanvas,
  onPin,
  isCanvasMode,
  isSending,
  processingState,
  greetingName,
  greetingSection,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  inputText: string;
  onInputChange: (text: string) => void;
  onOpenView: (deeplink: string) => void;
  onOpenCanvas: (canvas: { title: string; markdown: string; blocks?: RichSection[] }) => void;
  onPin: (pin: { title: string; markdown: string }) => void;
  isCanvasMode?: boolean;
  isSending?: boolean;
  processingState?: ProcessingState | null;
  greetingName?: string;
  greetingSection?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const autoStickToBottomRef = useRef(true);
  const [voiceMode, setVoiceMode] = useState(false);
  const voiceModeRef = useRef(false);       // always-current copy for async callbacks
  const isTTSSpeakingRef = useRef(false);   // true while TTS audio is playing
  const [panelWidth, setPanelWidth] = useState(360);
  const lastSpokenIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const hasMessages = messages.some(m => m.role === "user");

  // Greeting — computed client-side; refreshes when the chat clears (new thread) or section changes
  const [greeting, setGreeting] = useState<GreetingResult>({
    line1: `Good day, ${greetingName ?? "Alexander"}.`,
    line2: "Let's move things forward.",
  });
  useEffect(() => {
    if (!hasMessages) {
      setGreeting(getGreeting(greetingName ?? "Alexander", greetingSection));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMessages, greetingSection, greetingName]);
  const lastMessage = messages[messages.length - 1];
  const lastMessageSignature = lastMessage
    ? `${lastMessage.id}|${lastMessage.content}|${lastMessage.rich?.summary || ""}|${lastMessage.rich?.voice_summary || ""}`
    : "";
  const scrollTrigger = `${messages.length}:${lastMessageSignature}`;

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setPanelWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      autoStickToBottomRef.current = distanceFromBottom < 120;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    autoStickToBottomRef.current = true;
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [scrollTrigger]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const observer = new MutationObserver(() => {
      if (!autoStickToBottomRef.current) return;
      el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
    });
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [inputText]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<any>).detail;
      if (detail?.payload?.type === "open_view" && typeof detail?.payload?.deeplink === "string") {
        onOpenView(detail.payload.deeplink);
        return;
      }
      if (detail?.payload?.type === "open_canvas" && detail?.payload?.canvas) {
        onOpenCanvas({
          title: String(detail.payload.canvas.title || ""),
          markdown: String(detail.payload.canvas.markdown || ""),
          blocks: Array.isArray(detail.payload.canvas.blocks) ? detail.payload.canvas.blocks : undefined,
        });
        return;
      }
      if (detail?.payload?.type === "pin" && detail?.payload?.pin) {
        onPin({
          title: String(detail.payload.pin.title || "Pinned note"),
          markdown: String(detail.payload.pin.markdown || ""),
        });
        return;
      }
      if (detail?.payload?.deeplink && (detail?.action_type === "open" || detail?.payload?.type === "deeplink")) {
        onOpenView(String(detail.payload.deeplink));
        return;
      }
      if (detail?.action_type === "highlight") {
        const rows: number[] = Array.isArray(detail.payload?.rows) ? detail.payload.rows : [];
        const viewId: string | null = detail.payload?.view_id ?? null;
        window.dispatchEvent(new CustomEvent("tom:row_highlights", { detail: { highlights: [{ tableTitle: undefined, rows, view_id: viewId }] } }));
        return;
      }
      if (detail?.payload?.type === "clarify" && detail?.payload?.choice) {
        onInputChange(String(detail.payload.choice));
        textareaRef.current?.focus();
        return;
      }
      if (detail?.label) {
        const actionId = detail.action_id || detail.payload?.action_id;
        const confirmText = actionId ? `confirm ${actionId}` : detail.label;
        onInputChange(confirmText);
        textareaRef.current?.focus();
      } else if (typeof detail === "string") {
        onInputChange(detail);
        textareaRef.current?.focus();
      }
    };
    window.addEventListener("tom:action", handler);
    return () => window.removeEventListener("tom:action", handler);
  }, [onInputChange, onOpenView, onOpenCanvas, onPin]);

  // Keep voiceModeRef in sync so async callbacks always see the current value
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);

  // Exit voice mode if user starts typing
  useEffect(() => {
    if (inputText && voiceMode) setVoiceMode(false);
  }, [inputText, voiceMode]);

  useEffect(() => {
    if (!voiceMode) return;
    const latest = [...messages].reverse().find(m => m.role === "assistant");
    if (!latest || latest.id === lastSpokenIdRef.current) return;
    lastSpokenIdRef.current = latest.id;
    speakWithTom(latest.rich?.voice_summary || latest.content || latest.rich?.summary || "");
  }, [messages, voiceMode]);


  async function speakWithTom(text: string) {
    if (!text.trim()) return;
    // Always stop listening before speaking so the mic doesn't pick up TTS output
    isTTSSpeakingRef.current = true;
    stopListening();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    try {
      const voiceText = polishForVoice(text);
      const res = await fetch("/api/openai-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: voiceText, voice: "fable" }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("audio/mpeg")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          isTTSSpeakingRef.current = false;
          if (voiceModeRef.current) startListening();
        };
        audio.play().catch(() => { isTTSSpeakingRef.current = false; });
        return;
      }
      const data = await res.json().catch(() => null);
      if (data?.useBrowserVoice) {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(voiceText);
          utterance.rate = 0.92;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          const voices = window.speechSynthesis.getVoices();
          const preferred = voices.find(v => v.lang.startsWith("en-GB")) ||
            voices.find(v => v.lang.startsWith("en")) ||
            voices[0];
          if (preferred) utterance.voice = preferred;
          utterance.onend = () => {
            isTTSSpeakingRef.current = false;
            if (voiceModeRef.current) startListening();
          };
          window.speechSynthesis.speak(utterance);
        }
        return;
      }
    } catch {
      // no-op for demo
    }
    isTTSSpeakingRef.current = false;
  }

  function polishForVoice(input: string) {
    let out = input.trim();
    if (!out) return out;
    if (!/[.!?]$/.test(out)) out += ".";
    // Add a gentle lead-in for short responses
    if (out.length < 120) {
      out = `Alright. ${out}`;
    }
    // Soften common system phrasing for TTS only
    out = out.replace(
      /No matching data found/gi,
      "I couldn't find a matching record for that."
    );
    out = out.replace(/PTL summary:/gi, "Here's the PTL summary.");
    return out;
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSend(inputText.trim());
    onInputChange("");
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputText.trim()) { onSend(inputText.trim()); onInputChange(""); }
    }
  }

  function startListening() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-GB";
    recognition.interimResults = true;
    recognition.continuous = true;
    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let transcript = finalTranscript;
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript = (finalTranscript + " " + chunk).trim();
        }
        transcript += " " + chunk;
      }
      onInputChange(transcript.trim());
    };

    recognition.onend = () => {
      setIsListening(false);
      // If we stopped because TTS is about to play, discard partial transcript — do not send
      if (isTTSSpeakingRef.current) {
        onInputChange("");
        return;
      }
      if (finalTranscript.trim()) {
        onSend(finalTranscript.trim());
        onInputChange("");
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  function stopListening() {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
    setIsListening(false);
  }

  function toggleVoice() {
    if (!voiceMode) {
      // Entering voice mode — greeting TTS will start listening via its onended callback
      setVoiceMode(true);
      onInputChange("");
      speakWithTom("Good day. How can I help?");
    } else {
      // Exiting voice mode — stop everything
      setVoiceMode(false);
      isTTSSpeakingRef.current = false;
      stopListening();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      window.speechSynthesis?.cancel();
    }
  }

  // Responsive font size — same formula as RichResponseRenderer
  // contentRef measures the inner content div: panel width - 48px padding → 232–552px → 13–18px font
  const chatFontSize = Math.round(Math.max(13, Math.min(18, 13 + (panelWidth - 232) * (5 / 320))));

  const inputBarProps = {
    inputRef: textareaRef,
    inputText,
    onInputChange,
    onSubmit: submit,
    onKeyDown: handleKey,
    voiceMode,
    onVoiceToggle: toggleVoice,
    fontSize: chatFontSize,
  };

  // -- NO MESSAGES: centered greeting --------------------------------------
  if (!hasMessages) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center px-6" style={{ background: "#ffffff" }}>
        <div className="w-full max-w-[980px]">
          <h2 className="text-[30px] sm:text-[36px] font-semibold text-[#0f172a] mb-2 text-center tracking-tight leading-tight">
            <span className="block">{greeting.line1}</span>
            <span className="block">{greeting.line2}</span>
          </h2>
          <div style={{ height: 12 }} />
          <div className="mb-5">
            <InputBar {...inputBarProps} />
          </div>
        </div>
      </div>
    );
  }

  // -- HAS MESSAGES: input anchored to bottom ------------------------------
  return (
    <div className="h-full w-full flex flex-col" style={{ background: "#ffffff" }}>
      <div ref={scrollerRef} className="flex-1 overflow-y-auto">
        <div ref={contentRef} className="mx-auto w-full max-w-[980px] px-6 py-8 space-y-6">
          {messages.map(m => {
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={isUser ? "max-w-[70%]" : "flex-1 min-w-0"}>
                  {isUser ? (
                    <div
                      className="rounded-2xl px-5 py-3 leading-relaxed"
                      style={{ background: "#bae6fd", color: "#0f172a", fontSize: chatFontSize }}
                    >
                      {m.content}
                    </div>
                  ) : (
                    <div className="leading-relaxed text-[#0f172a] pt-1">
                      {m.rich ? (
                        <RichResponseRenderer
                          response={m.rich}
                          debugRoutingPath={m.debug_routing_path}
                          traceRoutingPath={m.trace_routing_path}
                          isCanvasMode={isCanvasMode}
                        />
                      ) : (
                        <ReactMarkdown components={mdComponents}>{m.content}</ReactMarkdown>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {isSending && processingState && (
            <ProcessingBanner processingState={processingState} />
          )}
        </div>
      </div>

      {/* Input pinned to bottom */}
      <div className="px-6 pb-6 pt-3 shrink-0" style={{ background: "#ffffff" }}>
        <div className="mx-auto w-full max-w-[980px]">
          <InputBar {...inputBarProps} />
        </div>
      </div>
    </div>
  );
}
