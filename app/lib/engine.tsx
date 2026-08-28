"use client";

import { Fragment, type ChangeEvent, FormEvent, type ReactNode, type KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import Petal from "../petal";
import { isValidPayload, normaliseIssues, encodeTransfer, decodeTransfer, backupFileName, mergeTransferData } from "../backup";
import type { Status, Profile, Issue, Mood, DiaryEntry, DiaryAction, DiaryEvent, DiaryVault, DailyCheckIn, TransferPayload } from "../backup";

export const startOfWeek = (value: Date) => { const at = new Date(value.getFullYear(), value.getMonth(), value.getDate()); at.setDate(at.getDate() - ((at.getDay() + 6) % 7)); return at; };
export const addDays = (value: Date, days: number) => { const at = new Date(value); at.setDate(at.getDate() + days); return at; };
export const toDateTimeInput = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}T${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
// A completed issue's timestamp: the explicit stamp if there is one, else its last update.
export const completedAtOf = (issue: Issue) => issue.completedAt || issue.updates[issue.updates.length - 1]?.at || issue.createdAt;
export const weekLabel = (start: Date) => `${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(start)} – ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(addDays(start, 6))}`;
export type StatusDraft = { id: string; name: string; color: string; original?: string; kind?: "new" | "ongoing" | "terminal" };
export type MetricFocus = "home-total" | "home-open" | "home-overdue" | "home-resolved" | "mine-open" | "mine-overdue" | "mine-resolved" | "mine-total" | "attention-overdue" | "attention-oldest" | "attention-owners" | "attention-first";
export type FocusRecommendation = { issue: Issue; kind: "overdue" | "missing-eta" | "missing-action"; priority: number; reason: string; move: string };
export type InsightRange = "7" | "30" | "90" | "all";
export type InsightSection = "work" | "memory" | "rhythm";
export type InsightDrilldown = "completed" | "on-time" | "cycle" | "overdue" | "";

// Tip up, base just past the bloom centre at (112, 52); rotating it sweeps the flower.
export const GARDEN_PETAL = "M112 8C127.5 21.2 129.7 43.2 112 58C94.3 43.2 96.5 21.2 112 8Z";

export function SignalGarden({ stage, label, compact = false }: { stage: number; label: string; compact?: boolean }) {
  const safeStage = Math.max(0, Math.min(4, stage));
  return <div className={`signal-garden stage-${safeStage} ${compact ? "is-compact" : ""}`} role="img" aria-label={label}>
    <svg className="garden-svg" viewBox="0 0 220 140" aria-hidden="true">
      <defs><linearGradient id="garden-petal" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ef79aa"/><stop offset="1" stopColor="#bf4f87"/></linearGradient><linearGradient id="garden-leaf" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#83b779"/><stop offset="1" stopColor="#477652"/></linearGradient><radialGradient id="garden-glow"><stop stopColor="#f4b7d2" stopOpacity=".5"/><stop offset="1" stopColor="#f4b7d2" stopOpacity="0"/></radialGradient></defs>
      <circle className="svg-garden-glow" cx="113" cy="48" r="52" fill="url(#garden-glow)"/>
      <ellipse className="svg-garden-soil" cx="112" cy="123" rx="76" ry="12" fill="#c99572"/><ellipse className="svg-garden-seed" cx="112" cy="119" rx="8" ry="4" fill="#8d6049"/>
      <path className="svg-garden-stem" d="M112 119 C110 94 116 72 112 57" fill="none" stroke="#52835b" strokeWidth="7" strokeLinecap="round"/>
      <path className="svg-garden-leaf leaf-left" d="M109 94 C83 95 72 82 70 68 C91 69 105 76 111 91Z" fill="url(#garden-leaf)"/>
      <path className="svg-garden-leaf leaf-right" d="M114 84 C133 82 145 71 149 57 C130 58 118 66 113 80Z" fill="url(#garden-leaf)"/>
      {/* One petal rotated five times, rather than five petals placed by hand. The hand-placed
          set had tips at 0/82/147/213/278° — gaps of 82,65,66,65,82 where they should all be
          72 — and reaches from 44.8 to 48.2, so the bloom sat lopsided with the lower petals
          crowded. Generating it guarantees both. The silhouette is the app mark's petal at
          78% width: wide enough to stay friendly, narrow enough that five of them meet
          without merging into one mass. */}
      <g className="svg-garden-bloom">
        <path className="svg-petal petal-top" d={GARDEN_PETAL} fill="url(#garden-petal)"/>
        <g transform="rotate(72 112 52)"><path className="svg-petal petal-right" d={GARDEN_PETAL} fill="url(#garden-petal)"/></g>
        <g transform="rotate(144 112 52)"><path className="svg-petal petal-lower-right" d={GARDEN_PETAL} fill="url(#garden-petal)"/></g>
        <g transform="rotate(216 112 52)"><path className="svg-petal petal-lower-left" d={GARDEN_PETAL} fill="url(#garden-petal)"/></g>
        <g transform="rotate(288 112 52)"><path className="svg-petal petal-left" d={GARDEN_PETAL} fill="url(#garden-petal)"/></g>
        <circle className="svg-garden-heart" cx="112" cy="52" r="13" fill="#f4c95d"/><circle className="svg-garden-heart-light" cx="108.5" cy="48.5" r="3.2" fill="#fff" opacity=".5"/>
      </g>
      <g className="svg-garden-sparks" fill="#d65f98"><path d="M48 38c2 8 6 12 14 14-8 2-12 6-14 14-2-8-6-12-14-14 8-2 12-6 14-14Z"/><circle cx="171" cy="39" r="4"/><circle cx="179" cy="53" r="2.5"/></g>
    </svg>
  </div>;
}

export const defaultStatuses: Status[] = ["New", "Ongoing", "Waiting on dev", "Investigating", "Blocked", "Pending Monitoring", "Awaiting approval", "Resolved"];
export const defaultStatusColors: Record<string, string> = {
  New: "#715391", Ongoing: "#647a3e", "Waiting on dev": "#9b6519", Investigating: "#a03e74",
  Blocked: "#bd415e", "Pending Monitoring": "#407d78", "Awaiting approval": "#41658e", Resolved: "#4f7b54", Closed: "#4f7b54",
};
/* The greeting used to say "Good afternoon" at every hour, to the writer's ROLE
   rather than their name. It is the first line of every session — it should at
   least be true. */
/* A year in pixels: one square per day, coloured by that day's mood. The classic
   journalling keepsake, and the only view that shows a whole year at once. Days
   with more than one page take the last mood written that day. */
export const yearGrid = (entries: DiaryEntry[], year: number) => {
  const byDay = new Map<string, DiaryEntry>();
  entries.forEach(entry => {
    const at = new Date(entry.at);
    if (at.getFullYear() !== year) return;
    const key = dayKey(entry.at);
    const held = byDay.get(key);
    if (!held || new Date(entry.at).getTime() > new Date(held.at).getTime()) byDay.set(key, entry);
  });
  const today = dayKey(new Date().toISOString());
  return Array.from({ length: 12 }, (_, month) => ({
    month,
    label: new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(year, month, 1)),
    days: Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, index) => {
      const day = index + 1;
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return { day, key, entry: byDay.get(key), isToday: key === today, isFuture: key > today };
    }),
  }));
};
export const greetingFor = (hour: number, name: string) => {
  const who = name || "there";
  if (hour < 0) return `Hello, ${who}`;
  if (hour < 5) return `Still up, ${who}`;
  if (hour < 12) return `Good morning, ${who}`;
  if (hour < 17) return `Good afternoon, ${who}`;
  if (hour < 22) return `Good evening, ${who}`;
  return `Winding down, ${who}`;
};
export const themes = [
  ["rose", "Rose quartz"], ["lilac", "Lilac haze"], ["peach", "Peach fizz"], ["blush", "Blush bloom"], ["berry", "Berry luxe"],
  ["ocean", "Ocean slate"], ["forest", "Forest moss"], ["navy", "Midnight navy"], ["sand", "Desert sand"], ["graphite", "Graphite"],
] as const;
/* Diary paper faces. System stacks only — a local-first app should not wait on a font
   server to render your own writing, and every stack degrades to a sane default. */
