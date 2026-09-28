"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Mic, Square } from "lucide-react";
import type { FormField } from "@/lib/types";
import { Input, MultiSelect, Select, Textarea } from "@/components/ui";

// Minimal shape of the Web Speech API's SpeechRecognition — not in lib.dom yet.
type SpeechRecognitionResultLike = { 0: { transcript: string } };
type SpeechRecognitionEventLike = { results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Support never changes after load, so this never needs to notify a subscriber —
// it exists only to read a browser-only global safely across server/client
// render without the setState-in-effect anti-pattern (see react.dev docs on
// useSyncExternalStore for "subscribing to a browser API not present on the server").
function subscribeNever() {
  return () => {};
}
function getSupportedSnapshot() {
  return getSpeechRecognitionCtor() !== null;
}
function getSupportedServerSnapshot() {
  return false;
}

/**
 * Dictation button for free-text fields, using the browser's built-in Web
 * Speech API — no server call, no dependency. Renders nothing where
 * unsupported (notably Firefox) rather than showing a broken control.
 */
function VoiceInputButton({ onResult }: { onResult: (text: string) => void }) {
  const supported = useSyncExternalStore(subscribeNever, getSupportedSnapshot, getSupportedServerSnapshot);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  function toggle() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(" ")
        .trim();
      if (transcript) onResult(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={listening ? "Stop dictating" : "Dictate with your voice"}
      title={listening ? "Stop dictating" : "Dictate with your voice"}
      className={`absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full transition ${
        listening ? "animate-pulse bg-coral text-white" : "bg-charcoal/10 text-charcoal/60 hover:bg-charcoal/20"
      }`}
    >
      {listening ? <Square className="h-3 w-3" /> : <Mic className="h-3.5 w-3.5" />}
    </button>
  );
}

/**
 * Renders the right control for a field's data type, shared by every place a
 * record's fields are filled in or edited (new record, item edit, Form
 * Views). Doesn't handle `file` fields — those go through FileUploadField,
 * which needs a project id and upload wiring this component doesn't have.
 */
export function FieldValueInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
}) {
  function appendDictated(text: string) {
    const current = value.trim();
    onChange(current ? `${current} ${text}` : text);
  }

  if (field.data_type === "long_text") {
    return (
      <div className="relative">
        <Textarea
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Describe ${field.name.toLowerCase()}…`}
          className="pr-10"
        />
        <VoiceInputButton onResult={appendDictated} />
      </div>
    );
  }

  if (field.data_type === "single_select" && field.options) {
    return (
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— select —</option>
        {field.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Select>
    );
  }

  if (field.data_type === "multi_select" && field.options) {
    const selected = value ? value.split(",").map((v) => v.trim()).filter(Boolean) : [];
    return (
      <MultiSelect
        label={selected.length ? selected.join(", ") : "— select —"}
        options={field.options.map((o) => ({ value: o, label: o }))}
        value={selected}
        onChange={(next) => onChange(next.join(", "))}
      />
    );
  }

  if (field.data_type === "text") {
    return (
      <div className="relative">
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="pr-10" />
        <VoiceInputButton onResult={appendDictated} />
      </div>
    );
  }

  return (
    <Input
      type={field.data_type === "date" ? "date" : field.data_type === "number" ? "number" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={
        field.data_type === "tags" ? "comma, separated, tags" : field.data_type === "url" ? "https://…" : undefined
      }
    />
  );
}