export const diaryFonts = [
  ["journal", "Journal sans", "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"],
  ["serif", "Classic serif", "\"Iowan Old Style\", \"Palatino Linotype\", Palatino, \"Book Antiqua\", Georgia, ui-serif, serif"],
  ["typewriter", "Typewriter", "\"American Typewriter\", \"Courier New\", ui-monospace, monospace"],
  ["hand", "Handwritten", "\"Bradley Hand\", \"Segoe Print\", \"Segoe Script\", \"Apple Chancery\", \"Comic Sans MS\", cursive"],
  ["rounded", "Rounded", "ui-rounded, \"SF Pro Rounded\", \"Varela Round\", \"Trebuchet MS\", system-ui, sans-serif"],
] as const;
export const diaryPapers = [["cream", "Cream"], ["ivory", "Ivory"], ["blush", "Blush"], ["mint", "Mint"], ["sky", "Sky"], ["lilac", "Lilac"], ["sand", "Sand"], ["slate", "Slate"]] as const;
export const moods: { value: Mood; label: string; symbol: string }[] = [
  { value: "bright", label: "Bright", symbol: "☀" }, { value: "calm", label: "Calm", symbol: "◡" },
  { value: "okay", label: "Okay", symbol: "•" }, { value: "low", label: "Low", symbol: "☁" },
  { value: "anxious", label: "Anxious", symbol: "≈" }, { value: "frustrated", label: "Frustrated", symbol: "△" },
];
export const seed: Issue[] = [
  { id: "seed-1", title: "Checkout API latency spike", details: "p95 latency increased after the morning deploy. Watching the payments dependency.", owner: "Maya Chen", action: "Comparing traces and rolling back the feature flag if confirmed.", expected: "2026-08-13T16:30", createdAt: "2026-08-13T11:10", status: "Investigating", outcome: "", followUpPeople: [], updates: [{ id: "u1", at: "2026-08-13T11:10", author: "You", text: "Opened incident bridge and shared dashboard links." }, { id: "u2", at: "2026-08-13T12:05", author: "Maya Chen", text: "Trace points to a connection-pool regression; testing a flag rollback." }] },
  { id: "seed-2", title: "Kafka consumer lag", details: "Lag is building in the customer-events consumer group.", owner: "Jordan Lee", action: "Increasing partition concurrency and checking dead-letter volume.", expected: "2026-08-13T14:00", createdAt: "2026-08-13T09:25", status: "Waiting on dev", outcome: "", followUpPeople: [], updates: [{ id: "u3", at: "2026-08-13T09:25", author: "You", text: "Captured consumer metrics and assigned follow-up." }] },
  { id: "seed-3", title: "Certificate renewal runbook", details: "Document and validate the renewal sequence before the next rotation.", owner: "You", action: "Drafting the runbook and scheduling a staging dry run.", expected: "2026-08-15T15:00", createdAt: "2026-08-12T15:40", status: "Pending Monitoring", outcome: "", followUpPeople: [], updates: [{ id: "u4", at: "2026-08-12T15:40", author: "You", text: "Added expiry monitoring to the weekly review." }] },
];

export const statusClass = (status: Status) => `status ${status.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
export const isCompleteStatus = (status: Status) => status === "Resolved" || status === "Closed";
/* ---------------------------------------------------------------------------
   Optional diary lock. AES-GCM with a key derived from the passphrase by PBKDF2.
   The key is never written anywhere — it lives in memory for the session only —
   so there is deliberately no recovery path if the passphrase is lost.
--------------------------------------------------------------------------- */
export const LOCK_ITERATIONS = 250000;
export const toB64 = (bytes: Uint8Array) => { let binary = ""; bytes.forEach(byte => { binary += String.fromCharCode(byte); }); return btoa(binary); };
export const fromB64 = (value: string) => Uint8Array.from(atob(value), character => character.charCodeAt(0));
export const deriveDiaryKey = async (passphrase: string, salt: Uint8Array) => {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt as unknown as BufferSource, iterations: LOCK_ITERATIONS, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
};
export const sealDiary = async (key: CryptoKey, salt: string, entries: DiaryEntry[], log: DiaryEvent[]): Promise<DiaryVault> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as unknown as BufferSource }, key, new TextEncoder().encode(JSON.stringify({ entries, log })) as unknown as BufferSource);
  return { salt, iv: toB64(iv), data: toB64(new Uint8Array(sealed)) };
};
export const openDiaryVault = async (key: CryptoKey, vault: DiaryVault) => {
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(vault.iv) as unknown as BufferSource }, key, fromB64(vault.data) as unknown as BufferSource);
  const payload = JSON.parse(new TextDecoder().decode(plain)) as { entries: DiaryEntry[]; log: DiaryEvent[] };
  return { entries: Array.isArray(payload.entries) ? payload.entries : [], log: Array.isArray(payload.log) ? payload.log : [] };
};
export const readStoredVault = (): DiaryVault | null => {
  const raw = localStorage.getItem("signal-petal-diary-vault");
  if (!raw) return null;
  try { const parsed = JSON.parse(raw) as DiaryVault; return parsed?.salt && parsed?.iv && parsed?.data ? parsed : null; } catch { return null; }
};
export const saveBackupFile = (payload: TransferPayload) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = backupFileName();
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking immediately can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
};
export const daysSince = (value: string) => Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
export const dateLabel = (value: string) => value ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "No ETA";
export const isOverdue = (issue: Issue) => !isCompleteStatus(issue.status) && issue.expected && new Date(issue.expected).getTime() < Date.now();
export const daysOverdue = (issue: Issue) => Math.max(1, Math.ceil((Date.now() - new Date(issue.expected).getTime()) / 86400000));
/* Local, not UTC: the calendar builds its cell keys from local date parts, so keying
   entries in UTC put evening work on the following day for anyone west of Greenwich. */
export const dayKey = (value: string) => { const at = new Date(value); return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`; };
export const dayBefore = (key: string) => { const [year, month, day] = key.split("-").map(Number); const at = new Date(year, month - 1, day - 1); return dayKey(at.toISOString()); };
/* Names are stored the way they should read. Owners and follow-up people are matched
   case-insensitively but rendered verbatim, so "maya chen" typed in a hurry sat beside
   "Maya Chen" in the owner report looking like a second person. Capitalising at the
   start and after a space, hyphen or apostrophe keeps O'Brien and Ana-Maria intact, and
   never changes the string's length — which is what lets the caret stay where it was
   while someone is still typing. */
export const titleCaseName = (value: string) => value.replace(/(^|[\s(/,;&'\u2019-])(\p{L})/gu, (_match, lead: string, letter: string) => lead + letter.toLocaleUpperCase());
export const peopleFromInput = (value: string) => Array.from(new Map(value.split(/[,;\n]+/).map(person => titleCaseName(person.trim())).filter(Boolean).map(person => [person.toLowerCase(), person])).values());
// Whole units only. "4 hours" is a fact; "0.17 days" is a spreadsheet talking.
export const spanLabel = (from: string, to: string) => {
  const minutes = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
};
/* ---------------------------------------------------------------------------
   Diary reflection engine.

   Everything here runs on the device — no entry ever leaves the browser. The
   engine reads one reflection in context (the words, the mood chosen, the hour
   it was written, and the entries before it) and answers in three beats:
   what it heard, what that combination suggests, and one step sized to the
   state the writer is actually in.
--------------------------------------------------------------------------- */

export const heavyMoods: Mood[] = ["low", "anxious", "frustrated"];
export const moodLabel = (mood: Mood) => (moods.find(item => item.value === mood)?.label ?? "okay").toLowerCase();
export const tidy = (value: string) => value.replace(/\s+/g, " ").trim().replace(/^[.,;:!?\-–—\s]+/, "").replace(/[.,;:\s]+$/, "");
export const clip = (value: string, limit = 96) => (value.length > limit ? `${value.slice(0, limit - 1).replace(/\s+\S*$/, "")}…` : value);
export const safeMemoryPreview = (value: string) => clip(value
  .replace(/https?:\/\/\S+/gi, "[link]")
  .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[technical detail]")
  .replace(/\s+/g, " ")
  .trim(), 170);
// Quoted fragments end in "…" when clipped, so a trailing full stop would read as an ellipsis of four.
export const quote = (value: string) => `“${value}${/[.…?!]$/.test(value) ? "" : "."}”`;
// Deterministic so an entry always renders the same reflection, while different entries vary.
export const pickFrom = <T,>(options: T[], seed: string) => options[Math.abs(Array.from(seed).reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) | 0, 7)) % options.length];

/* The work side of the app had no voice: every header and empty state was fixed text,
   while the diary rotated prompts and reflections. This is one line under the title that
   reads the queue and says something about it. Seeded on the date so it holds still for
   the whole day instead of reshuffling on every render. */
export const deskLines = {
  clear: ["Nothing overdue, nothing unowned. Rare — enjoy it.", "Empty queue. Whatever you did last week, do that again.", "All quiet. This is what the good days look like."],
  shipping: ["{n} closed today. That is the part nobody logs and everybody feels.", "{n} off the list today — the queue is shorter because of you.", "{n} done today. Worth noticing before you open the next one."],
  pressure: ["{n} past their expected update. Start at the top; the rest gets easier.", "{n} overdue — not a crisis, just the order to work in.", "{n} waiting longer than you promised. One at a time."],
  steady: ["{n} open and every one of them on time.", "{n} in flight, nothing late. Keep it boring.", "{n} open, all on schedule. Steady is a result."],
} as const;
export const deskLine = (open: number, overdue: number, closedToday: number, seed: string) => {
  const [bucket, count] = overdue ? ["pressure", overdue] as const
    : closedToday ? ["shipping", closedToday] as const
    : open ? ["steady", open] as const
    : ["clear", 0] as const;
  return pickFrom([...deskLines[bucket]], `${seed}-${bucket}`).replace("{n}", String(count));
};

export const crisisPattern = /\b(kill (?:myself|me)|end (?:my life|it all)|take my own life|suicid\w*|hurt myself|harm myself|self[- ]harm|want to die|better off (?:dead|without me)|no reason to (?:live|go on)|don'?t want to wake up)\b/i;
// A negator immediately before a phrase flips its meaning: "I'm not exhausted" is not exhaustion.
export const negatorPattern = /\b(?:not|no longer|never|hardly|barely|isn'?t|wasn'?t|aren'?t|weren'?t|don'?t|doesn'?t|didn'?t)\s+(?:\w+\s+){0,2}$/i;

export type ThemeId = "exhaustion" | "progress" | "blocked" | "overload" | "conflict" | "uncertainty" | "selfBlame" | "gratitude" | "loneliness" | "rumination" | "bodyCare" | "hope" | "relief";
export const themeLexicon: { id: ThemeId; label: string; pattern: RegExp }[] = [
  { id: "exhaustion", label: "running on empty", pattern: /\b(exhaust\w*|drain\w*|burn(?:t|ed) out|burnout|no energy|running on empty|no sleep|couldn'?t sleep|didn'?t sleep|wiped out|worn out|so tired|too tired|shattered)\b/gi },
  { id: "progress", label: "real movement", pattern: /\b(finished|shipped|resolved|fixed|solved|cracked|delivered|completed|sorted|went well|worked out|breakthrough|proud|milestone|got it (?:done|working))\b/gi },
  { id: "blocked", label: "a handoff that has stalled", pattern: /\b(waiting|blocked|no (?:response|reply|answer|update)|still (?:hasn'?t|haven'?t)|chasing|follow(?:ing)?[ -]?up|approval|sign[ -]?off|depend\w*|handoff|stuck|ignored|radio silence)\b/gi },
  { id: "overload", label: "more demand than capacity", pattern: /\b(too much|overwhelm\w*|backlog|deadline\w*|swamped|slammed|back[ -]to[ -]back|no time|juggl\w*|spread thin|piling up|everything at once|pressure|workload|firefighting)\b/gi },
  { id: "conflict", label: "friction with another person", pattern: /\b(argu\w*|snapped(?: at)?|shouted|disagree\w*|tension|push ?back|conflict|rude|dismissive|undermin\w*|disrespect\w*|talked over|blamed me|called me out|had a go at|criticis\w*|criticiz\w*|careless|in front of (?:everyone|the team|others|the whole)|made me look|passive[ -]aggressive|annoyed|angry|furious|frustrat\w*|want to say something to)\b/gi },
  { id: "uncertainty", label: "an open question you cannot close yet", pattern: /\b(not sure|unsure|unclear|what if|uncertain\w*|don'?t know (?:if|whether|what)|waiting to hear|up in the air|no idea|worried|worry\w*|anxious|anxiety|nervous|scared|afraid|dread\w*)\b/gi },
  { id: "selfBlame", label: "a verdict you passed on yourself", pattern: /\b(my fault|i should(?:'?ve| have)|i shouldn'?t have|stupid|idiot|messed (?:it )?up|screwed up|let (?:everyone|them|him|her|myself) down|not good enough|failed|failure|embarrass\w*|ashamed|guilt\w*|regret)\b/gi },
  { id: "gratitude", label: "something that held you up", pattern: /\b(grateful|thankful|appreciate\w*|lucky|supported|helped me|had my back|checked in on me|generous|kind of (?:him|her|them))\b/gi },
  { id: "loneliness", label: "distance from other people", pattern: /\b(lonely|alone|isolat\w*|no ?one|nobody|by myself|disconnect\w*|left out|invisible|miss (?:him|her|them|talking|having))\b/gi },
  { id: "rumination", label: "a thought running on a loop", pattern: /\b(can(?:'?t| ?not) stop thinking|keep thinking|replay\w*|(?:keeps?|kept) going over|going over (?:it|and over)|in my head|overthink\w*|spiral\w*|ruminat\w*|second[- ]guess\w*|kept me (?:up|awake))\b/gi },
  { id: "bodyCare", label: "your body last in the queue", pattern: /\b(skipped (?:lunch|breakfast|dinner|meals?)|haven'?t eaten|forgot to eat|no break|worked through|headache|migraine|didn'?t stop|no lunch)\b/gi },
  { id: "hope", label: "something opening up", pattern: /\b(looking forward|excited|can'?t wait|hopeful|new (?:role|start|project|chapter|job)|opportunit\w*|fresh start)\b/gi },
  { id: "relief", label: "a weight lifting", pattern: /\b(relieved|relief|weight off|finally over|behind me|calmer|settled|breathed)\b/gi },
];

export const detectThemes = (note: string) => themeLexicon
  .map(theme => {
    const hits = Array.from(note.matchAll(theme.pattern))
      .filter(match => !negatorPattern.test(note.slice(Math.max(0, (match.index ?? 0) - 26), match.index ?? 0)));
    return { id: theme.id, label: theme.label, score: hits.length };
  })
  .filter(theme => theme.score > 0)
  .sort((a, b) => b.score - a.score);

export const intensityOf = (raw: string) => {
  const boosters = (raw.match(/\b(really|so|very|extremely|completely|totally|absolutely|utterly|again|still|constantly|every ?(?:day|time)|all (?:day|week|night))\b/gi) || []).length;
  const shouts = (raw.match(/\b[A-Z]{3,}\b/g) || []).length + (raw.match(/!/g) || []).length;
  const words = raw.trim().split(/\s+/).length;
  return Math.min(1, boosters * 0.16 + shouts * 0.12 + (words > 120 ? 0.25 : words > 55 ? 0.14 : 0));
};

/* The clause on one side of a contrast word is usually where the real point is hiding —
   but which side depends on the word. After "but" or "however" comes the point; before
   "although" or "even though" comes the point, and after it comes the concession. Either
   way the quote stops at the sentence end so it does not run into the next thought. */
export const pivotClause = (text: string) => {
  const forward = text.match(/\b(?:but|however|even so|yet)\b([^.!?\n]{12,})/i);
  if (forward) return clip(tidy(forward[1]));
  const backward = text.match(/([^.!?\n]{12,})\b(?:although|even though|though)\b/i);
  if (backward) return clip(tidy(backward[1]).replace(/[\s,]*\b(?:even|and|but|so)\s*$/i, ""));
  return "";
};
export const statedNeed = (text: string) => clip(tidy((text.match(/\bi (?:just )?(?:need|want|wish|have to|keep meaning to|would love)\b[^.!?\n]{4,110}/i) || [""])[0]));
export const openQuestion = (text: string) => clip(tidy((text.match(/[^.!?\n]{10,110}\?/) || [""])[0]));
export const strongestClause = (text: string) => clip(tidy(text.split(/[.!?\n]+/).map(tidy).filter(part => part.split(" ").length >= 4).sort((a, b) => b.length - a.length)[0] || tidy(text)));
export const peopleMentioned = (text: string) => Array.from(new Set([
  ...Array.from(text.matchAll(/\bmy (manager|lead|boss|teammate|colleague|team|partner|client|director|mentor|friend|mum|mom|dad|sister|brother|husband|wife)\b/gi)).map(match => `my ${match[1].toLowerCase()}`),
  ...Array.from(text.matchAll(/\b([A-Z][a-z]{2,})\s+(?:said|asked|told|replied|refused|agreed|pushed|apologi|ignored|promised)/g)).map(match => match[1]),
])).slice(0, 2);
export const hasTimePressure = (text: string) => /\b(today|tonight|tomorrow|by (?:mon|tue|wed|thu|fri|sat|sun)\w*|end of (?:the )?(?:day|week)|eod|this week|deadline|due|overdue|late)\b/i.test(text);
/* Only all-or-nothing phrasing aimed at a pattern, not the ordinary literal uses. "In
   front of everyone" is a fact; "I always do this" is a verdict, and only the second one
   is worth gently questioning. */
export const absoluteWord = (text: string) => tidy((text.match(/\b(?:i (?:always|never)|(?:always|never) (?:works|happens|goes|ends?|get|gets|do|does)|every time i|no ?one ever|everyone else)\b/i) || [""])[0]);

export const themeInsight: Record<ThemeId, string[]> = {
  exhaustion: ["Tiredness that gets written down is usually past the point where rest fixes it on its own — it needs something removed from the list, not just a good night.", "This reads less like a bad night and more like a deficit that has been building. Deficits do not clear themselves; something has to come off the list."],
  progress: ["Wins are easy to bank and forget. The useful part is not that it worked — it is knowing exactly which decision made it work.", "This is worth more than a good feeling: a repeatable move is hiding in here, and it is only repeatable if you name it while it is fresh."],
  blocked: ["Waiting quietly costs you twice: the work does not move, and you carry it anyway. Most stalls survive because nobody made the ask specific.", "The thing holding this up is a person or a decision, not a difficulty. That kind of block responds to one clear sentence far more than to patience."],
  overload: ["When everything is urgent, the real risk is not missing something — it is spending your best hours on whichever thing shouted loudest.", "Competing demands do not resolve by working faster. They resolve by someone deciding what does not get done, and that someone can be you."],
  conflict: ["Friction remembered this vividly is usually still unresolved in your head, which means you will keep replaying their words instead of choosing yours.", "There are two things tangled here: what actually happened, and what it seemed to mean about you. They are worth separating before you respond."],
  uncertainty: ["Uncertainty expands to fill whatever space you give it. It shrinks when you draw a line between what you can influence and what you can only wait on.", "Your mind is trying to solve a question it does not yet have the information for — which is why it keeps circling without landing."],
  selfBlame: ["You have written a verdict, not an account. Verdicts do not teach you anything; accounts do.", "Notice how much of this is aimed at you rather than at what happened. Almost every situation has a share that was never yours to carry."],
  gratitude: ["Support noticed is support you can go back to. Most people never tell the person, and the connection quietly thins.", "This is the kind of detail worth keeping. Knowing precisely what helped tells you what to ask for next time."],
  loneliness: ["Distance like this tends to be self-sealing: the further out you feel, the harder it gets to reach, and the further out you feel.", "Feeling unseen rarely means nobody would come. It usually means nobody has been told."],
  rumination: ["A thought on a loop is not analysis, even though it feels like it. It is the same input running again because it never got an output.", "Replaying it has already given you whatever information it holds. Past that point it is just cost."],
  bodyCare: ["You are treating your own maintenance as the flexible part of the day. It is the part everything else runs on.", "Skipping the basics buys an hour and costs the afternoon — and it is usually the first thing to go on exactly the days it matters most."],
  hope: ["Anticipation is fuel, but it fades quietly if nothing is put in the calendar. Make it concrete while you still feel it.", "This is a real signal about what you want more of. Worth acting on before the week absorbs it."],
  relief: ["Relief is worth pausing on rather than immediately filling. The space you just made will be taken by default if you do not claim it.", "Something ended well. Notice what that lightness tells you about what was actually weighing the most."],
};
export const themeStep: Record<ThemeId, string[]> = {
  exhaustion: ["Pick one commitment in the next two days and cancel, delay, or hand it over — then protect a specific rest window tonight and treat it like a meeting.", "Choose the single least consequential thing on tomorrow and drop it. Then decide now what time you stop tonight."],
  progress: ["Write the one decision that made this work, in a sentence, and add it where you will see it next time something similar starts.", "Name the exact move that unlocked it and pick one place this week to use it again."],
  blocked: ["Draft the follow-up now, in one sentence: what you need, from whom, by when. Send it before you close this.", "Write down the person and the single decision you are waiting on, then send the shortest possible ask with a date in it."],
  overload: ["List everything, circle the one item with the largest consequence if it slips, and give it your next focused block. Let the rest wait visibly rather than silently.", "Choose the three that actually matter, put the rest on a named “not this week” list, and tell one person what you have dropped."],
  conflict: ["Before replying, write three lines: what happened, what you felt, what outcome you want. Then let only the third one shape your next sentence.", "Decide the outcome you want from this person, then write one sentence that serves it. Say the rest to your notebook, not to them."],
  uncertainty: ["Make two short lists — what you can influence today, what you cannot — and take one ten-minute action from the first.", "Write the specific question you are actually waiting on an answer to, then decide who or what could answer it and when you will check."],
  selfBlame: ["Rewrite this as an account: what happened, what was outside your control, and the one thing you would change. Stop before adding a judgement.", "Name one part of this that was genuinely someone else's or nobody's, and one adjustment that is yours. Keep only the second."],
  gratitude: ["Tell them. One message, today, naming the specific thing they did — it takes a minute and it holds the thread open.", "Write down what exactly helped, then plan one way to invite more of it this week."],
  loneliness: ["Pick one safe person and send something small and honest — not an explanation, just an opening. A question is easier for them to answer than an update.", "Choose one person and put a real time in the calendar with them this week, however short."],
  rumination: ["Give it a container: ten minutes, on paper, then stop. Anything still circling after that goes on tomorrow's list, not tonight's.", "Write the loop out in full once, then write what you would need in order to close it. Do the smallest part of that."],
  bodyCare: ["Before anything else: water, food, and ten minutes away from the screen. Put the next break in the calendar so it survives a busy afternoon.", "Eat something properly and step outside briefly. Then block one real break into tomorrow before the day fills up."],
  hope: ["Put one concrete step in the calendar this week while the energy is here — a date makes it real.", "Take the first small action toward it today, even a five-minute one, so it is no longer only an idea."],
  relief: ["Claim some of the space you just made: choose one restorative thing and do it before the gap fills itself.", "Note what has just come off your plate, and decide deliberately what does — and does not — take its place."],
};
export const gentleStep = "Keep it small: water, food, daylight, or one honest message to someone you trust. Small is the right size today.";

export const moodName = (mood: Mood) => moods.find(item => item.value === mood)?.label ?? "Okay";
export const wordCount = (value: string) => (value.trim() ? value.trim().split(/\s+/).length : 0);
// A log line is only useful if it says what actually changed, not merely that something did.
export const describeDiaryChange = (before: DiaryEntry, after: { title: string; text: string; mood: Mood; issueIds: string[] }) => {
  const parts: string[] = [];
  if (before.mood !== after.mood) parts.push(`mood ${moodName(before.mood).toLowerCase()} → ${moodName(after.mood).toLowerCase()}`);
  if (before.title.trim() !== after.title.trim()) parts.push(!before.title.trim() ? "title added" : !after.title.trim() ? "title removed" : "title changed");
  const beforeLinks = (before.issueIds ?? []).length;
  const afterLinks = after.issueIds.length;
  if (beforeLinks !== afterLinks) parts.push(afterLinks > beforeLinks ? `linked to ${afterLinks - beforeLinks} more task${afterLinks - beforeLinks === 1 ? "" : "s"}` : `unlinked ${beforeLinks - afterLinks} task${beforeLinks - afterLinks === 1 ? "" : "s"}`);
  if (before.text.trim() !== after.text.trim()) {
    const delta = wordCount(after.text) - wordCount(before.text);
    parts.push(delta > 0 ? `${delta} word${delta === 1 ? "" : "s"} added` : delta < 0 ? `${-delta} word${delta === -1 ? "" : "s"} removed` : "wording reworked");
  }
  return parts.length ? parts.join(" · ") : "opened and saved without changes";
};
export const diaryEventLabel = (action: DiaryAction) => (action === "created" ? "Written" : action === "edited" ? "Edited" : "Deleted");


/* ---------------------------------------------------------------------------
   Diary insights. Every number here is derived on the device from entries the
   writer already has — nothing is inferred about them beyond what they wrote.
--------------------------------------------------------------------------- */
export const moodWeight: Record<Mood, number> = { bright: 2, calm: 1, okay: 0, low: -1, anxious: -1, frustrated: -1 };
export const partsOfDay = [
  { id: "early", label: "Early", note: "before noon", from: 5, to: 11 },
  { id: "afternoon", label: "Afternoon", note: "midday to five", from: 12, to: 16 },
  { id: "evening", label: "Evening", note: "after work", from: 17, to: 21 },
  { id: "night", label: "Late night", note: "after ten", from: 22, to: 4 },
] as const;
export const partOfDay = (hour: number) => partsOfDay.find(part => (part.from <= part.to ? hour >= part.from && hour <= part.to : hour >= part.from || hour <= part.to)) ?? partsOfDay[1];
export const wordStops = new Set(("about after again against already also always another around back because been before being between both cannot could does doing down during each even ever every first from getting given goes going gone have having here into itself just keep kept last like made make more most much must need never next nothing once only other over really same should some something still such take taken than that their them then there these they thing things think this those three through today together took under until very want week were what when where which while will with without would your yourself").split(" "));
// Five letters and up, seen at least twice: shorter or rarer words are noise, not signature.
export const signatureWords = (entries: DiaryEntry[]) => {
  const tally = new Map<string, number>();
  entries.forEach(entry => (`${entry.title} ${entry.text}`.toLowerCase().match(/[a-z][a-z'-]{4,}/g) || [])
    .filter(word => !wordStops.has(word))
    .forEach(word => tally.set(word, (tally.get(word) ?? 0) + 1)));
  return Array.from(tally.entries()).filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1]).slice(0, 8);
};

/* Prompts for a blank page. Stable through the day so the page does not shuffle
   under you, with a nudge available when none of them fit. */
export const writingPrompts = [
  "What took up the most room in your head today?",
  "What went better than you expected?",
  "Who do you need to say something to, and what would you say?",
  "What are you carrying that is not yours to carry?",
  "If today repeated tomorrow, what one thing would you change?",
  "What did you decide today, and what made you decide it?",
  "What are you avoiding, and what does avoiding it cost?",
  "Where did the time actually go?",
  "What would make tomorrow easier, and can you set it up tonight?",
  "What is working right now that you would like more of?",
  "What did someone do for you today?",
  "What are you proud of that nobody else noticed?",
];
export const lookBackWindows = [{ days: 365, label: "A year ago" }, { days: 180, label: "Six months ago" }, { days: 90, label: "Three months ago" }, { days: 30, label: "A month ago" }, { days: 7, label: "A week ago" }] as const;
export const diarySuggestion = (mood: Mood, text: string, title = "", history: DiaryEntry[] = [], writtenAt?: string) => {
  const raw = `${title} ${text}`.trim();
  const note = raw.toLowerCase();
  if (crisisPattern.test(note)) {
    return "What you have written matters, and it is more than this app should try to answer. Please reach out to someone today — a person you trust, your doctor, or your local crisis line — and if you are in immediate danger, call your local emergency number. Try not to be on your own right now.";
  }

  const themes = detectThemes(note);
  const top = themes[0];
  const second = themes[1];
  const intensity = intensityOf(raw);
  const need = statedNeed(text);
  const question = openQuestion(text);
  const pivot = pivotClause(text);
  const people = peopleMentioned(raw);
  const heavyMood = heavyMoods.includes(mood);
  const absolute = absoluteWord(text);
  const hour = new Date(writtenAt || Date.now()).getHours();
  const seed = `${mood}|${raw}`;

  const recent = history.filter(entry => Date.now() - new Date(entry.at).getTime() < 8 * 86400000).slice(0, 8);
  const recurrence = top ? recent.filter(entry => detectThemes(`${entry.title} ${entry.text}`.toLowerCase()).some(theme => theme.id === top.id)).length : 0;
  const heavyStreak = heavyMood && history.slice(0, 2).length === 2 && history.slice(0, 2).every(entry => heavyMoods.includes(entry.mood));
  const lifted = (mood === "bright" || mood === "calm") && history[0] && heavyMoods.includes(history[0].mood);
  const positiveContent = themes.some(theme => ["progress", "gratitude", "relief", "hope"].includes(theme.id) && theme.score >= 2);

  // 1 — reflect back the specific thing they wrote, in their own words.
  /* When a theme drives the insight, quote a line that actually carries that theme —
     quoting the longest sentence instead made the mirror and the insight disagree. */
  const themedClause = () => {
    const pattern = top ? themeLexicon.find(theme => theme.id === top.id)?.pattern : undefined;
    if (!pattern) return strongestClause(text);
    const carrying = text.split(/[.!?\n]+/).map(tidy).filter(part => part.split(" ").length >= 4)
      .filter(clause => Array.from(clause.matchAll(pattern)).some(match => !negatorPattern.test(clause.slice(Math.max(0, (match.index ?? 0) - 26), match.index ?? 0))))
      .sort((a, b) => b.length - a.length);
    return carrying.length ? clip(carrying[0]) : strongestClause(text);
  };
  const mirror = need
    ? pickFrom([`You said it yourself: ${quote(need)}`, `The clearest line in this is your own: ${quote(need)}`], seed)
    : question
      ? `You ended on a question — ${quote(question)} — and that is the honest centre of this entry.`
      : pivot
        ? pickFrom([`Past the setup, this is where the weight sits: ${quote(pivot)}`, `You moved through the context quickly and landed here: ${quote(pivot)}`], seed)
        : title.trim()
          ? `“${clip(tidy(title))}” — and the line that carries it is ${quote(themedClause())}`
          : quote(themedClause());

  // 2 — what the combination suggests, using history where it earns its place.
  let insight: string;
  if (lifted) insight = `Your last entry was ${moodLabel(history[0].mood)} and today is ${moodLabel(mood)}. Something moved between then and now, and naming it precisely is what makes it repeatable rather than lucky.`;
  else if (heavyStreak) insight = "That is three entries in a row carrying weight. One hard day is weather; three is a pattern — and patterns usually need something structural to change, not more effort from you.";
  else if (top && recurrence >= 2) insight = `${top.label.charAt(0).toUpperCase()}${top.label.slice(1)} has now appeared in ${recurrence + 1} of your recent entries. At that frequency it has stopped being a bad day and started being a condition worth changing on purpose.`;
  else if (positiveContent && heavyMood) insight = `You described real progress and still marked the day ${moodLabel(mood)}. That gap is the more interesting thing here — the work moved and something else did not, and it is usually the something else that needs attention.`;
  else if (top && second && top.id === "blocked" && second.id === "conflict") insight = "This is both a stalled handoff and a strained relationship, and they are feeding each other — the longer the silence runs, the more personal it starts to feel.";
  else if (top && second && (top.id === "overload" || second.id === "overload") && (top.id === "exhaustion" || second.id === "exhaustion")) insight = "Too much to do and nothing left to do it with is a combination that does not resolve by pushing. At this point capacity is the constraint, not effort.";
  else if (top && second && (top.id === "selfBlame" || second.id === "selfBlame") && (top.id === "progress" || second.id === "progress")) insight = "You recorded something that went well and still found the fault to sit with. That habit is expensive: it quietly deletes your own evidence.";
  else if (top) insight = pickFrom(themeInsight[top.id], seed);
  else if (absolute) insight = `The phrase “${absolute}” is doing a lot of work in here. Under pressure that kind of certainty arrives fast, and it is almost never as true as it feels.`;
  else if (raw.split(/\s+/).length < 25) insight = "This is short, which is fine — but short entries are hard to learn from later. One concrete detail turns a note into something you can look back on.";
  else insight = `This reads as ${moodLabel(mood)} more than it reads as any one problem, which usually means the state is worth tending before the to-do list is.`;

  // 3 — one step, sized to what is actually left in the tank.
  let step = top ? pickFrom(themeStep[top.id], seed) : "Write one sentence for what you need next, then turn that need into the smallest practical action.";
  // Only name a person where the entry makes it unambiguous who the other side is.
  if (people.length && top?.id === "conflict") step = step.replace(/\bthis person\b/, people[0]).replace(/\bthem\b/, people[0]);
  if (!top && (mood === "low" || heavyMood)) step = gentleStep;
  // A themed step still applies on a heavy day — it just needs permission to be done badly.
  else if (mood === "low" || (top?.id === "exhaustion" && intensity > 0.45)) step = `${step} If today is not the day for all of it, do the smaller half.`;
  if (absolute && top && top.id !== "selfBlame") step = `${step} And where you wrote “${absolute}”, try naming the one specific time instead — the specific version is the one you can do something about.`;

  const closing = hour >= 23 || hour < 5
    ? " Written this late, everything carries more weight than it will at nine in the morning — hold any big conclusion until then."
    : hasTimePressure(text) && intensity > 0.35
      ? " And the clock in this entry is real, so give the step a time rather than a hope."
      : "";

  return `${mirror} ${insight} ${step}${closing}`;
};
export type NotificationDelivery = "service-worker" | "browser";
export type NotificationResult = { delivery: NotificationDelivery; reason?: string } | { delivery: null; reason: string };

/* The notification worker is registered once per page load and shared. Registering
   inside every send (as this used to) hands back a registration whose worker has not
   activated yet, and showNotification() throws on a registration with no active worker —
   which is why the first, and often every, reminder silently fell through. */
export let workerRegistration: Promise<ServiceWorkerRegistration | null> | null = null;
export const notificationWorker = () => {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return Promise.resolve(null);
  if (!workerRegistration) {
    workerRegistration = navigator.serviceWorker.register("/sw.js")
      .then(async registration => {
        if (registration.active) return registration;
        // navigator.serviceWorker.ready only resolves once a worker is active for this scope.
        const settled = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<null>(resolve => window.setTimeout(() => resolve(null), 5000)),
        ]);
        return settled ?? (registration.active ? registration : null);
      })
      .catch(error => { console.warn("Signal Petal could not register its notification worker.", error); return null; });
  }
  return workerRegistration;
};
export const describeError = (error: unknown) => (error instanceof Error && error.message ? error.message : String(error));
export const sendReminderNotification = async (title: string, body: string, tag: string): Promise<NotificationResult> => {
  if (typeof window === "undefined" || !("Notification" in window)) return { delivery: null, reason: "this browser has no Notification support" };
  if (Notification.permission === "denied") return { delivery: null, reason: "notifications are blocked for this address in your browser settings" };
  if (Notification.permission !== "granted") return { delivery: null, reason: "notification permission has not been granted yet" };

  const failures: string[] = [];
  const registration = await notificationWorker();
  if (registration?.active) {
    try {
      const options: NotificationOptions = { body, tag };
      // renotify is rejected by some engines; retry without it rather than losing the notification.
      try { await registration.showNotification(title, { ...options, renotify: true } as NotificationOptions); }
      catch { await registration.showNotification(title, options); }
      return { delivery: "service-worker" };
    } catch (error) { failures.push(`background service: ${describeError(error)}`); }
  } else if ("serviceWorker" in navigator) {
    failures.push("background service: the notification worker never became active");
  }

  try {
    const notification = new Notification(title, { body, tag });
    notification.onclick = () => { window.focus(); notification.close(); };
    notification.onerror = () => console.warn("Signal Petal browser notification was rejected by the operating system.");
    return { delivery: "browser", reason: failures.join(" · ") || undefined };
  } catch (error) {
    failures.push(`browser: ${describeError(error)}`);
    return { delivery: null, reason: failures.join(" · ") };
  }
};
/* Notification permission is browser state, not component state: it changes from the
   permission prompt, from site settings, and from another tab. Reading it through an
   external store keeps the UI honest instead of showing whatever it was at page load. */
export const permissionListeners = new Set<() => void>();
export const announcePermissionChange = () => permissionListeners.forEach(listener => listener());
export const permissionStore = {
  subscribe(onChange: () => void) {
    permissionListeners.add(onChange);
    let cancelled = false;
    let watcher: PermissionStatus | null = null;
    navigator.permissions?.query({ name: "notifications" as PermissionName })
      .then(status => { if (cancelled) return; watcher = status; status.addEventListener("change", onChange); })
      .catch(() => undefined);
    const onVisible = () => { if (document.visibilityState === "visible") onChange(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onChange);
    return () => {
      cancelled = true;
      permissionListeners.delete(onChange);
      watcher?.removeEventListener("change", onChange);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onChange);
    };
  },
  getSnapshot: (): NotificationPermission | "unsupported" => ("Notification" in window ? Notification.permission : "unsupported"),
  getServerSnapshot: (): NotificationPermission | "unsupported" => "default",
};
export const osLevelHint ="If nothing appeared on screen, the block is outside the browser: on macOS open System Settings → Notifications, allow your browser, and check that Do Not Disturb or a Focus mode is off. On Windows, check Settings → System → Notifications.";
export const describeDelivery = (result: NotificationResult, label: string) => result.delivery
  ? `${label} sent through ${result.delivery === "service-worker" ? "the background notification service" : "the browser"}. ${osLevelHint}`
  : `${label} could not be delivered — ${result.reason}.`;
