"use client";

import { Fragment, type ChangeEvent, FormEvent, type ReactNode, type KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import Petal from "./petal";
import { isValidPayload, normaliseIssues, encodeTransfer, decodeTransfer, backupFileName, mergeTransferData } from "./backup";
import type { Status, Profile, Issue, Mood, DiaryEntry, DiaryAction, DiaryEvent, DiaryVault, DailyCheckIn, TransferPayload } from "./backup";
import { FocusRecommendation,GARDEN_PETAL,InsightDrilldown,InsightRange,InsightSection,LOCK_ITERATIONS,MetricFocus,NotificationDelivery,NotificationResult,SignalGarden,StatusDraft,ThemeId,absoluteWord,addDays,announcePermissionChange,clip,completedAtOf,crisisPattern,dateLabel,dayBefore,dayKey,daysOverdue,daysSince,defaultStatusColors,defaultStatuses,deriveDiaryKey,describeDelivery,describeDiaryChange,describeError,deskLine,deskLines,detectThemes,diaryEventLabel,diaryFonts,diaryPapers,diarySuggestion,fromB64,gentleStep,greetingFor,hasTimePressure,heavyMoods,intensityOf,isCompleteStatus,isOverdue,lookBackWindows,moodLabel,moodName,moodWeight,moods,negatorPattern,notificationWorker,openDiaryVault,openQuestion,osLevelHint,partOfDay,partsOfDay,peopleFromInput,peopleMentioned,permissionListeners,permissionStore,pickFrom,pivotClause,quote,readStoredVault,safeMemoryPreview,saveBackupFile,sealDiary,seed,sendReminderNotification,signatureWords,spanLabel,startOfWeek,statedNeed,statusClass,strongestClause,themeInsight,themeLexicon,themeStep,themes,tidy,titleCaseName,toB64,toDateTimeInput,weekLabel,wordCount,wordStops,workerRegistration,writingPrompts,yearGrid } from "./lib/engine";

export default function Home() {
  const [issues, setIssues] = useState<Issue[]>(seed);
  const [activeId, setActiveId] = useState<string>(seed[0].id);
  const [showDetail, setShowDetail] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDailyCheckIn, setShowDailyCheckIn] = useState(false);
  const [memoryIssueId, setMemoryIssueId] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [commandIndex, setCommandIndex] = useState(0);
  const [dailyCheckIns, setDailyCheckIns] = useState<DailyCheckIn[]>([]);
  const [checkInCapacity, setCheckInCapacity] = useState<DailyCheckIn["capacity"]>("steady");
  const [checkInNote, setCheckInNote] = useState("");
  const [checkInParked, setCheckInParked] = useState<string[]>([]);
  const [checkInStep, setCheckInStep] = useState(0);
  const [checkInWin, setCheckInWin] = useState("");
  const [checkInTomorrowMove, setCheckInTomorrowMove] = useState("");
  const [checkInResumeAt, setCheckInResumeAt] = useState("");
  const [checkInShowAll, setCheckInShowAll] = useState(false);
  const [showCheckInHistory, setShowCheckInHistory] = useState(false);
  const [checkInSaved, setCheckInSaved] = useState(false);
  const [statuses, setStatuses] = useState<Status[]>(defaultStatuses);
  const [statusColors, setStatusColors] = useState<Record<string, string>>(defaultStatusColors);
  const [statusDraft, setStatusDraft] = useState<StatusDraft[]>([]);
  const [statusInput, setStatusInput] = useState("");
  const [statusError, setStatusError] = useState("");
  const [transferCode, setTransferCode] = useState("");
  const [importCode, setImportCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [diaryLog, setDiaryLog] = useState<DiaryEvent[]>([]);
  const [editingDiaryId, setEditingDiaryId] = useState("");
  const [openDiaryId, setOpenDiaryId] = useState("");
  const [confirmDiaryDelete, setConfirmDiaryDelete] = useState("");
  /* Deleting is guarded AND undoable: the confirm stops the misclick, the undo
     catches the moment you meant a different page. */
  const [undo, setUndo] = useState<{ label: string; restore: () => void } | null>(null);
  /* The one moment worth celebrating in a queue app is something leaving the queue.
     Closing an issue used to be a silent <select> change and the card just vanished. */
  const [win, setWin] = useState<{ title: string; span: string } | null>(null);
  const [diaryFont, setDiaryFont] = useState("journal");
  const [diaryPaper, setDiaryPaper] = useState("cream");
  const [diaryQuery, setDiaryQuery] = useState("");
  const [diaryMoodFilter, setDiaryMoodFilter] = useState<Mood | "">("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [diaryLinks, setDiaryLinks] = useState<string[]>([]);
  const [editDraft, setEditDraft] = useState<{ title: string; text: string; mood: Mood; issueIds: string[] }>({ title: "", text: "", mood: "okay", issueIds: [] });
  const [diaryMood, setDiaryMood] = useState<Mood>("okay");
  const [diaryTitle, setDiaryTitle] = useState("");
  const [diaryText, setDiaryText] = useState("");
  const [diaryInsight, setDiaryInsight] = useState("");
  const [transferMessage, setTransferMessage] = useState("");
  const [lastBackup, setLastBackup] = useState("");
  const [lockOn, setLockOn] = useState(false);
  const [diaryLocked, setDiaryLocked] = useState(false);
  const [diaryKey, setDiaryKey] = useState<CryptoKey | null>(null);
  const [lockPass, setLockPass] = useState("");
  const [lockConfirm, setLockConfirm] = useState("");
  const [lockUnderstood, setLockUnderstood] = useState(false);
  const [lockMessage, setLockMessage] = useState("");
  const [lockBusy, setLockBusy] = useState(false);
  const [showLockSetup, setShowLockSetup] = useState(false);
  // Only the salt needs to outlive a re-seal; the ciphertext is read back from storage.
  const saltRef = useRef("");
  const [followUpInput, setFollowUpInput] = useState("");
  const [newFollowUps, setNewFollowUps] = useState<string[]>([]);
  const [newFollowUpInput, setNewFollowUpInput] = useState("");
  const [filter, setFilter] = useState<"All" | "Mine" | "Overdue">("All");
  const [metricFocus, setMetricFocus] = useState<MetricFocus>("home-total");
  const [focusRescheduleId, setFocusRescheduleId] = useState("");
  const [focusCompletingId, setFocusCompletingId] = useState("");
  const [section, setSection] = useState<"dashboard" | "calendar" | "metrics" | "diary" | "review" | "settings">("dashboard");
  const [insightRange, setInsightRange] = useState<InsightRange>("30");
  const [insightSection, setInsightSection] = useState<InsightSection>("work");
  const [insightDrilldown, setInsightDrilldown] = useState<InsightDrilldown>("");
  const [diaryInsightPrefs, setDiaryInsightPrefs] = useState({ mood: true, themes: true, words: false });
  const [reviewWeek, setReviewWeek] = useState<Date | null>(null);
  const [reviewRange, setReviewRange] = useState<"calendar" | "recent">("calendar");
  const [reviewCopied, setReviewCopied] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(new Date(2026, 7, 1));
  const [selectedDay, setSelectedDay] = useState<string>("2026-08-13");
  const [theme, setTheme] = useState("rose");
  const [darkMode, setDarkMode] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const permission = useSyncExternalStore(permissionStore.subscribe, permissionStore.getSnapshot, permissionStore.getServerSnapshot);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("16:30");
  const [reminderFeedback, setReminderFeedback] = useState("");
  const [hydrated, setHydrated] = useState(false);
  // -1 until hydration, so the server and the first client render agree.
  const [nowHour, setNowHour] = useState(-1);
  const [pixelYear, setPixelYear] = useState(0);

  useEffect(() => {
    let loadedIssues = seed;
    const saved = localStorage.getItem("signal-petal-issues");
    if (saved) {
      try { loadedIssues = normaliseIssues(JSON.parse(saved) as Issue[]).map(i => ({ ...i, followUpPeople: i.followUpPeople.filter(person => typeof person === "string" && person.trim()).map(person => person.trim()), createdAt: i.createdAt || i.updates?.[0]?.at || new Date().toISOString() })); setIssues(loadedIssues); }
      catch { localStorage.removeItem("signal-petal-issues"); }
    }
    const savedStatuses = localStorage.getItem("signal-petal-statuses");
    let loadedStatuses = defaultStatuses;
    if (savedStatuses) {
      try { const parsed = JSON.parse(savedStatuses); if (Array.isArray(parsed)) loadedStatuses = parsed.filter((value): value is string => typeof value === "string" && Boolean(value.trim())).map(value => value.trim()); }
      catch { localStorage.removeItem("signal-petal-statuses"); }
    }
    const terminalStatus = loadedStatuses.includes("Closed") && !loadedStatuses.includes("Resolved") ? "Closed" : "Resolved";
    const customStatuses = Array.from(new Set([...loadedStatuses, ...loadedIssues.map(issue => issue.status)].filter(status => !["New", "Ongoing", "Resolved", "Closed"].includes(status))));
    setStatuses(["New", "Ongoing", ...customStatuses, terminalStatus]);
    const savedColors = localStorage.getItem("signal-petal-status-colors");
    if (savedColors) { try { const parsed = JSON.parse(savedColors); if (parsed && typeof parsed === "object") setStatusColors({ ...defaultStatusColors, ...parsed }); } catch { localStorage.removeItem("signal-petal-status-colors"); } }
    const savedProfile = localStorage.getItem("signal-petal-profile");
    if (savedProfile) { try { const parsed = JSON.parse(savedProfile) as Profile; if (parsed.name?.trim() && parsed.role?.trim()) setProfile({ name: parsed.name.trim(), role: parsed.role.trim() }); } catch { localStorage.removeItem("signal-petal-profile"); } }
    setTheme(localStorage.getItem("signal-petal-theme") || "rose");
    setDarkMode(localStorage.getItem("signal-petal-dark") === "true");
    setReminderTime(localStorage.getItem("signal-petal-reminder-time") || "16:30");
    setDiaryFont(localStorage.getItem("signal-petal-diary-font") || "journal");
    setDiaryPaper(localStorage.getItem("signal-petal-diary-paper") || "cream");
    const savedInsightPrefs = localStorage.getItem("signal-petal-insight-privacy");
    if (savedInsightPrefs) {
      try { const parsed = JSON.parse(savedInsightPrefs); if (parsed && typeof parsed === "object") setDiaryInsightPrefs(current => ({ ...current, ...parsed })); }
      catch { localStorage.removeItem("signal-petal-insight-privacy"); }
    }
    setLastBackup(localStorage.getItem("signal-petal-last-backup") || "");
    const savedCheckIns = localStorage.getItem("signal-petal-daily-check-ins");
    if (savedCheckIns) { try { const parsed = JSON.parse(savedCheckIns); if (Array.isArray(parsed)) setDailyCheckIns(parsed); } catch { localStorage.removeItem("signal-petal-daily-check-ins"); } }
    setPromptIndex(Math.floor(new Date().setHours(0, 0, 0, 0) / 86400000) % writingPrompts.length);
    setReviewWeek(startOfWeek(new Date()));
    const storedVault = readStoredVault();
    if (storedVault) { saltRef.current = storedVault.salt; setLockOn(true); setDiaryLocked(true); }
    let loadedDiary: DiaryEntry[] = [];
    const savedDiary = localStorage.getItem("signal-petal-diary");
    if (savedDiary) { try { const parsed = JSON.parse(savedDiary); if (Array.isArray(parsed)) loadedDiary = parsed; } catch { localStorage.removeItem("signal-petal-diary"); } }
    if (!readStoredVault()) setDiaryEntries(loadedDiary);
    let loadedDiaryLog: DiaryEvent[] = [];
    const savedDiaryLog = localStorage.getItem("signal-petal-diary-log");
    if (savedDiaryLog) { try { const parsed = JSON.parse(savedDiaryLog); if (Array.isArray(parsed)) loadedDiaryLog = parsed; } catch { localStorage.removeItem("signal-petal-diary-log"); } }
    // Reflections written before the log existed still deserve a place on the calendar.
    const alreadyLogged = new Set(loadedDiaryLog.filter(event => event.action === "created").map(event => event.entryId));
    const backfilled = loadedDiary
      .filter(entry => !alreadyLogged.has(entry.id))
      .map<DiaryEvent>(entry => ({ id: `backfill-${entry.id}`, entryId: entry.id, at: entry.at, action: "created", title: entry.title, mood: entry.mood, detail: `${wordCount(entry.text)} word${wordCount(entry.text) === 1 ? "" : "s"}` }));
    if (!readStoredVault()) setDiaryLog([...backfilled, ...loadedDiaryLog].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()));
    const savedReminders = localStorage.getItem("signal-petal-reminders-enabled");
    if ("Notification" in window) setRemindersEnabled(Notification.permission === "granted" && savedReminders !== "false");
    setNowHour(new Date().getHours());
    setPixelYear(new Date().getFullYear());
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem("signal-petal-issues", JSON.stringify(issues)); }, [issues, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem("signal-petal-statuses", JSON.stringify(statuses)); }, [statuses, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem("signal-petal-status-colors", JSON.stringify(statusColors)); }, [statusColors, hydrated]);
  useEffect(() => { if (hydrated) { localStorage.setItem("signal-petal-theme", theme); localStorage.setItem("signal-petal-dark", String(darkMode)); } }, [theme, darkMode, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem("signal-petal-reminders-enabled", String(remindersEnabled)); }, [remindersEnabled, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem("signal-petal-reminder-time", reminderTime); }, [reminderTime, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem("signal-petal-daily-check-ins", JSON.stringify(dailyCheckIns)); }, [dailyCheckIns, hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem("signal-petal-insight-privacy", JSON.stringify(diaryInsightPrefs)); }, [diaryInsightPrefs, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    if (lockOn) {
      // With the lock on, no plaintext copy is allowed to linger.
      localStorage.removeItem("signal-petal-diary");
      localStorage.removeItem("signal-petal-diary-log");
      return;
    }
    localStorage.setItem("signal-petal-diary", JSON.stringify(diaryEntries));
    localStorage.setItem("signal-petal-diary-log", JSON.stringify(diaryLog));
  }, [diaryEntries, diaryLog, hydrated, lockOn]);
  // Re-seal whenever the unlocked diary changes.
  useEffect(() => {
    if (!hydrated || !lockOn || diaryLocked || !diaryKey || !saltRef.current) return;
    let cancelled = false;
    void (async () => {
      const sealed = await sealDiary(diaryKey, saltRef.current, diaryEntries, diaryLog);
      if (!cancelled) localStorage.setItem("signal-petal-diary-vault", JSON.stringify(sealed));
    })();
    return () => { cancelled = true; };
  }, [diaryEntries, diaryLog, diaryKey, diaryLocked, lockOn, hydrated]);
  useEffect(() => { if (hydrated) { localStorage.setItem("signal-petal-diary-font", diaryFont); localStorage.setItem("signal-petal-diary-paper", diaryPaper); } }, [diaryFont, diaryPaper, hydrated]);
  useEffect(() => { if (hydrated && profile) { localStorage.setItem("signal-petal-profile", JSON.stringify(profile)); document.title = `${profile.name}'s Signal Petal`; } }, [profile, hydrated]);
  useEffect(() => { void notificationWorker(); }, []);
  useEffect(() => {
    const refresh = () => setNowHour(new Date().getHours());
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    const timer = window.setInterval(refresh, 600000);
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, []);
  useEffect(() => {
    if (!undo) return;
    const timer = window.setTimeout(() => setUndo(null), 12000);
    return () => window.clearTimeout(timer);
  }, [undo]);
  useEffect(() => {
    if (!win) return;
    const timer = window.setTimeout(() => setWin(null), 7000);
    return () => window.clearTimeout(timer);
  }, [win]);
  useEffect(() => {
    if (!showDetail && !showCreate && !showDeleteConfirm && !showDailyCheckIn && !memoryIssueId && !showOnboarding && !showCommandPalette && !openDiaryId && !confirmDiaryDelete) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (confirmDiaryDelete) setConfirmDiaryDelete("");
        else if (showDeleteConfirm) setShowDeleteConfirm(false);
        else if (openDiaryId) { setOpenDiaryId(""); setEditingDiaryId(""); }
        else if (memoryIssueId) setMemoryIssueId("");
        else if (showCommandPalette) setShowCommandPalette(false);
        else if (showOnboarding) finishOnboarding();
        else if (showDailyCheckIn) setShowDailyCheckIn(false);
        else if (showCreate) setShowCreate(false);
        else setShowDetail(false);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", closeOnEscape); document.body.style.overflow = previousOverflow; };
  }, [showDetail, showCreate, showDeleteConfirm, showDailyCheckIn, memoryIssueId, showOnboarding, showCommandPalette, openDiaryId, confirmDiaryDelete]);
  useEffect(() => {
    const openCommands = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.matches("input, textarea, select, [contenteditable='true']");
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandQuery(""); setCommandIndex(0); setShowCommandPalette(true); }
      else if (event.key === "/" && !typing && !showDetail && !showCreate) { event.preventDefault(); setCommandQuery(""); setCommandIndex(0); setShowCommandPalette(true); }
    };
    document.addEventListener("keydown", openCommands);
    return () => document.removeEventListener("keydown", openCommands);
  }, [showDetail, showCreate]);
  /* The scheduler reads the live queue through a ref so that editing an issue no longer
     tears down and restarts the one-minute timer. */
  const issuesRef = useRef(issues);
  useEffect(() => { issuesRef.current = issues; }, [issues]);
  // A saved preference is not the same as permission — reminders only run when both hold.
  const remindersOn = remindersEnabled && permission === "granted";
  useEffect(() => {
    if (!hydrated || !remindersOn) return;
    let cancelled = false;
    const check = async () => {
      if (cancelled || !("Notification" in window) || Notification.permission !== "granted") return;
      const now = new Date();
      const pad = (value: number) => String(value).padStart(2, "0");
      const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const dueSoon = issuesRef.current.filter(issue => !isCompleteStatus(issue.status) && issue.expected && new Date(issue.expected).getTime() <= now.getTime() + 24 * 60 * 60 * 1000);
      // Keying on which items are due — not just the date — means work that slips later in
      // the day still raises an alert instead of being swallowed by this morning's reminder.
      const taskReminderKey = `${today}|${dueSoon.map(issue => issue.id).sort().join(",")}`;
      if (dueSoon.length && localStorage.getItem("signal-petal-task-reminder-day") !== taskReminderKey) {
        const overdue = dueSoon.filter(isOverdue).length;
        const upcoming = dueSoon.length - overdue;
        const parts = [overdue ? `${overdue} overdue` : "", upcoming ? `${upcoming} due within 24 hours` : ""].filter(Boolean).join(" and ");
        const result = await sendReminderNotification("Signal Petal needs attention", `${parts}. Open your queue to record the next move.`, `signal-petal-tasks-${today}`);
        if (cancelled) return;
        if (result.delivery) { localStorage.setItem("signal-petal-task-reminder-day", taskReminderKey); setReminderFeedback(`Task reminder sent at ${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`); }
        else setReminderFeedback(`Task reminder could not be delivered — ${result.reason}.`);
      }
      const [hour, minute] = reminderTime.split(":").map(Number);
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) return;
      // The time is part of the key, so moving the check-in earlier re-arms it for today.
      const checkInKey = `${today}|${reminderTime}`;
      if (now.getHours() * 60 + now.getMinutes() >= hour * 60 + minute && localStorage.getItem("signal-petal-check-in-day") !== checkInKey) {
        const result = await sendReminderNotification("Daily Signal Petal check-in", "Take a moment to update your work and write down how the day felt.", `signal-petal-check-in-${today}`);
        if (cancelled) return;
        if (result.delivery) { localStorage.setItem("signal-petal-check-in-day", checkInKey); setReminderFeedback(`Daily check-in sent at ${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`); }
        else setReminderFeedback(`Daily check-in could not be delivered — ${result.reason}.`);
      }
    };
    const onVisible = () => { if (document.visibilityState === "visible") void check(); };
    void check();
    const timer = window.setInterval(() => void check(), 60000);
    document.addEventListener("visibilitychange", onVisible);
    return () => { cancelled = true; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [hydrated, remindersOn, reminderTime]);

  const active = issues.find(i => i.id === activeId) ?? issues[0];
  const notificationState = permission === "unsupported" ? "Not supported in this browser"
    : permission === "denied" ? "Blocked — allow in your browser settings"
    : permission === "default" ? "Off — turn on to allow notifications"
    : remindersOn ? "Notifications on" : "Allowed, reminders paused";
  const diaryFontStack = (diaryFonts.find(font => font[0] === diaryFont) ?? diaryFonts[0])[2];
  const diarySkin = { "--diary-font": diaryFontStack } as CSSProperties;
  const openEntry = diaryEntries.find(entry => entry.id === openDiaryId);
  const openEntryIndex = diaryEntries.findIndex(entry => entry.id === openDiaryId);
  const review = useMemo(() => {
    if (!reviewWeek) return null;
    const today = new Date();
    const recentStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
    const from = (reviewRange === "recent" ? recentStart : reviewWeek).getTime();
    const to = (reviewRange === "recent" ? new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1) : addDays(reviewWeek, 7)).getTime();
    const within = (value: string) => { const at = new Date(value).getTime(); return at >= from && at < to; };
    const shipped = issues.filter(issue => isCompleteStatus(issue.status) && within(completedAtOf(issue)));
    const logged = issues.filter(issue => within(issue.createdAt));
    const stalled = issues.filter(issue => !isCompleteStatus(issue.status) && issue.expected && new Date(issue.expected).getTime() < to && isOverdue(issue));
    const pages = diaryEntries.filter(entry => within(entry.at)).sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    const owed = pages.map(entry => statedNeed(entry.text)).filter(Boolean).slice(0, 3);
    const previous = diaryEntries.filter(entry => { const at = new Date(entry.at).getTime(); return at >= from - 7 * 86400000 && at < from; });
    const checkIns = dailyCheckIns.filter(checkIn => within(checkIn.at));
    const focusMoves = issues.filter(issue => issue.focusHandledAt && within(issue.focusHandledAt));
    const parkedIds = Array.from(new Set(checkIns.flatMap(checkIn => checkIn.parkedIssueIds)));
    const parkedIssues = parkedIds.map(id => issues.find(issue => issue.id === id)).filter((issue): issue is Issue => Boolean(issue));
    const priorities = [...issues.filter(issue => !isCompleteStatus(issue.status))].sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)) || (a.expected ? new Date(a.expected).getTime() : Infinity) - (b.expected ? new Date(b.expected).getTime() : Infinity)).slice(0, 3);
    const carried = previous.map(entry => statedNeed(entry.text)).filter(Boolean).slice(0, 2);
    const feel = pages.length ? pages.reduce((sum, entry) => sum + moodWeight[entry.mood], 0) / pages.length : null;
    const gardenStage = Math.min(4, Number(shipped.length > 0) + Number(pages.length > 0) + Number(checkIns.length > 0) + Number(focusMoves.length > 0));
    return { shipped, logged, stalled, pages, owed, carried, feel, checkIns, focusMoves, parkedIssues, priorities, gardenStage, isThisWeek: reviewRange === "calendar" && startOfWeek(today).getTime() === from, isRecent: reviewRange === "recent", from, to };
  }, [reviewWeek, reviewRange, issues, diaryEntries, dailyCheckIns]);
  /* Numbered from the oldest page, so page 1 stays page 1 forever. */
  const pageNumbers = useMemo(() => {
    const order = [...diaryEntries].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    return new Map(order.map((entry, index) => [entry.id, index + 1]));
  }, [diaryEntries]);
  const diaryYears = Array.from(new Set(diaryEntries.map(entry => new Date(entry.at).getFullYear()))).sort((a, b) => b - a);
  const shownYear = pixelYear || new Date().getFullYear();
  const pixels = useMemo(() => (diaryEntries.length ? yearGrid(diaryEntries, shownYear) : null), [diaryEntries, shownYear]);
  const pixelsWritten = pixels ? pixels.reduce((sum, row) => sum + row.days.filter(day => day.entry).length, 0) : 0;
  /* Work that closed WITH an outcome written down. A counter cannot show you what
     you actually did this quarter; the outcomes in your own words can. */
  const shippedWall = useMemo(() => issues
    .filter(issue => isCompleteStatus(issue.status) && issue.outcome.trim())
    .sort((a, b) => new Date(completedAtOf(b)).getTime() - new Date(completedAtOf(a)).getTime())
    .slice(0, 12), [issues]);
  const backupAge = lastBackup ? daysSince(lastBackup) : null;
  const confirmEntry = diaryEntries.find(entry => entry.id === confirmDiaryDelete);
  const diaryNeedle = diaryQuery.trim().toLowerCase();
  const visibleDiary = diaryEntries.filter(entry =>
    (!diaryMoodFilter || entry.mood === diaryMoodFilter) &&
    (!diaryNeedle || `${entry.title} ${entry.text}`.toLowerCase().includes(diaryNeedle)));
  /* Look back finds the nearest page to a round number of days ago, within a few days
     either side, so a young diary still has something to show. */
  const lookBack = (() => {
    for (const window of lookBackWindows) {
      const target = Date.now() - window.days * 86400000;
      const near = diaryEntries
        .map(entry => ({ entry, gap: Math.abs(new Date(entry.at).getTime() - target) }))
        .filter(candidate => candidate.gap <= 4 * 86400000)
        .sort((a, b) => a.gap - b.gap)[0];
      if (near) return { label: window.label, entry: near.entry };
    }
    return null;
  })();
  const personalOwner = profile?.name || "You";
  const todayKey = dayKey(new Date().toISOString());
  const todayCheckIn = dailyCheckIns.find(checkIn => dayKey(checkIn.at) === todayKey);
  const previousCheckIn = [...dailyCheckIns].filter(checkIn => dayKey(checkIn.at) !== todayKey).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0];
  const completedToday = issues.filter(issue => isCompleteStatus(issue.status) && dayKey(completedAtOf(issue)) === todayKey);
  const focusHandledToday = issues.filter(issue => issue.focusHandledAt && dayKey(issue.focusHandledAt) === todayKey);
  const openCount = issues.filter(i => !isCompleteStatus(i.status)).length;
  const overdueCount = issues.filter(isOverdue).length;
  const mine = issues.filter(i => i.owner.toLowerCase() === personalOwner.toLowerCase());
  const mineOpen = mine.filter(i => !isCompleteStatus(i.status));
  const mineOverdue = mine.filter(isOverdue);
  const mineResolved = mine.filter(i => isCompleteStatus(i.status));
  const attentionQueue = issues.filter(isOverdue).sort((a, b) => new Date(a.expected).getTime() - new Date(b.expected).getTime());
  const parkableIssues = [...issues.filter(issue => !isCompleteStatus(issue.status))].sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)) || (a.expected ? new Date(a.expected).getTime() : Infinity) - (b.expected ? new Date(b.expected).getTime() : Infinity));
  const checkInResumeMinimum = toDateTimeInput(addDays(new Date(), 1));
  const focusRecommendations = useMemo<FocusRecommendation[]>(() => issues
    .filter(issue => !isCompleteStatus(issue.status))
    .filter(issue => !issue.focusHandledAt || Date.now() - new Date(issue.focusHandledAt).getTime() >= 86400000)
    .flatMap(issue => {
      const recommendations: FocusRecommendation[] = [];
      if (isOverdue(issue)) {
        const delay = daysOverdue(issue);
        const people = issue.followUpPeople.length ? issue.followUpPeople.join(", ") : issue.owner;
        recommendations.push({ issue, kind: "overdue", priority: 300 + delay, reason: `${delay} day${delay === 1 ? "" : "s"} past the expected update`, move: issue.owner === personalOwner && !issue.followUpPeople.length ? "Confirm your next move." : `Confirm the next move with ${people}.` });
      } else if (!issue.expected) {
        recommendations.push({ issue, kind: "missing-eta", priority: 180, reason: "No expected update is set", move: "Choose when this should surface again." });
      }
      if (!issue.action.trim()) {
        recommendations.push({ issue, kind: "missing-action", priority: isOverdue(issue) ? 240 : 140, reason: "The next action is unclear", move: `Name what ${issue.owner === personalOwner ? "you are" : `${issue.owner} is`} doing next.` });
      }
      return recommendations;
    })
    .sort((a, b) => b.priority - a.priority)
    .filter((recommendation, index, all) => all.findIndex(item => item.issue.id === recommendation.issue.id) === index)
    .slice(0, 3), [issues, personalOwner]);
  const visible = useMemo(() => {
    let scopedIssues: Issue[];
    if (filter === "Mine") {
      if (metricFocus === "mine-open") scopedIssues = mineOpen;
      else if (metricFocus === "mine-overdue") scopedIssues = mineOverdue;
      else if (metricFocus === "mine-resolved") scopedIssues = mineResolved;
      else scopedIssues = mine;
    } else if (filter === "Overdue") {
      if (metricFocus === "attention-oldest" || metricFocus === "attention-first") scopedIssues = attentionQueue.slice(0, 1);
      else if (metricFocus === "attention-owners") scopedIssues = [...attentionQueue].sort((a, b) => a.owner.localeCompare(b.owner) || new Date(a.expected).getTime() - new Date(b.expected).getTime());
      else scopedIssues = attentionQueue;
    } else if (metricFocus === "home-resolved") scopedIssues = issues.filter(i => isCompleteStatus(i.status));
    else if (metricFocus === "home-overdue") scopedIssues = issues.filter(isOverdue);
    else if (metricFocus === "home-total") scopedIssues = issues;
    else scopedIssues = issues.filter(i => !isCompleteStatus(i.status));

    const terms = searchQuery.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return scopedIssues;
    return scopedIssues.filter(issue => {
      const searchable = [issue.title, issue.details, issue.action, issue.owner, issue.status, issue.followUpPeople.join(" "), ...issue.updates.flatMap(update => [update.author, update.text])].join(" ").toLocaleLowerCase();
      return terms.every(term => searchable.includes(term));
    });
  }, [issues, filter, metricFocus, personalOwner, searchQuery]);
  /* Derived rather than stored: the celebration is "you closed work today and the queue
     is empty", which is true for as long as it is true and gone tomorrow on its own. */
  const queueJustCleared = !focusRecommendations.length && completedToday.length > 0;
  const todayLine = deskLine(openCount, overdueCount, completedToday.length, todayKey);
  const wroteToday = diaryEntries.some(entry => dayKey(entry.at) === todayKey);
  const dailyMovesDone = Math.min(3, focusHandledToday.length);
  const gardenStage = Math.min(4, Number(dailyMovesDone > 0) + Number(completedToday.length > 0) + Number(Boolean(todayCheckIn)) + Number(wroteToday));
  const dashboardView = filter === "Mine" ? "mine" : filter === "Overdue" ? "attention" : "overview";
  const pageTitle = section === "review" ? "Your week in review" : section === "calendar" ? "Your work calendar" : section === "metrics" ? "Signals & progress" : section === "diary" ? "A quiet place to land" : section === "settings" ? "Settings" : filter === "Mine" ? "My actions" : filter === "Overdue" ? "Needs attention" : greetingFor(nowHour, profile?.name || "");
  /* Triage mode is the one screen that does not get the flourish — it is the view you
     open when something is wrong, and a little flower on it reads as tone-deaf. */
  const titleMark = !(section === "dashboard" && filter === "Overdue");
  const pageDescription = section === "review" ? "What moved, what stalled, and how the week actually felt — in one place." : section === "calendar" ? "Choose a day to see the tasks you logged and the diary activity that went with them." : section === "metrics" ? "A clear read on delivery pace, follow-through, and where to focus." : section === "diary" ? "Vent freely, name the mood, and leave with one gentle next step." : section === "settings" ? "Personalize your workspace, workflow, notifications, and local data." : filter === "Mine" ? "Your personal action list, separated from the wider team queue." : filter === "Overdue" ? "A focused triage view for work that has passed its expected update." : "A lovely little command center for keeping work moving.";
  const ownerReport = useMemo(() => Object.entries(issues.reduce<Record<string, number>>((map, i) => { if (!isCompleteStatus(i.status)) map[i.owner] = (map[i.owner] || 0) + 1; return map; }, {})).sort((a,b) => b[1]-a[1]), [issues]);
  const diaryInsights = useMemo(() => {
    if (!diaryEntries.length) return null;
    const entries = [...diaryEntries].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    const words = entries.map(entry => wordCount(entry.text));
    const totalWords = words.reduce((sum, count) => sum + count, 0);

    // Streaks are counted in days written, not entries — two entries in one evening is one day.
    const days = Array.from(new Set(entries.map(entry => dayKey(entry.at)))).sort();
    let longestStreak = 1;
    let run = 1;
    days.forEach((day, index) => {
      if (index === 0) return;
      run = dayBefore(day) === days[index - 1] ? run + 1 : 1;
      longestStreak = Math.max(longestStreak, run);
    });
    const today = dayKey(new Date().toISOString());
    const latest = days[days.length - 1];
    let currentStreak = latest === today || latest === dayBefore(today) ? 1 : 0;
    if (currentStreak) for (let index = days.length - 1; index > 0; index -= 1) {
      if (dayBefore(days[index]) !== days[index - 1]) break;
      currentStreak += 1;
    }

    const moodCounts = moods.map(mood => ({ ...mood, count: entries.filter(entry => entry.mood === mood.value).length }));
    const topMood = [...moodCounts].sort((a, b) => b.count - a.count)[0];
    const ribbon = entries.slice(-28);

    const themeTally = new Map<string, { label: string; count: number }>();
    entries.forEach(entry => {
      const seen = new Set<string>();
      detectThemes(`${entry.title} ${entry.text}`.toLowerCase()).forEach(theme => {
        if (seen.has(theme.id)) return;
        seen.add(theme.id);
        const current = themeTally.get(theme.id);
        themeTally.set(theme.id, { label: theme.label, count: (current?.count ?? 0) + 1 });
      });
    });
    const themes = Array.from(themeTally.values()).sort((a, b) => b.count - a.count).slice(0, 4);

    const clock = partsOfDay.map(part => ({ ...part, count: entries.filter(entry => partOfDay(new Date(entry.at).getHours()).id === part.id).length }));
    const favouriteTime = [...clock].sort((a, b) => b.count - a.count)[0];

    const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekdays = weekdayNames.map((name, index) => {
      const onDay = entries.filter(entry => new Date(entry.at).getDay() === index);
      return { name, count: onDay.length, weight: onDay.length ? onDay.reduce((sum, entry) => sum + moodWeight[entry.mood], 0) / onDay.length : 0 };
    }).filter(day => day.count > 0);
    const brightestDay = [...weekdays].sort((a, b) => b.weight - a.weight)[0];
    const heaviestDay = [...weekdays].sort((a, b) => a.weight - b.weight)[0];

    const revisited = new Set(diaryLog.filter(event => event.action === "edited").map(event => event.entryId)).size;

    // The biggest jump between two entries in a row — worth knowing what moved.
    let lift: { from: DiaryEntry; to: DiaryEntry; gain: number } | null = null;
    entries.forEach((entry, index) => {
      if (!index) return;
      const gain = moodWeight[entry.mood] - moodWeight[entries[index - 1].mood];
      if (gain > 0 && gain >= (lift?.gain ?? 1)) lift = { from: entries[index - 1], to: entry, gain };
    });

    // Do the days you log a lot of work read differently from the quiet ones?
    const busyDays = new Set(Array.from(new Set(issues.map(issue => dayKey(issue.createdAt)))).filter(day => issues.filter(issue => dayKey(issue.createdAt) === day).length >= 3));
    const onBusy = entries.filter(entry => busyDays.has(dayKey(entry.at)));
    const onQuiet = entries.filter(entry => !busyDays.has(dayKey(entry.at)));
    const heavyShare = (group: DiaryEntry[]) => Math.round((group.filter(entry => moodWeight[entry.mood] < 0).length / group.length) * 100);
    const crossover = onBusy.length >= 3 && onQuiet.length >= 3 ? { busy: heavyShare(onBusy), quiet: heavyShare(onQuiet), busyCount: onBusy.length, quietCount: onQuiet.length } : null;

    return { entries, totalWords, longestWords: Math.max(...words), averageWords: Math.round(totalWords / entries.length), currentStreak, longestStreak, daysWritten: days.length, moodCounts, topMood, ribbon, themes, clock, favouriteTime, brightestDay, heaviestDay, revisited, lift: lift as { from: DiaryEntry; to: DiaryEntry; gain: number } | null, crossover, words: signatureWords(entries) };
  }, [diaryEntries, diaryLog, issues]);

  /* One mood per day for the month grid: the average weight of everything written that
     day, snapped back to the nearest named mood. Averaging stops a single frustrated
     line from colouring a day that was mostly calm. */
  const moodByDay = useMemo(() => {
    const groups = new Map<string, Mood[]>();
    diaryEntries.forEach(entry => { const key = dayKey(entry.at); groups.set(key, [...(groups.get(key) ?? []), entry.mood]); });
    return new Map(Array.from(groups, ([key, list]) => {
      const average = list.reduce((sum, mood) => sum + moodWeight[mood], 0) / list.length;
      const counts = list.reduce<Partial<Record<Mood, number>>>((map, mood) => ({ ...map, [mood]: (map[mood] ?? 0) + 1 }), {});
      // Ties go to the mood actually written most that day, not to whichever sorts first.
      const nearest = [...moods].sort((a, b) => Math.abs(moodWeight[a.value] - average) - Math.abs(moodWeight[b.value] - average) || (counts[b.value] ?? 0) - (counts[a.value] ?? 0))[0];
      return [key, nearest.value] as const;
    }));
  }, [diaryEntries]);
  const calendarDays = useMemo(() => { const start = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1); const end = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0); return Array.from({ length: start.getDay() + end.getDate() }, (_, i) => i - start.getDay() + 1); }, [calendarMonth]);
  const selectedIssues = issues.filter(i => dayKey(i.createdAt) === selectedDay);
  // Diary events sit beside issues on the calendar; only mood and title are shown, never the reflection.
  const selectedDiary = diaryLog.filter(event => dayKey(event.at) === selectedDay).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const monthTitle = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(calendarMonth);
  const resolvedIssues = issues.filter(i => isCompleteStatus(i.status));
  const missingEtaIssues = issues.filter(issue => !isCompleteStatus(issue.status) && !issue.expected);
  const missingOutcomeIssues = resolvedIssues.filter(issue => !issue.outcome.trim());
  const memoryIssue = issues.find(issue => issue.id === memoryIssueId);
  const incompleteMemories = resolvedIssues.filter(issue => !issue.memory?.resolution.trim() || !issue.memory?.learning.trim());
  const insightWindow = useMemo(() => {
    const to = Date.now() + 1;
    if (insightRange === "all") return { from: 0, to, previousFrom: 0, previousTo: 0, label: "All time" };
    const days = Number(insightRange);
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days + 1).getTime();
    return { from, to, previousFrom: from - days * 86400000, previousTo: from, label: `Last ${days} days` };
  }, [insightRange]);
  const inInsightWindow = (value: string, previous = false) => {
    const at = new Date(value).getTime();
    return previous ? at >= insightWindow.previousFrom && at < insightWindow.previousTo : at >= insightWindow.from && at < insightWindow.to;
  };
  const insightResolved = resolvedIssues.filter(issue => inInsightWindow(completedAtOf(issue)));
  const previousResolved = insightRange === "all" ? [] : resolvedIssues.filter(issue => inInsightWindow(completedAtOf(issue), true));
  const insightLogged = issues.filter(issue => inInsightWindow(issue.createdAt));
  const previousLogged = insightRange === "all" ? [] : issues.filter(issue => inInsightWindow(issue.createdAt, true));
  const insightCompletedWithTime = insightResolved.filter(issue => issue.completedAt || issue.updates.length);
  const insightCompletionHours = insightCompletedWithTime.map(issue => (new Date(completedAtOf(issue)).getTime() - new Date(issue.createdAt).getTime()) / 3600000).filter(hours => hours >= 0);
  const insightAverageHours = insightCompletionHours.length ? insightCompletionHours.reduce((sum, hours) => sum + hours, 0) / insightCompletionHours.length : 0;
  const insightDueResolved = insightResolved.filter(issue => issue.expected && (issue.completedAt || issue.updates.length));
  const insightOnTimeCount = insightDueResolved.filter(issue => new Date(completedAtOf(issue)).getTime() <= new Date(issue.expected).getTime()).length;
  const insightOnTimeRate = insightDueResolved.length ? Math.round((insightOnTimeCount / insightDueResolved.length) * 100) : 0;
  const previousDueResolved = previousResolved.filter(issue => issue.expected && (issue.completedAt || issue.updates.length));
  const previousOnTimeCount = previousDueResolved.filter(issue => new Date(completedAtOf(issue)).getTime() <= new Date(issue.expected).getTime()).length;
  const previousOnTimeRate = previousDueResolved.length ? Math.round((previousOnTimeCount / previousDueResolved.length) * 100) : 0;
  const previousCompletionHours = previousResolved.map(issue => (new Date(completedAtOf(issue)).getTime() - new Date(issue.createdAt).getTime()) / 3600000).filter(hours => hours >= 0);
  const previousAverageHours = previousCompletionHours.length ? previousCompletionHours.reduce((sum, hours) => sum + hours, 0) / previousCompletionHours.length : 0;
  const previousOverdueCount = insightRange === "all" ? 0 : issues.filter(issue => {
    const boundary = insightWindow.previousTo - 1;
    const created = new Date(issue.createdAt).getTime();
    const expected = issue.expected ? new Date(issue.expected).getTime() : Infinity;
    const completed = isCompleteStatus(issue.status) ? new Date(completedAtOf(issue)).getTime() : Infinity;
    return created <= boundary && expected < boundary && completed > boundary;
  }).length;
  const insightSampleSize = insightResolved.length + insightLogged.length;
  const insightConfidence = insightSampleSize >= 12 ? "Strong signal" : insightSampleSize >= 5 ? "Growing signal" : "Early signal";
  const insightHeadline = overdueCount ? `${overdueCount} overdue signal${overdueCount === 1 ? " needs" : "s need"} a decision` : missingEtaIssues.length ? `${missingEtaIssues.length} active item${missingEtaIssues.length === 1 ? " needs" : "s need"} an expectation` : "The queue is keeping its promises";
  const insightHeadlineCopy = overdueCount ? "Start with the oldest handoff, record the next move, and reset the date if the promise has changed." : missingEtaIssues.length ? "A date makes follow-through measurable and gives the work permission to leave your head." : "No active work is overdue. Preserve the rhythm by recording outcomes as work closes.";
  const insightDrilldownIssues = insightDrilldown === "completed" ? insightResolved : insightDrilldown === "on-time" ? insightDueResolved : insightDrilldown === "cycle" ? insightCompletedWithTime : insightDrilldown === "overdue" ? issues.filter(isOverdue) : [];
  const waitingIssues = issues.filter(issue => !isCompleteStatus(issue.status) && /waiting|blocked|pending|approval/i.test(issue.status));
  const staleIssues = issues.filter(issue => !isCompleteStatus(issue.status) && Date.now() - new Date(issue.updatedAt || issue.updates[issue.updates.length - 1]?.at || issue.createdAt).getTime() >= 3 * 86400000);
  const oldestActive = [...issues.filter(issue => !isCompleteStatus(issue.status))].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
  /* Kept for the hidden legacy Insights markup while the new focused surface replaces it. */
  const completedWithTime = resolvedIssues.filter(issue => issue.completedAt || issue.updates.length);
  const completionHours = completedWithTime.map(issue => (new Date(completedAtOf(issue)).getTime() - new Date(issue.createdAt).getTime()) / 3600000).filter(hours => hours >= 0);
  const averageHours = completionHours.length ? completionHours.reduce((sum, hours) => sum + hours, 0) / completionHours.length : 0;
  const dueResolved = resolvedIssues.filter(issue => issue.expected && (issue.completedAt || issue.updates.length));
  const onTimeCount = dueResolved.filter(issue => new Date(completedAtOf(issue)).getTime() <= new Date(issue.expected).getTime()).length;
  const onTimeRate = dueResolved.length ? Math.round((onTimeCount / dueResolved.length) * 100) : 0;
  const health = overdueCount > 0 || (dueResolved.length > 0 && onTimeRate < 80) ? "Needs improvement" : "Looking healthy";
  const appName = profile ? `${profile.name}'s Signal Petal` : "Signal Petal";
  const commandNeedle = commandQuery.trim().toLowerCase();
  const commandIssues = commandNeedle ? issues.filter(issue => `${issue.title} ${issue.owner} ${issue.status}`.toLowerCase().includes(commandNeedle)).slice(0, 5) : [];
  /* Reflections are searched by their body but only ever shown by mood, title and date —
     the same line the calendar draws. A locked diary contributes nothing. */
  const commandDiary = commandNeedle && !diaryLocked ? diaryEntries.filter(entry => `${entry.title} ${entry.text}`.toLowerCase().includes(commandNeedle)).slice(0, 4) : [];
  const commandActions = ([["create", "＋", "Log a new signal", "N"], ["focus", "✦", "Open Focus now", "F"], ["check-in", "◷", "Start daily check-in", "D"], ["insights", "◌", "Open actionable insights", "I"], ["review", "▦", "Open weekly review", "W"], ["settings", "⚙", "Open settings", "S"]] as const).filter(([, , label]) => !commandNeedle || label.toLowerCase().includes(commandNeedle));
  /* One flat list, so ↑ ↓ and ↵ have something to walk. The palette footer advertised
     those keys from the day it shipped and nothing had ever implemented them. */
  const commandItems: { key: string; group: string; icon: ReactNode; hint: string; label: string; run: () => void }[] = [
    ...commandActions.map(([id, icon, label, shortcut]) => ({ key: `action-${id}`, group: "QUICK ACTIONS", icon: icon === "✦" ? <Petal size={14}/> : icon, label, hint: shortcut, run: () => runCommand(id) })),
    ...commandIssues.map(issue => ({ key: `issue-${issue.id}`, group: "WORK ITEMS", icon: "↗", label: issue.title, hint: `${issue.owner} · ${issue.status}`, run: () => { setShowCommandPalette(false); openIssueDetail(issue.id); } })),
    ...commandDiary.map(entry => ({ key: `diary-${entry.id}`, group: "REFLECTIONS", icon: moods.find(mood => mood.value === entry.mood)?.symbol ?? "✎", label: entry.title || "Untitled reflection", hint: `${moodName(entry.mood)} · ${dateLabel(entry.at)}`, run: () => { setShowCommandPalette(false); setOpenDiaryId(entry.id); } })),
  ];
  // Clamped in render rather than reset from an effect, so a shrinking list can never point past its end.
  const commandCursor = commandItems.length ? Math.min(commandIndex, commandItems.length - 1) : 0;
  function walkCommands(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); setCommandIndex(index => Math.min(index + 1, Math.max(0, commandItems.length - 1))); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setCommandIndex(index => Math.max(0, index - 1)); }
    else if (event.key === "Enter") { event.preventDefault(); commandItems[commandCursor]?.run(); }
  }
  const completionLabel = statuses.find(isCompleteStatus) || "Resolved";
  const queueTitle = filter === "Mine" ? metricFocus === "mine-open" ? "My open actions" : metricFocus === "mine-overdue" ? "My overdue actions" : metricFocus === "mine-resolved" ? `My ${completionLabel.toLowerCase()} actions` : "All my actions" : filter === "Overdue" ? metricFocus === "attention-oldest" ? "Oldest delayed item" : metricFocus === "attention-owners" ? "Overdue work by owner" : metricFocus === "attention-first" ? "First move to make" : "All overdue work" : metricFocus === "home-total" ? "All tasks" : metricFocus === "home-resolved" ? completionLabel : metricFocus === "home-overdue" ? "Needs attention" : "Open work";
  const statusStyle = (status: Status) => ({ "--status-color": statusColors[status] || "#7a5aa6" } as CSSProperties);

  function updateIssue(patch: Partial<Issue>) {
    if (!active) return;
    const updatedAt = new Date().toISOString();
    const justCompleted = Boolean(patch.status && isCompleteStatus(patch.status) && !isCompleteStatus(active.status));
    const completedAt = justCompleted ? updatedAt : patch.status && !isCompleteStatus(patch.status) ? undefined : active.completedAt;
    if (justCompleted) setWin({ title: active.title, span: spanLabel(active.createdAt, updatedAt) });
    setIssues(items => items.map(i => i.id === active.id ? { ...i, ...patch, updatedAt, completedAt } : i));
  }
  /* Title-casing a controlled input replaces the value React is holding, and React
     re-assigns input.value on commit, which parks the caret at the end. The transform
     never changes the string's length, so remembering the offset and putting it back
     after paint is enough — and it only fires when the case actually changed. */
  function onNameInput(event: ChangeEvent<HTMLInputElement>, set: (value: string) => void) {
    const field = event.currentTarget;
    const caret = field.selectionStart;
    const next = titleCaseName(field.value);
    set(next);
    if (caret !== null && next !== field.value) window.requestAnimationFrame(() => { if (document.activeElement === field) field.setSelectionRange(caret, caret); });
  }
  // Uncontrolled owner fields never round-trip through React, so the DOM value is edited directly.
  function onOwnerInput(event: ChangeEvent<HTMLInputElement>) {
    const field = event.currentTarget;
    const caret = field.selectionStart;
    const next = titleCaseName(field.value);
    if (next === field.value) return;
    field.value = next;
    if (caret !== null) field.setSelectionRange(caret, caret);
  }
  function openIssueDetail(issueId: string) { setActiveId(issueId); setFollowUpInput(""); setShowDetail(true); }
  function openInsightQueue(kind: "overdue" | "eta" | "outcome") {
    if (kind === "overdue") { setSection("dashboard"); setFilter("Overdue"); setMetricFocus("attention-overdue"); return; }
    const issue = (kind === "eta" ? missingEtaIssues : missingOutcomeIssues)[0];
    if (issue) openIssueDetail(issue.id);
  }
  function saveOperationalMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memoryIssue) return;
    const form = new FormData(event.currentTarget);
    const memory = { symptoms: String(form.get("symptoms") || "").trim(), rootCause: String(form.get("rootCause") || "").trim(), resolution: String(form.get("resolution") || "").trim(), learning: String(form.get("learning") || "").trim(), followUp: String(form.get("followUp") || "").trim() };
    setIssues(items => items.map(issue => issue.id === memoryIssue.id ? { ...issue, memory, outcome: issue.outcome || memory.resolution, updates: [...issue.updates, { id: crypto.randomUUID(), at: new Date().toISOString(), author: personalOwner, text: "Operational memory updated." }] } : issue));
    setMemoryIssueId("");
  }
  function openDailyCheckIn() {
    setCheckInCapacity(todayCheckIn?.capacity ?? "steady");
    setCheckInNote(todayCheckIn?.note ?? "");
    setCheckInParked(todayCheckIn?.parkedIssueIds ?? []);
    setCheckInWin(todayCheckIn?.win ?? "");
    setCheckInTomorrowMove(todayCheckIn?.tomorrowMove ?? "");
    setCheckInResumeAt(todayCheckIn?.resumeAt ?? checkInResumeMinimum);
    setCheckInStep(0);
    setCheckInShowAll(false);
    setShowCheckInHistory(false);
    setCheckInSaved(false);
    setShowDailyCheckIn(true);
  }
  function saveDailyCheckIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = new Date().toISOString();
    const parked = issues.filter(issue => checkInParked.includes(issue.id));
    const capacityLabel = checkInCapacity === "high" ? "strong" : checkInCapacity === "low" ? "limited" : "steady";
    const parts = [`Capacity feels ${capacityLabel}.`, `${completedToday.length} item${completedToday.length === 1 ? "" : "s"} completed today.`, `${overdueCount} item${overdueCount === 1 ? " is" : "s are"} overdue.`];
    if (parked.length) parts.push(`${parked.length} item${parked.length === 1 ? " is" : "s are"} intentionally waiting${checkInResumeAt ? ` until ${dateLabel(checkInResumeAt)}` : ""}: ${parked.map(issue => issue.title).join(", ")}.`);
    if (checkInWin.trim()) parts.push(`Today’s win: ${checkInWin.trim()}.`);
    if (checkInTomorrowMove.trim()) parts.push(`Tomorrow’s first move: ${checkInTomorrowMove.trim()}.`);
    if (checkInNote.trim()) parts.push(checkInNote.trim());
    const checkIn: DailyCheckIn = { id: todayCheckIn?.id ?? crypto.randomUUID(), at: now, capacity: checkInCapacity, note: checkInNote.trim(), parkedIssueIds: checkInParked, brief: parts.join(" "), win: checkInWin.trim(), tomorrowMove: checkInTomorrowMove.trim(), resumeAt: parked.length ? checkInResumeAt : undefined };
    setDailyCheckIns(items => [checkIn, ...items.filter(item => dayKey(item.at) !== todayKey)]);
    if (parked.length && checkInResumeAt) {
      setIssues(items => items.map(issue => checkInParked.includes(issue.id) ? {
        ...issue,
        expected: checkInResumeAt,
        updatedAt: now,
        updates: [...issue.updates, { id: crypto.randomUUID(), at: now, author: personalOwner, text: `Intentionally deferred during the daily check-in until ${dateLabel(checkInResumeAt)}.` }],
      } : issue));
    }
    setCheckInSaved(true);
    setCheckInStep(3);
  }
  function applyFocusAction(issue: Issue, patch: Partial<Issue>, updateText: string, confirmation: string) {
    const before = issue;
    const at = new Date().toISOString();
    setFocusRescheduleId("");
    setFocusCompletingId(issue.id);
    window.setTimeout(() => {
      setIssues(items => items.map(item => item.id === issue.id ? { ...item, ...patch, focusHandledAt: patch.focusHandledAt === undefined ? at : patch.focusHandledAt, updatedAt: at, updates: [...item.updates, { id: crypto.randomUUID(), at, author: personalOwner, text: updateText }] } : item));
      setFocusCompletingId("");
      offerUndo(confirmation, () => setIssues(items => items.map(item => item.id === before.id ? before : item)));
    }, 260);
  }
  function recordFocusFollowUp(issue: Issue) {
    const people = issue.followUpPeople.length ? issue.followUpPeople.join(", ") : issue.owner;
    applyFocusAction(issue, { focusHandledAt: new Date().toISOString() }, `Followed up with ${people}.`, `Follow-up recorded for “${issue.title}”.`);
  }
  function markFocusHandled(issue: Issue) {
    applyFocusAction(issue, { focusHandledAt: new Date().toISOString() }, "Reviewed in Focus now and handled for today.", `“${issue.title}” is handled for today.`);
  }
  function rescheduleFocus(issue: Issue, preset: "tomorrow" | "three-days" | "monday") {
    const next = new Date();
    if (preset === "tomorrow") { next.setDate(next.getDate() + 1); next.setHours(9, 0, 0, 0); }
    else if (preset === "three-days") { next.setDate(next.getDate() + 3); if (!issue.expected) next.setHours(9, 0, 0, 0); else { const prior = new Date(issue.expected); next.setHours(prior.getHours(), prior.getMinutes(), 0, 0); } }
    else { const days = (8 - next.getDay()) % 7 || 7; next.setDate(next.getDate() + days); next.setHours(9, 0, 0, 0); }
    const expected = toDateTimeInput(next);
    applyFocusAction(issue, { expected }, `Expected update rescheduled to ${dateLabel(expected)}.`, `“${issue.title}” moved to ${dateLabel(expected)}.`);
  }
  function changeOwner(value: string) {
    if (!active) return;
    const nextOwner = titleCaseName(value.trim());
    if (!nextOwner || nextOwner === active.owner) return;
    updateIssue({ owner: nextOwner, updates: [...active.updates, { id: crypto.randomUUID(), at: new Date().toISOString(), author: personalOwner, text: `Primary owner changed from ${active.owner} to ${nextOwner}.` }] });
  }
  function addActiveFollowUps() {
    if (!active) return;
    const existing = new Set(active.followUpPeople.map(person => person.toLowerCase()));
    const additions = peopleFromInput(followUpInput).filter(person => !existing.has(person.toLowerCase()) && person.toLowerCase() !== active.owner.toLowerCase());
    if (!additions.length) return setFollowUpInput("");
    updateIssue({ followUpPeople: [...active.followUpPeople, ...additions], updates: [...active.updates, { id: crypto.randomUUID(), at: new Date().toISOString(), author: personalOwner, text: `Added ${additions.join(", ")} as follow-up ${additions.length === 1 ? "person" : "people"}.` }] });
    setFollowUpInput("");
  }
  function removeActiveFollowUp(person: string) {
    if (!active) return;
    updateIssue({ followUpPeople: active.followUpPeople.filter(name => name !== person), updates: [...active.updates, { id: crypto.randomUUID(), at: new Date().toISOString(), author: personalOwner, text: `Removed ${person} from follow-up people.` }] });
  }
  function addNewFollowUps() {
    const existing = new Set(newFollowUps.map(person => person.toLowerCase()));
    const additions = peopleFromInput(newFollowUpInput).filter(person => !existing.has(person.toLowerCase()));
    if (additions.length) setNewFollowUps(items => [...items, ...additions]);
    setNewFollowUpInput("");
  }
  function openCreate() { setNewFollowUps([]); setNewFollowUpInput(""); setShowCreate(true); }
  function deleteIssue() {
    if (!active) return;
    const removed = active;
    const index = issues.findIndex(issue => issue.id === removed.id);
    const remaining = issues.filter(i => i.id !== removed.id);
    setIssues(remaining);
    setActiveId(remaining[0]?.id ?? "");
    setShowDeleteConfirm(false);
    setShowDetail(false);
    offerUndo(`Deleted “${removed.title}”.`, () => {
      setIssues(items => { const next = items.filter(item => item.id !== removed.id); next.splice(Math.max(0, index), 0, removed); return next; });
      setActiveId(removed.id);
    });
  }
  function openSettings() {
    setStatusDraft(statuses.map(name => ({
      id: crypto.randomUUID(), name, original: name, color: statusColors[name] || "#7a5aa6",
      kind: name === "New" ? "new" : name === "Ongoing" ? "ongoing" : isCompleteStatus(name) ? "terminal" : undefined,
    })));
    setStatusInput("");
    setStatusError("");
    setTransferCode(encodeTransfer({ version: 1, issues, statuses, statusColors, diaryEntries, diaryLog, dailyCheckIns }));
    setImportCode("");
    setTransferMessage("");
    setSection("settings");
  }
  function addStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = statusInput.trim();
    if (!name) return;
    if (statusDraft.some(item => item.name.trim().toLowerCase() === name.toLowerCase())) return setStatusError("That status already exists.");
    setStatusDraft(items => [...items.slice(0, -1), { id: crypto.randomUUID(), name, color: "#7a5aa6" }, items[items.length - 1]].filter(Boolean) as StatusDraft[]);
    setStatusInput("");
    setStatusError("");
  }
  function saveStatuses() {
    const names = statusDraft.map(item => item.name.trim());
    if (names.some(name => !name)) return setStatusError("Every status needs a name.");
    if (!names.includes("New") || !names.includes("Ongoing") || !names.some(isCompleteStatus)) return setStatusError("New, Ongoing, and Resolved or Closed are required.");
    if (new Set(names.map(name => name.toLowerCase())).size !== names.length) return setStatusError("Status names must be unique.");
    const renamed = new Map(statusDraft.filter(item => item.original).map(item => [item.original as string, item.name.trim()]));
    const keptOriginals = new Set(statusDraft.flatMap(item => item.original ? [item.original] : []));
    setIssues(items => items.map(issue => renamed.has(issue.status) ? { ...issue, status: renamed.get(issue.status) as Status } : statuses.includes(issue.status) && !keptOriginals.has(issue.status) ? { ...issue, status: "Ongoing", completedAt: undefined } : issue));
    setStatusColors(Object.fromEntries(statusDraft.map(item => [item.name.trim(), item.color])));
    setStatuses(names);
    setStatusError("");
  }
  async function enableDiaryLock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lockPass.length < 8) return setLockMessage("Use at least 8 characters.");
    if (lockPass !== lockConfirm) return setLockMessage("Those two passphrases do not match.");
    if (!lockUnderstood) return setLockMessage("Please confirm you understand there is no recovery.");
    setLockBusy(true);
    try {
      const salt = toB64(crypto.getRandomValues(new Uint8Array(16)));
      const key = await deriveDiaryKey(lockPass, fromB64(salt));
      localStorage.setItem("signal-petal-diary-vault", JSON.stringify(await sealDiary(key, salt, diaryEntries, diaryLog)));
      localStorage.removeItem("signal-petal-diary");
      localStorage.removeItem("signal-petal-diary-log");
      saltRef.current = salt;
      setDiaryKey(key);
      setLockOn(true);
      setDiaryLocked(false);
      setShowLockSetup(false);
      setLockMessage("The diary is locked. It will ask for the passphrase next time you open Signal Petal.");
    } catch { setLockMessage("The diary could not be locked. Nothing was changed."); }
    finally { setLockBusy(false); setLockPass(""); setLockConfirm(""); setLockUnderstood(false); }
  }
  async function unlockDiary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const vault = readStoredVault();
    if (!vault) return setLockMessage("There is nothing locked on this device.");
    setLockBusy(true);
    try {
      const key = await deriveDiaryKey(lockPass, fromB64(vault.salt));
      const opened = await openDiaryVault(key, vault);
      saltRef.current = vault.salt;
      setDiaryKey(key);
      setDiaryEntries(opened.entries);
      setDiaryLog(opened.log);
      setDiaryLocked(false);
      setLockMessage("");
    } catch { setLockMessage("That passphrase did not work."); }
    finally { setLockBusy(false); setLockPass(""); }
  }
  function lockDiaryNow() {
    setDiaryKey(null);
    setDiaryLocked(true);
    setDiaryEntries([]);
    setDiaryLog([]);
    setOpenDiaryId("");
    setEditingDiaryId("");
    setLockMessage("");
  }
  function removeDiaryLock() {
    if (diaryLocked) return setLockMessage("Unlock the diary first, then the lock can be removed.");
    localStorage.removeItem("signal-petal-diary-vault");
    localStorage.setItem("signal-petal-diary", JSON.stringify(diaryEntries));
    localStorage.setItem("signal-petal-diary-log", JSON.stringify(diaryLog));
    saltRef.current = "";
    setDiaryKey(null);
    setLockOn(false);
    setLockMessage("The lock is off. Your reflections are readable on this device again.");
  }
  async function copyReviewSummary() {
    if (!review || !reviewWeek) return;
    const lines = [review.isRecent ? `Recent 7 days · ${weekLabel(new Date(review.from))}` : `Week of ${weekLabel(reviewWeek)}`, ""];
    lines.push(`Shipped (${review.shipped.length})`);
    review.shipped.forEach(issue => lines.push(`  - ${issue.title}${issue.outcome ? ` — ${issue.outcome}` : ""}`));
    if (!review.shipped.length) lines.push("  - nothing closed out this week");
    lines.push("", `Still blocked or overdue (${review.stalled.length})`);
    review.stalled.forEach(issue => lines.push(`  - ${issue.title} — ${daysOverdue(issue)} day${daysOverdue(issue) === 1 ? "" : "s"} past its ETA${issue.followUpPeople.length ? `, waiting on ${issue.followUpPeople.join(", ")}` : ""}`));
    if (!review.stalled.length) lines.push("  - nothing is past its ETA");
    lines.push("", `New this week (${review.logged.length})`);
    review.logged.forEach(issue => lines.push(`  - ${issue.title}`));
    if (!review.logged.length) lines.push("  - nothing new logged");
    lines.push("", `Priorities for next week (${review.priorities.length})`);
    review.priorities.forEach(issue => lines.push(`  - ${issue.title} — ${issue.action || "define the next action"}`));
    if (review.parkedIssues.length) { lines.push("", `Intentionally deferred (${review.parkedIssues.length})`); review.parkedIssues.forEach(issue => lines.push(`  - ${issue.title}`)); }
    // Deliberately a count, never the words: this text gets pasted into a work chat.
    if (review.pages.length) lines.push("", `${review.pages.length} personal reflection${review.pages.length === 1 ? "" : "s"} written this week (not included here).`);
    try { await navigator.clipboard.writeText(lines.join("\n")); setReviewCopied("Summary copied — your diary text is not in it."); }
    catch { setReviewCopied("Copy was blocked by the browser. Select the summary and copy it manually."); }
  }
  function currentPayload(): TransferPayload {
    return {
      version: 2, issues, statuses, statusColors,
      // A locked diary is exported as ciphertext; an unlocked one as plain entries.
      diaryEntries: lockOn ? [] : diaryEntries,
      diaryLog: lockOn ? [] : diaryLog,
      diaryVault: lockOn ? readStoredVault() : null,
      dailyCheckIns,
      profile,
      settings: { theme, darkMode, reminderTime, diaryFont, diaryPaper },
      exportedAt: new Date().toISOString(),
    };
  }
  function markBackedUp() {
    const at = new Date().toISOString();
    setLastBackup(at);
    localStorage.setItem("signal-petal-last-backup", at);
  }
  function downloadBackup() {
    saveBackupFile(currentPayload());
    markBackedUp();
    setTransferMessage(`Saved ${backupFileName()} to your downloads.${lockOn ? " Your diary stays encrypted inside it." : ""}`);
  }
  async function restoreFromFile(event: FormEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      applyPayload(JSON.parse(await file.text()) as TransferPayload, file.name);
    } catch { setTransferMessage("That file could not be read as a Signal Petal backup."); }
    // Clear the input so choosing the same file twice still fires a change.
    input.value = "";
  }
  async function copyTransferCode() {
    try { await navigator.clipboard.writeText(transferCode); setTransferMessage("Backup code copied. Open Signal Petal at the other address and paste it there."); }
    catch { setTransferMessage("Copy was blocked by the browser. Select the code and copy it manually."); }
  }
  async function pasteTransferCode() {
    try { const code = await navigator.clipboard.readText(); setImportCode(code); setTransferMessage(code ? "Backup code pasted. Choose Import and merge to finish." : "The clipboard is empty."); }
    catch { setTransferMessage("Paste was blocked by the browser. Paste the backup code into the box manually."); }
  }
  function applyPayload(payload: TransferPayload, source: string) {
    if (!isValidPayload(payload)) {
      setTransferMessage(`${source} is not a Signal Petal backup.`);
      return;
    }
    const local = currentPayload();
    const diarySkipped = lockOn || !!payload.diaryVault;
    const safeIncoming = diarySkipped ? { ...payload, diaryEntries: local.diaryEntries, diaryLog: local.diaryLog, diaryVault: local.diaryVault } : payload;
    const { payload: merged, summary } = mergeTransferData(local, safeIncoming);
    setIssues(merged.issues);
    setStatuses(merged.statuses);
    setStatusColors(merged.statusColors);
    setDiaryEntries(merged.diaryEntries ?? []);
    setDiaryLog(merged.diaryLog ?? []);
    setDailyCheckIns(merged.dailyCheckIns ?? []);
    if (!profile && merged.profile) setProfile(merged.profile);
    setActiveId(merged.issues[0]?.id ?? "");
    setTransferCode(encodeTransfer(merged));
    const changes = [`${summary.addedTasks} task${summary.addedTasks === 1 ? "" : "s"} added`, `${summary.updatedTasks} updated`, `${summary.addedDiaryEntries} reflection${summary.addedDiaryEntries === 1 ? "" : "s"} added`, `${summary.updatedDiaryEntries} updated`, `${summary.addedCheckIns} check-in${summary.addedCheckIns === 1 ? "" : "s"} added`];
    setTransferMessage(`Merged ${source}: ${changes.join(", ")}.${diarySkipped ? " Encrypted diary data was left unchanged; unlock it before exporting if you want reflections included in a merge." : " Existing local records and preferences were kept."}`);
    setImportCode("");
  }
  function importTransfer() {
    try {
      applyPayload(decodeTransfer(importCode.trim()), "that backup code");
    } catch { setTransferMessage("That backup code is not valid. Copy it again from the other Signal Petal address."); }
  }
  function addUpdate(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const text = String(form.get("update") || "").trim(); if (!text || !active) return; updateIssue({ updates: [...active.updates, { id: crypto.randomUUID(), at: new Date().toISOString(), author: personalOwner, text }] }); event.currentTarget.reset(); }
  function addIssue(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const now = new Date().toISOString(); const title = String(form.get("title")); const details = String(form.get("details")); const updates = [{ id: crypto.randomUUID(), at: now, author: personalOwner, text: "Issue logged." }]; const issue: Issue = { id: crypto.randomUUID(), title, details, owner: titleCaseName(String(form.get("owner")).trim()) || personalOwner, action: String(form.get("action")), expected: String(form.get("expected")), createdAt: now, updatedAt: now, status: "New", outcome: "", followUpPeople: newFollowUps, updates }; setIssues(items => [issue, ...items]); setActiveId(issue.id); setNewFollowUps([]); setNewFollowUpInput(""); setShowCreate(false); setShowDetail(true); }
  function saveProfile(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const name = titleCaseName(String(form.get("name") || "").trim()); const role = String(form.get("role") || "").trim(); if (name && role) { setProfile({ name, role }); if (localStorage.getItem("signal-petal-onboarding-complete") !== "true") { setOnboardingStep(0); setShowOnboarding(true); } } }
  function finishOnboarding(action?: "create" | "focus" | "check-in") { localStorage.setItem("signal-petal-onboarding-complete", "true"); setShowOnboarding(false); if (action === "create") openCreate(); else if (action === "focus") { setSection("dashboard"); setFilter("All"); } else if (action === "check-in") openDailyCheckIn(); }
  function runCommand(command: "create" | "focus" | "check-in" | "review" | "insights" | "settings") { setShowCommandPalette(false); setCommandIndex(0); if (command === "create") openCreate(); else if (command === "focus") { setSection("dashboard"); setFilter("All"); setMetricFocus("home-total"); } else if (command === "check-in") openDailyCheckIn(); else if (command === "review") setSection("review"); else if (command === "insights") setSection("metrics"); else openSettings(); }
  async function requestNotificationPermission() {
    if (!("Notification" in window)) { setReminderFeedback("This browser does not support web notifications."); return "unsupported" as const; }
    const result = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    // Not every engine fires a permission "change" event after the prompt, so nudge the store.
    announcePermissionChange();
    if (result !== "granted") {
      setRemindersEnabled(false);
      setReminderFeedback(result === "denied"
        ? "Your browser is blocking notifications for this address. Open the icon beside the address bar, set Notifications to Allow, then reload this page."
        : "The permission prompt was dismissed. Choose “Allow” when it appears so reminders can reach you.");
    }
    return result;
  }
  async function toggleNotifications() {
    if (remindersOn) { setRemindersEnabled(false); setReminderFeedback("Reminders paused. Your check-in time is saved for when you switch them back on."); return; }
    if (await requestNotificationPermission() !== "granted") return;
    setRemindersEnabled(true);
    setReminderFeedback(describeDelivery(
      await sendReminderNotification("Signal Petal reminders are on", "You’ll receive task alerts and your daily check-in while Signal Petal is active.", `signal-petal-enabled-${Date.now()}`),
      "Setup notification",
    ));
  }
  async function testNotifications() {
    if (await requestNotificationPermission() !== "granted") return;
    setRemindersEnabled(true);
    setReminderFeedback(describeDelivery(
      await sendReminderNotification("Signal Petal test", "This is your reminder test. Notifications are ready on this device.", `signal-petal-test-${Date.now()}`),
      "Test notification",
    ));
  }
  const linkableIssues = [...issues].sort((a, b) => Number(isCompleteStatus(a.status)) - Number(isCompleteStatus(b.status)) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 12);
  function offerUndo(label: string, restore: () => void) { setUndo({ label, restore }); }
  function recordDiaryEvent(entry: { id: string; title: string; mood: Mood }, action: DiaryAction, detail: string, at = new Date().toISOString()) {
    setDiaryLog(events => [{ id: crypto.randomUUID(), entryId: entry.id, at, action, title: entry.title, mood: entry.mood, detail }, ...events]);
  }
  function addDiaryEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = diaryText.trim();
    if (!text) return;
    const at = new Date().toISOString();
    const suggestion = diarySuggestion(diaryMood, text, diaryTitle, diaryEntries, at);
    const entry: DiaryEntry = { id: crypto.randomUUID(), at, title: diaryTitle.trim(), text, mood: diaryMood, suggestion, issueIds: diaryLinks };
    setDiaryEntries(items => [entry, ...items]);
    recordDiaryEvent(entry, "created", `${wordCount(text)} word${wordCount(text) === 1 ? "" : "s"}`, at);
    setDiaryInsight(suggestion);
    setDiaryTitle("");
    setDiaryText("");
    setDiaryLinks([]);
  }
  function startDiaryEdit(entry: DiaryEntry) {
    setEditingDiaryId(entry.id);
    setEditDraft({ title: entry.title, text: entry.text, mood: entry.mood, issueIds: entry.issueIds ?? [] });
  }
  function cancelDiaryEdit() { setEditingDiaryId(""); }
  function saveDiaryEdit(event: FormEvent<HTMLFormElement>, entry: DiaryEntry, index: number) {
    event.preventDefault();
    const text = editDraft.text.trim();
    if (!text) return;
    const updatedAt = new Date().toISOString();
    const detail = describeDiaryChange(entry, { ...editDraft, text });
    // The reflection is rewritten from the new words, using the entries that preceded this one.
    const suggestion = diarySuggestion(editDraft.mood, text, editDraft.title, diaryEntries.slice(index + 1), entry.at);
    setDiaryEntries(items => items.map(item => item.id === entry.id ? { ...item, title: editDraft.title.trim(), text, mood: editDraft.mood, suggestion, updatedAt, issueIds: editDraft.issueIds } : item));
    recordDiaryEvent({ id: entry.id, title: editDraft.title.trim(), mood: editDraft.mood }, "edited", detail, updatedAt);
    setDiaryInsight(suggestion);
    setEditingDiaryId("");
  }
  function deleteDiaryEntry(entry: DiaryEntry) {
    const index = diaryEntries.findIndex(item => item.id === entry.id);
    const priorLog = diaryLog;
    setDiaryEntries(items => items.filter(item => item.id !== entry.id));
    recordDiaryEvent(entry, "deleted", `written ${dateLabel(entry.at)}`);
    if (editingDiaryId === entry.id) setEditingDiaryId("");
    if (openDiaryId === entry.id) setOpenDiaryId("");
    setConfirmDiaryDelete("");
    offerUndo(`Deleted “${entry.title || "Untitled reflection"}”.`, () => {
      // Put the page back where it was and drop the deletion from the log entirely.
      setDiaryEntries(items => { const next = items.filter(item => item.id !== entry.id); next.splice(Math.max(0, index), 0, entry); return next; });
      setDiaryLog(priorLog);
    });
  }

  return <main className={`theme-${theme} ${darkMode ? "dark-mode" : ""}`}>
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Petal size={26} label="Signal Petal"/></span><div><strong>{appName}</strong><small>{profile?.role || "Personal work companion"}</small></div></div>
      <nav><button className={section === "dashboard" ? "nav-active" : ""} onClick={() => { setSection("dashboard"); setFilter("All"); setMetricFocus("home-total"); }}>⌂ <span>Dashboard</span></button><button className={section === "calendar" ? "nav-active" : ""} onClick={() => setSection("calendar")}>▦ <span>Calendar</span></button><button className={section === "metrics" ? "nav-active" : ""} onClick={() => setSection("metrics")}>◌ <span>Insights</span></button><button className={section === "diary" ? "nav-active" : ""} onClick={() => setSection("diary")}>✎ <span>Diary</span></button><button className={section === "review" ? "nav-active" : ""} onClick={() => setSection("review")}>◷ <span>Weekly review</span></button><button className={section === "settings" ? "nav-active" : ""} onClick={openSettings}>⚙ <span>Settings</span></button></nav>
      <div className="sidebar-bottom"><p>Appearance, workflow, notifications, and data tools are in Settings.</p></div>
    </aside>
    <button className="command-trigger" type="button" onClick={() => { setCommandQuery(""); setCommandIndex(0); setShowCommandPalette(true); }} aria-label="Open command palette">⌘ K</button>
    <section className={`workspace ${section === "dashboard" ? `view-${dashboardView}` : ""}`}>
      <header><div><p className="eyebrow">{section === "dashboard" && filter === "Mine" ? "PERSONAL FOCUS" : section === "dashboard" && filter === "Overdue" ? "TRIAGE MODE" : section === "diary" ? "PRIVATE REFLECTIONS" : section === "settings" ? "WORKSPACE PREFERENCES" : profile ? `${profile.name.toUpperCase()}'S WORKSPACE` : "YOUR WORKSPACE"}</p><h1>{pageTitle}{titleMark && <Petal className="title-petal" size={24}/>}</h1><p className="subhead">{pageDescription}</p></div>{section !== "settings" && section !== "diary" && section !== "review" && <div className="header-actions"><button className="primary" type="button" onClick={openCreate}>+ Log/Track</button></div>}</header>
      {section === "dashboard" && <>{filter === "All" && <p className="day-line">{todayLine}</p>}<section className="metric-row dashboard-switcher" aria-label="Dashboard views"><button className={`metric-card ${filter === "All" && metricFocus === "home-total" ? "metric-selected" : ""}`} type="button" aria-pressed={filter === "All" && metricFocus === "home-total"} onClick={() => { setFilter("All"); setMetricFocus("home-total"); }}><span>All tasks</span><strong>{issues.length}</strong><small>Across every status and owner</small></button><button className={`metric-card personal ${filter === "Mine" ? "metric-selected" : ""}`} type="button" aria-pressed={filter === "Mine"} onClick={() => { setFilter("Mine"); setMetricFocus("mine-total"); }}><span>My actions</span><strong>{mine.length}</strong><small>Assigned directly to you</small></button><button className={`metric-card warm urgent ${filter === "Overdue" ? "metric-selected" : ""}`} type="button" aria-pressed={filter === "Overdue"} onClick={() => { setFilter("Overdue"); setMetricFocus("attention-overdue"); }}><span>Needs attention</span><strong>{overdueCount}</strong><small>{overdueCount ? "Past the expected update" : "Everything is on track"}</small></button><button className={`metric-card ${filter === "All" && metricFocus === "home-resolved" ? "metric-selected" : ""}`} type="button" aria-pressed={filter === "All" && metricFocus === "home-resolved"} onClick={() => { setFilter("All"); setMetricFocus("home-resolved"); }}><span>{completionLabel}</span><strong>{resolvedIssues.length}</strong><small>Outcomes documented</small></button><button className={`metric-card check-in-card ${todayCheckIn ? "good" : ""}`} type="button" onClick={openDailyCheckIn}><span>Next check-in</span><strong>{todayCheckIn ? "Done" : "Today"}</strong><small>{todayCheckIn ? "Daily brief completed" : `Daily wrap-up at ${reminderTime}`}</small></button></section><section className="metric-row dashboard-view-metrics">{filter === "Mine" ? <><button className={`metric-card personal ${metricFocus === "mine-open" ? "metric-selected" : ""}`} type="button" aria-pressed={metricFocus === "mine-open"} onClick={() => setMetricFocus("mine-open")}><span>My open actions</span><strong>{mineOpen.length}</strong><small>Assigned directly to you</small></button><button className={`metric-card ${mineOverdue.length ? "warm" : "good"} ${metricFocus === "mine-overdue" ? "metric-selected" : ""}`} type="button" aria-pressed={metricFocus === "mine-overdue"} onClick={() => setMetricFocus("mine-overdue")}><span>My overdue</span><strong>{mineOverdue.length}</strong><small>{mineOverdue.length ? "Needs your follow-up" : "Your work is on track"}</small></button><button className={`metric-card ${metricFocus === "mine-resolved" ? "metric-selected" : ""}`} type="button" aria-pressed={metricFocus === "mine-resolved"} onClick={() => setMetricFocus("mine-resolved")}><span>My {completionLabel.toLowerCase()}</span><strong>{mineResolved.length}</strong><small>Personal outcomes captured</small></button><button className={`metric-card ${metricFocus === "mine-total" ? "metric-selected" : ""}`} type="button" aria-pressed={metricFocus === "mine-total"} onClick={() => setMetricFocus("mine-total")}><span>My total</span><strong>{mine.length}</strong><small>Across every status</small></button></> : filter === "Overdue" ? <><button className={`metric-card urgent ${metricFocus === "attention-overdue" ? "metric-selected" : ""}`} type="button" aria-pressed={metricFocus === "attention-overdue"} onClick={() => setMetricFocus("attention-overdue")}><span>Overdue now</span><strong>{overdueCount}</strong><small>Past expected update</small></button><button className={`metric-card warm ${metricFocus === "attention-oldest" ? "metric-selected" : ""}`} type="button" aria-pressed={metricFocus === "attention-oldest"} onClick={() => setMetricFocus("attention-oldest")}><span>Oldest delay</span><strong>{attentionQueue.length ? daysOverdue(attentionQueue[0]) : 0}d</strong><small>{attentionQueue.length ? attentionQueue[0].title : "Nothing is overdue"}</small></button><button className={`metric-card ${metricFocus === "attention-owners" ? "metric-selected" : ""}`} type="button" aria-pressed={metricFocus === "attention-owners"} onClick={() => setMetricFocus("attention-owners")}><span>Owners affected</span><strong>{new Set(attentionQueue.map(i => i.owner)).size}</strong><small>People needing follow-up</small></button><button className={`metric-card ${metricFocus === "attention-first" ? "metric-selected" : ""}`} type="button" aria-pressed={metricFocus === "attention-first"} onClick={() => setMetricFocus("attention-first")}><span>First move</span><strong>{attentionQueue.length ? "Now" : "Clear"}</strong><small>{attentionQueue.length ? "Start with the oldest item" : "No triage needed"}</small></button></> : <><button className={`metric-card ${metricFocus === "home-open" ? "metric-selected" : ""}`} type="button" aria-pressed={metricFocus === "home-open"} onClick={() => setMetricFocus("home-open")}><span>Open work</span><strong>{openCount}</strong><small>Across your active issues</small></button><button className={`metric-card warm ${metricFocus === "home-overdue" ? "metric-selected" : ""}`} type="button" aria-pressed={metricFocus === "home-overdue"} onClick={() => setMetricFocus("home-overdue")}><span>Needs attention</span><strong>{overdueCount}</strong><small>{overdueCount ? "Past its expected update" : "Everything is on track"}</small></button><button className={`metric-card ${metricFocus === "home-resolved" ? "metric-selected" : ""}`} type="button" aria-pressed={metricFocus === "home-resolved"} onClick={() => setMetricFocus("home-resolved")}><span>{completionLabel}</span><strong>{resolvedIssues.length}</strong><small>Outcomes documented</small></button><article><span>Next check-in</span><strong>Today</strong><small>Daily wrap-up at 4:30 PM</small></article></>}</section>
      {filter === "All" && <section className="garden-card" aria-labelledby="garden-title"><div className="garden-copy"><p className="eyebrow">TODAY’S SIGNAL GARDEN</p><h2 id="garden-title">{gardenStage === 4 ? "Today is in full bloom" : gardenStage ? "Your day is taking root" : "Plant the first signal"}</h2><p>{gardenStage === 4 ? "You moved work, closed a loop, checked in, and made room to reflect." : "Each meaningful loop adds something—without points, pressure, or a perfect-day requirement."}</p><div className="garden-milestones"><span className={dailyMovesDone ? "is-grown" : ""}>Focus move</span><span className={completedToday.length ? "is-grown" : ""}>Closed loop</span><span className={todayCheckIn ? "is-grown" : ""}>Checked in</span><span className={wroteToday ? "is-grown" : ""}>Reflected</span></div></div><SignalGarden stage={gardenStage} label={`Today’s Signal Garden is at stage ${gardenStage} of 4`}/></section>}
      {filter === "All" && <section className={`focus-now ${focusRecommendations.length ? "has-focus" : "is-clear"} ${queueJustCleared ? "just-cleared" : ""}`} aria-labelledby="focus-now-title">
        <div className="focus-now-intro">{queueJustCleared && <span className="cleared-mark" aria-hidden="true">✓</span>}<p className="eyebrow">{queueJustCleared ? "QUEUE CLEAR" : "TODAY’S THREE MOVES"}</p><h2 id="focus-now-title">{focusRecommendations.length ? "The next moves that matter" : queueJustCleared ? "You cleared it." : "Your queue is in good shape"}</h2><div className="focus-progress" aria-label={`${dailyMovesDone} of 3 focus moves handled`}><span>{[0,1,2].map(step => <i className={step < dailyMovesDone ? "is-done" : ""} key={step}/>)}</span><strong>{dailyMovesDone} of 3 handled</strong></div><p>{focusRecommendations.length ? "Signal Petal ranked these by urgency and clarity, so you can move the queue without rereading everything." : queueJustCleared ? "Nothing overdue, nothing without a next move, and work actually left the queue today." : "Every active item has a clear next move and nothing is overdue."}</p>{queueJustCleared && <p className="cleared-note"><strong>{completedToday.length} closed today:</strong> {completedToday.slice(0, 3).map(issue => clip(issue.title, 34)).join(" · ")}{completedToday.length > 3 ? ` and ${completedToday.length - 3} more` : ""}</p>}</div>
        {focusRecommendations.length > 0 && <div className="focus-now-list">{focusRecommendations.map((recommendation, index) => <article className={`focus-item focus-${recommendation.kind} ${focusRescheduleId === recommendation.issue.id ? "is-rescheduling" : ""} ${focusCompletingId === recommendation.issue.id ? "is-completing" : ""}`} key={recommendation.issue.id}>
          <span className="focus-rank">{index + 1}</span><div className="focus-item-copy"><div className="focus-item-top"><span>{recommendation.kind === "overdue" ? "Overdue" : recommendation.kind === "missing-eta" ? "Needs an ETA" : "Needs a next action"}</span><small>{recommendation.issue.owner}</small></div><h3>{recommendation.issue.title}</h3><p><strong>{recommendation.reason}.</strong> {recommendation.move}</p></div>
          <div className="focus-actions"><button type="button" onClick={() => recordFocusFollowUp(recommendation.issue)}>✓ Followed up</button><button type="button" aria-expanded={focusRescheduleId === recommendation.issue.id} onClick={() => setFocusRescheduleId(id => id === recommendation.issue.id ? "" : recommendation.issue.id)}>◷ Reschedule</button><button type="button" onClick={() => markFocusHandled(recommendation.issue)}>Done for now</button><button className="focus-open" type="button" onClick={() => openIssueDetail(recommendation.issue.id)} aria-label={`Open ${recommendation.issue.title}`}>Open <span aria-hidden="true">→</span></button></div>
          {focusRescheduleId === recommendation.issue.id && <div className="focus-reschedule" aria-label={`Reschedule ${recommendation.issue.title}`}><span>Bring this back:</span><button type="button" onClick={() => rescheduleFocus(recommendation.issue, "tomorrow")}>Tomorrow · 9:00 AM</button><button type="button" onClick={() => rescheduleFocus(recommendation.issue, "three-days")}>In 3 days</button><button type="button" onClick={() => rescheduleFocus(recommendation.issue, "monday")}>Next Monday · 9:00 AM</button><button className="focus-cancel" type="button" onClick={() => setFocusRescheduleId("")} aria-label="Cancel rescheduling">×</button></div>}
        </article>)}</div>}
        {focusRecommendations.length > 0 && <button className="focus-all" type="button" onClick={() => { if (overdueCount) { setFilter("Overdue"); setMetricFocus("attention-overdue"); } else openIssueDetail(focusRecommendations[0].issue.id); }}>{overdueCount ? "Open triage queue" : "Review first signal"} <span aria-hidden="true">→</span></button>}
      </section>}
      <section className="content-grid">
        <div className={`issue-panel issue-panel-${dashboardView}`}><div className="section-heading"><div><p className="eyebrow">{filter === "Mine" ? "PERSONAL QUEUE" : filter === "Overdue" ? "PRIORITY QUEUE" : "WORK QUEUE"}</p><h2>{queueTitle}</h2></div><div className="filter-pills">{(["All", "Mine", "Overdue"] as const).map(f => <button className={filter === f ? "selected" : ""} onClick={() => { setFilter(f); setMetricFocus(f === "Mine" ? "mine-total" : f === "Overdue" ? "attention-overdue" : "home-open"); }} key={f}>{f === "All" ? "Open" : f}</button>)}</div></div><div className="task-search"><span aria-hidden="true">⌕</span><input type="search" aria-label="Search tasks" placeholder="Search tasks, owners, statuses, or follow-up people…" value={searchQuery} onChange={event => setSearchQuery(event.target.value)}/>{searchQuery && <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear task search">Clear</button>}<small aria-live="polite">{visible.length} {visible.length === 1 ? "result" : "results"}</small></div><div className="issue-list">{visible.map(issue => <button key={issue.id} className={`issue-card ${issue.id === activeId ? "active" : ""}`} onClick={() => openIssueDetail(issue.id)}><div><span className={statusClass(issue.status)} style={statusStyle(issue.status)}>{issue.status}</span><h3>{issue.title}</h3><p>{issue.action || issue.details}</p>{issue.followUpPeople.length > 0 && <small className="issue-card-people">Follow up: {issue.followUpPeople.join(", ")}</small>}</div><div className="issue-meta"><span className={isOverdue(issue) ? "due overdue" : "due"}>{isOverdue(issue) ? "Overdue · " : "Due · "}{dateLabel(issue.expected)}</span><span>{issue.owner}</span>{issue.followUpPeople.length > 0 && <em>{issue.followUpPeople.length} follow-up {issue.followUpPeople.length === 1 ? "person" : "people"}</em>}</div></button>)}{!visible.length && <div className="empty">{searchQuery.trim() ? `No tasks match “${searchQuery.trim()}”.` : filter === "Mine" ? "No actions match this selection." : filter === "Overdue" || metricFocus === "home-overdue" ? "Nothing needs attention—every active item is on track." : metricFocus === "home-resolved" ? `No ${completionLabel.toLowerCase()} work yet.` : "No open work—your queue is looking beautifully clear."}</div>}</div></div>
        <aside className={`report-panel report-${dashboardView}`}>{filter === "Mine" ? <><p className="eyebrow">PERSONAL SNAPSHOT</p><h2>Your workload</h2><div className="focus-stat"><span>In progress</span><strong>{mineOpen.length}</strong></div><div className="focus-stat"><span>Overdue</span><strong>{mineOverdue.length}</strong></div><div className="focus-stat"><span>Completed</span><strong>{mineResolved.length}</strong></div><div className="report-divider"/><p className="eyebrow">FOCUS PROMPT</p><p className="report-note">Choose one clear next action, add an update, and keep your personal queue moving.</p></> : filter === "Overdue" ? <><p className="eyebrow">TRIAGE ORDER</p><h2>Oldest first</h2><div className="triage-list">{attentionQueue.slice(0, 3).map((issue, index) => <button key={issue.id} onClick={() => { setActiveId(issue.id); setShowDetail(true); }}><em>{index + 1}</em><span><strong>{issue.title}</strong><small>{issue.owner} · {dateLabel(issue.expected)}</small></span></button>)}{!attentionQueue.length && <p className="report-note">Your priority queue is clear.</p>}</div><div className="report-divider"/><p className="eyebrow">RECOVERY RHYTHM</p><p className="report-note">Confirm the owner, record the next step, and reset the expected update.</p></> : <><p className="eyebrow">AT A GLANCE</p><h2>Workload by owner</h2>{ownerReport.map(([owner,count]) => <div className="owner" key={owner}><div className="avatar">{owner.charAt(0)}</div><span>{owner}</span><strong>{count}</strong></div>)}<div className="report-divider"/><p className="eyebrow">WEEKLY OUTCOMES</p><p className="report-note">{completionLabel} work is retained with its outcome, so your weekly review writes itself.</p></>}</aside>
      </section>
      </>}
      {section === "calendar" && <section className="calendar-layout"><div className="calendar-panel"><div className="calendar-toolbar"><button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>‹</button><h2>{monthTitle}</h2><button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>›</button></div><div className="weekdays">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(day => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{calendarDays.map((day, index) => { if (day < 1) return <div className="calendar-day blank" key={index}/>; const key = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth()+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`; const logged = issues.filter(i => dayKey(i.createdAt) === key); const reflections = diaryLog.filter(event => dayKey(event.at) === key); const dayMood = moodByDay.get(key); return <button key={key} className={`calendar-day ${key === selectedDay ? "chosen" : ""} ${dayMood ? `has-mood mood-${dayMood}` : ""}`} onClick={() => setSelectedDay(key)}><span>{day}</span>{(logged.length > 0 || reflections.length > 0) && <div className="day-counts">{logged.length > 0 && <em>{logged.length} logged</em>}{reflections.length > 0 && <em className="diary-count">✎ {reflections.length}</em>}</div>}{logged.slice(0, reflections.length ? 1 : 2).map(i => <small key={i.id}>{i.title}</small>)}{reflections.slice(0, 1).map(event => <small className="diary-line" key={event.id}>{moodName(event.mood)} · {event.title || "Untitled reflection"}</small>)}</button>; })}</div>{moodByDay.size > 0 && <div className="calendar-legend"><span>HOW THE DAYS FELT</span>{moods.map(mood => <span className={`legend-dot legend-${mood.value}`} key={mood.value}><i aria-hidden="true"/>{mood.label}</span>)}</div>}</div><aside className="day-summary"><p className="eyebrow">DAY SUMMARY</p><h2>{new Intl.DateTimeFormat("en", { weekday:"long", month:"long", day:"numeric" }).format(new Date(`${selectedDay}T12:00`))}</h2><p className="summary-count">{selectedIssues.length} issue{selectedIssues.length === 1 ? "" : "s"} logged{selectedDiary.length ? ` · ${selectedDiary.length} diary ${selectedDiary.length === 1 ? "entry" : "entries"}` : ""}</p>{selectedDiary.length > 0 && <div className="day-diary"><p className="eyebrow">DIARY</p>{selectedDiary.map(event => <button key={event.id} className={`day-diary-entry action-${event.action}`} onClick={() => setSection("diary")}><span className={`mood-tag mood-${event.mood}`}>{moods.find(item => item.value === event.mood)?.symbol} {moodName(event.mood)}</span><strong>{event.title || "Untitled reflection"}</strong><small>{diaryEventLabel(event.action)} · {dateLabel(event.at)}{event.detail ? ` · ${event.detail}` : ""}</small></button>)}</div>}<div className="day-issues">{selectedIssues.map(issue => <button key={issue.id} onClick={() => { setActiveId(issue.id); setShowDetail(true); }}><span className={statusClass(issue.status)} style={statusStyle(issue.status)}>{issue.status}</span><strong>{issue.title}</strong><small>{issue.owner} · {dateLabel(issue.createdAt)}</small></button>)}{!selectedIssues.length && !selectedDiary.length && <p className="empty">Nothing logged for this day.</p>}</div></aside></section>}
      {section === "metrics" && <section className="insights"><div className={`health-card ${health === "Looking healthy" ? "healthy" : "watch"}`}><div><p className="eyebrow">OVERALL SIGNAL</p><h2>{health}</h2><p>{health === "Looking healthy" ? "Follow-ups and completion timing are in a good place." : "A few signals need attention—start with overdue items and slow handoffs."}</p></div><strong>{health === "Looking healthy" ? <Petal size={38}/> : "!"}</strong></div><div className="metric-row insight-metrics"><article><span>Completion rate</span><strong>{issues.length ? Math.round((resolvedIssues.length / issues.length) * 100) : 0}%</strong><small>{resolvedIssues.length} of {issues.length} issues completed</small></article><article className={onTimeRate >= 80 ? "good" : "warm"}><span>On-time completion</span><strong>{dueResolved.length ? `${onTimeRate}%` : "—"}</strong><small>{dueResolved.length ? `${onTimeCount} completed by their ETA` : "Set ETAs to begin tracking"}</small></article><article><span>Avg. completion time</span><strong>{completionHours.length ? `${averageHours.toFixed(1)}h` : "—"}</strong><small>{completionHours.length ? "From logged to completed" : "Complete work to measure"}</small></article><article className={overdueCount ? "warm" : "good"}><span>Currently overdue</span><strong>{overdueCount}</strong><small>{overdueCount ? "Follow up to get back on track" : "No active work is overdue"}</small></article></div><div className="insight-detail"><article><p className="eyebrow">WHAT THIS MEANS</p><h2>Completion timing</h2><div className="progress-track"><span style={{ width: `${Math.max(8, onTimeRate)}%` }}/></div><p>{dueResolved.length ? `${onTimeRate}% of work with a logged ETA was completed on time. ${onTimeRate >= 80 ? "That’s a solid operating rhythm." : "Aim for 80% or higher by checking in before ETAs slip."}` : "Once you complete issues with expected completion times, you’ll see a timing trend here."}</p></article><article><p className="eyebrow">FOCUS NEXT</p><h2>Recommended actions</h2><ul><li>{overdueCount ? `Follow up on ${overdueCount} overdue issue${overdueCount === 1 ? "" : "s"}.` : "Keep your current follow-up rhythm."}</li><li>Capture an outcome whenever work is completed.</li><li>Set an expected update time for clearer delivery signals.</li></ul></article></div>
        <section className="insight-action-center" aria-labelledby="insight-action-title"><div className="insight-action-head"><div><p className="eyebrow">ACT ON THE SIGNAL</p><h2 id="insight-action-title">Turn the gaps into next moves</h2><p>Each action opens the exact queue or record that needs attention.</p></div><span>{overdueCount + missingEtaIssues.length + missingOutcomeIssues.length} open recommendation{overdueCount + missingEtaIssues.length + missingOutcomeIssues.length === 1 ? "" : "s"}</span></div><div className="insight-action-list"><article className={overdueCount ? "needs-action" : "is-complete"}><span className="insight-action-mark">{overdueCount ? "!" : "✓"}</span><div><strong>Recover overdue work</strong><p>{overdueCount ? `${overdueCount} active item${overdueCount === 1 ? " is" : "s are"} past the expected update.` : "No active work is overdue."}</p></div>{overdueCount > 0 && <button type="button" onClick={() => openInsightQueue("overdue")}>Work the queue →</button>}</article><article className={missingEtaIssues.length ? "needs-action" : "is-complete"}><span className="insight-action-mark">{missingEtaIssues.length ? "◷" : "✓"}</span><div><strong>Set missing expectations</strong><p>{missingEtaIssues.length ? `${missingEtaIssues.length} active item${missingEtaIssues.length === 1 ? " has" : "s have"} no ETA.` : "Every active item has an expected update."}</p></div>{missingEtaIssues.length > 0 && <button type="button" onClick={() => openInsightQueue("eta")}>Set the first ETA →</button>}</article><article className={missingOutcomeIssues.length ? "needs-action" : "is-complete"}><span className="insight-action-mark">{missingOutcomeIssues.length ? "✎" : "✓"}</span><div><strong>Preserve the outcome</strong><p>{missingOutcomeIssues.length ? `${missingOutcomeIssues.length} completed item${missingOutcomeIssues.length === 1 ? " is" : "s are"} missing the result or learning.` : "Every completed item has an outcome."}</p></div>{missingOutcomeIssues.length > 0 && <button type="button" onClick={() => openInsightQueue("outcome")}>Capture the first outcome →</button>}</article></div></section>
        <section className="memory-center"><div className="memory-head"><div><p className="eyebrow">OPERATIONAL MEMORY</p><h2>Keep the fix, not just the closure</h2><p>Structured records make past incidents useful when a similar signal returns.</p></div><span>{resolvedIssues.length - incompleteMemories.length}/{resolvedIssues.length} complete</span></div>{resolvedIssues.length ? <div className="memory-list">{resolvedIssues.slice(0,6).map(issue => <article key={issue.id}><div><strong>{issue.title}</strong><p>{issue.memory?.resolution || issue.outcome || "The resolution has not been captured yet."}</p></div><button type="button" onClick={() => setMemoryIssueId(issue.id)}>{issue.memory?.resolution && issue.memory?.learning ? "Review memory" : "Capture memory"} →</button></article>)}</div> : <p className="memory-empty">Resolve an issue and its operational memory card will appear here.</p>}</section>
        <div className="diary-insights">
          <div className="diary-insights-head"><div><p className="eyebrow">FROM YOUR DIARY</p><h2>The other half of the story<Petal className="title-petal" size={19}/></h2><p>Patterns from your own words. Everything here is worked out on this device.</p></div>{diaryInsights && <button className="secondary" type="button" onClick={() => setSection("diary")}>Open the diary</button>}</div>
          {diaryLocked
            ? <div className="diary-insights-empty"><span><Petal size={26}/></span><h3>Your diary is locked.</h3><p>Unlock it on the Diary page and these patterns come back with it.</p></div>
            : !diaryInsights
            ? <div className="diary-insights-empty"><span>✎</span><h3>Nothing to read yet.</h3><p>Write a few reflections and this fills up with your streaks, your moods, and the words you keep reaching for.</p></div>
            : <>
              <div className="metric-row insight-metrics">
                <article><span>Reflections</span><strong>{diaryInsights.entries.length}</strong><small>across {diaryInsights.daysWritten} day{diaryInsights.daysWritten === 1 ? "" : "s"}</small></article>
                <article className={diaryInsights.currentStreak > 1 ? "good" : ""}><span>Writing streak</span><strong>{diaryInsights.currentStreak || "—"}</strong><small>{diaryInsights.currentStreak > 1 ? `${diaryInsights.currentStreak} days running · best ${diaryInsights.longestStreak}` : `Longest run so far: ${diaryInsights.longestStreak} day${diaryInsights.longestStreak === 1 ? "" : "s"}`}</small></article>
                <article><span>Words written</span><strong>{diaryInsights.totalWords.toLocaleString()}</strong><small>{diaryInsights.averageWords} a page · longest {diaryInsights.longestWords}</small></article>
                <article><span>Pages revisited</span><strong>{diaryInsights.revisited}</strong><small>{diaryInsights.revisited ? "you went back and reworked them" : "no page has needed a second pass"}</small></article>
              </div>

              <article className="insight-panel mood-ribbon-card">
                <div className="insight-panel-head"><div><p className="eyebrow">MOOD RIBBON</p><h3>Your last {diaryInsights.ribbon.length} page{diaryInsights.ribbon.length === 1 ? "" : "s"}, oldest first</h3></div><span className={`mood-tag mood-${diaryInsights.topMood.value}`}>{diaryInsights.topMood.symbol} mostly {diaryInsights.topMood.label.toLowerCase()}</span></div>
                <div className="mood-ribbon">{diaryInsights.ribbon.map(entry => <button key={entry.id} type="button" className={`ribbon-block mood-${entry.mood}`} title={`${moodName(entry.mood)} · ${dateLabel(entry.at)}${entry.title ? ` · ${entry.title}` : ""}`} aria-label={`${moodName(entry.mood)} on ${dateLabel(entry.at)}`} onClick={() => { setOpenDiaryId(entry.id); }}/>)}</div>
                <div className="mood-mix">{diaryInsights.moodCounts.filter(mood => mood.count).map(mood => <span key={mood.value} className={`mood-tag mood-${mood.value}`}>{mood.symbol} {mood.label} · {Math.round((mood.count / diaryInsights.entries.length) * 100)}%</span>)}</div>
              </article>

              <div className="insight-detail">
                <article className="insight-panel">
                  <p className="eyebrow">WHAT KEEPS COMING UP</p><h3>Recurring threads</h3>
                  {diaryInsights.themes.length
                    ? <ul className="theme-bars">{diaryInsights.themes.map(theme => <li key={theme.label}><span className="theme-name">{theme.label}</span><span className="theme-track"><span style={{ width: `${Math.max(10, Math.round((theme.count / diaryInsights.entries.length) * 100))}%` }}/></span><em>{theme.count}</em></li>)}</ul>
                    : <p>No thread has repeated yet — write a few more and the pattern will show.</p>}
                  <p className="insight-note">{(() => {
                    if (!diaryInsights.themes.length) return "Threads are counted across every page, so they sharpen as you write.";
                    const lead = diaryInsights.themes[0];
                    const share = Math.round((lead.count / diaryInsights.entries.length) * 100);
                    const name = `${lead.label.charAt(0).toUpperCase()}${lead.label.slice(1)}`;
                    return share >= 30
                      ? `${name} is the strongest thread — ${lead.count} of your ${diaryInsights.entries.length} pages. At that rate it has stopped being a bad week and started being a condition worth changing on purpose.`
                      : `${name} leads so far, in ${lead.count} of ${diaryInsights.entries.length} pages. Early days — but that is the thread to watch.`;
                  })()}</p>
                </article>

                <article className="insight-panel">
                  <p className="eyebrow">WHEN YOU WRITE</p><h3>{diaryInsights.favouriteTime.label === "Late night" ? "A night writer ☾" : diaryInsights.favouriteTime.label === "Early" ? "An early writer ☀" : `Mostly ${diaryInsights.favouriteTime.label.toLowerCase()}`}</h3>
                  <ul className="clock-bars">{diaryInsights.clock.map(part => <li key={part.id} className={part.id === diaryInsights.favouriteTime.id ? "is-top" : ""}><span className="theme-name">{part.label}<small>{part.note}</small></span><span className="theme-track"><span style={{ width: `${part.count ? Math.max(8, Math.round((part.count / diaryInsights.entries.length) * 100)) : 0}%` }}/></span><em>{part.count}</em></li>)}</ul>
                  {diaryInsights.brightestDay && <p className="insight-note">{diaryInsights.brightestDay.name === diaryInsights.heaviestDay?.name ? `Every page so far lands on a ${diaryInsights.brightestDay.name}.` : `${diaryInsights.brightestDay.name}s read lightest; ${diaryInsights.heaviestDay?.name}s carry the most weight.`}</p>}
                </article>
              </div>

              <div className="insight-detail">
                <article className="insight-panel">
                  <p className="eyebrow">YOUR WORDS</p><h3>What you keep reaching for</h3>
                  {diaryInsights.words.length
                    ? <div className="word-cloud">{diaryInsights.words.map(([word, count], index) => <span key={word} className="word-chip" style={{ fontSize: `${Math.round(22 - index * 1.6)}px` }} title={`${count} times`}>{word}</span>)}</div>
                    : <p>Once a word shows up on more than one page it will appear here.</p>}
                </article>

                <article className="insight-panel">
                  <p className="eyebrow">DIARY &amp; THE QUEUE</p><h3>{diaryInsights.crossover ? "Busy days versus quiet ones" : diaryInsights.lift ? "Your biggest lift" : "Still gathering"}</h3>
                  {diaryInsights.crossover
                    ? <><div className="crossover"><div><strong>{diaryInsights.crossover.busy}%</strong><span>heavy on days you logged 3+ tasks</span><small>{diaryInsights.crossover.busyCount} pages</small></div><div><strong>{diaryInsights.crossover.quiet}%</strong><span>heavy on quieter days</span><small>{diaryInsights.crossover.quietCount} pages</small></div></div><p className="insight-note">{diaryInsights.crossover.busy - diaryInsights.crossover.quiet >= 15 ? "A busy queue and a heavy page go together for you. That is a workload signal, not a character flaw." : diaryInsights.crossover.quiet - diaryInsights.crossover.busy >= 15 ? "Curiously, the quieter days read heavier. Whatever is weighing on you is not simply the volume of work." : "Your mood holds fairly steady whether the queue is full or quiet."}</p></>
                    : diaryInsights.lift
                      ? <p className="insight-note">Between {dateLabel(diaryInsights.lift.from.at)} and {dateLabel(diaryInsights.lift.to.at)} you moved from {moodName(diaryInsights.lift.from.mood).toLowerCase()} to {moodName(diaryInsights.lift.to.mood).toLowerCase()}{diaryInsights.lift.to.title ? ` on “${diaryInsights.lift.to.title}”` : ""}. Worth knowing what changed — that is the part you can repeat.</p>
                      : <p className="insight-note">Keep writing. Once there are a few pages either side of a busy day, this compares how the full days read against the quiet ones.</p>}
                </article>
              </div>
            </>}
        </div></section>}
      {section === "metrics" && <section className="insights-2026">
        <div className="insights-toolbar">
          <div className="insight-section-tabs" role="tablist" aria-label="Insights sections">
            {([['work','Work signals'],['memory','Operational memory'],['rhythm','Personal rhythm']] as const).map(([value,label]) => <button key={value} type="button" role="tab" aria-selected={insightSection === value} className={insightSection === value ? "is-selected" : ""} onClick={() => { setInsightSection(value); setInsightDrilldown(""); }}>{label}</button>)}
          </div>
          {insightSection === "work" && <div className="insight-range" aria-label="Insight time range">{([['7','7 days'],['30','30 days'],['90','90 days'],['all','All time']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={insightRange === value} className={insightRange === value ? "is-selected" : ""} onClick={() => { setInsightRange(value); setInsightDrilldown(""); }}>{label}</button>)}</div>}
        </div>

        {insightSection === "work" && <>
          <article className={`signal-headline ${overdueCount ? "watch" : "healthy"}`}>
            <div><p className="eyebrow">THE SIGNAL WORTH ACTING ON</p><h2>{insightHeadline}</h2><p>{insightHeadlineCopy}</p></div>
            <button type="button" onClick={() => overdueCount ? openInsightQueue("overdue") : missingEtaIssues.length ? openInsightQueue("eta") : setSection("dashboard")}>{overdueCount ? "Work the oldest →" : missingEtaIssues.length ? "Set an expectation →" : "Open the queue →"}</button>
          </article>
          <div className="insight-context"><span>{insightWindow.label}</span><span>{insightConfidence} · {insightSampleSize} work event{insightSampleSize === 1 ? "" : "s"}</span></div>
          <div className="metric-row insight-metrics insight-metric-buttons">
            <button className={`metric-card ${insightDrilldown === "completed" ? "metric-selected" : ""}`} type="button" onClick={() => setInsightDrilldown(current => current === "completed" ? "" : "completed")}><span>Completed</span><strong>{insightResolved.length}</strong><small>{insightRange === "all" ? `${resolvedIssues.length} recorded outcomes` : `${insightResolved.length - previousResolved.length >= 0 ? "+" : ""}${insightResolved.length - previousResolved.length} versus prior period`}</small></button>
            <button className={`metric-card ${insightOnTimeRate >= 80 ? "good" : "warm"} ${insightDrilldown === "on-time" ? "metric-selected" : ""}`} type="button" onClick={() => setInsightDrilldown(current => current === "on-time" ? "" : "on-time")}><span>On-time completion</span><strong>{insightDueResolved.length ? `${insightOnTimeRate}%` : "—"}</strong><small>{insightRange === "all" || !previousDueResolved.length ? `${insightOnTimeCount} of ${insightDueResolved.length} by ETA` : `${insightOnTimeRate - previousOnTimeRate >= 0 ? "+" : ""}${insightOnTimeRate - previousOnTimeRate} points versus prior`}</small></button>
            <button className={`metric-card ${insightDrilldown === "cycle" ? "metric-selected" : ""}`} type="button" onClick={() => setInsightDrilldown(current => current === "cycle" ? "" : "cycle")}><span>Average cycle time</span><strong>{insightCompletionHours.length ? `${insightAverageHours.toFixed(1)}h` : "—"}</strong><small>{insightRange === "all" || !previousCompletionHours.length ? "From logged to completed" : `${Math.abs(insightAverageHours - previousAverageHours).toFixed(1)}h ${insightAverageHours <= previousAverageHours ? "faster" : "slower"} than prior`}</small></button>
            <button className={`metric-card ${overdueCount ? "warm" : "good"} ${insightDrilldown === "overdue" ? "metric-selected" : ""}`} type="button" onClick={() => setInsightDrilldown(current => current === "overdue" ? "" : "overdue")}><span>Overdue now</span><strong>{overdueCount}</strong><small>{insightRange === "all" ? "Current active queue" : `${overdueCount - previousOverdueCount >= 0 ? "+" : ""}${overdueCount - previousOverdueCount} versus prior boundary`}</small></button>
          </div>
          {insightDrilldown && <section className="insight-drilldown" aria-live="polite"><div><p className="eyebrow">CONTRIBUTING WORK</p><h3>{insightDrilldown === "completed" ? "Completed in this period" : insightDrilldown === "on-time" ? "Work with a tracked ETA" : insightDrilldown === "cycle" ? "Cycle-time records" : "Currently overdue"}</h3></div>{insightDrilldownIssues.length ? <div>{insightDrilldownIssues.map(issue => <button key={issue.id} type="button" onClick={() => openIssueDetail(issue.id)}><span><strong>{issue.title}</strong><small>{issue.owner} · {isCompleteStatus(issue.status) ? dateLabel(completedAtOf(issue)) : `${daysOverdue(issue)}d overdue`}</small></span><b>Open →</b></button>)}</div> : <p>No records contribute to this metric yet.</p>}</section>}

          <section className="bottleneck-center">
            <div className="memory-head"><div><p className="eyebrow">WHERE WORK WAITS</p><h2>Find the bottleneck, not the blame</h2><p>These are live queue conditions, independent of the selected reporting period.</p></div><span>{waitingIssues.length + staleIssues.length} waiting signals</span></div>
            <div className="bottleneck-grid">
              <button type="button" disabled={!oldestActive} onClick={() => oldestActive && openIssueDetail(oldestActive.id)}><span>Oldest active work</span><strong>{oldestActive ? `${daysSince(oldestActive.createdAt)}d` : "—"}</strong><small>{oldestActive ? clip(oldestActive.title, 54) : "The queue is empty"}</small></button>
              <button type="button" disabled={!waitingIssues.length} onClick={() => waitingIssues[0] && openIssueDetail(waitingIssues[0].id)}><span>Waiting or blocked</span><strong>{waitingIssues.length}</strong><small>{waitingIssues.length ? "Open the oldest waiting item" : "No blocked handoffs"}</small></button>
              <button type="button" disabled={!staleIssues.length} onClick={() => staleIssues[0] && openIssueDetail(staleIssues[0].id)}><span>No update for 3+ days</span><strong>{staleIssues.length}</strong><small>{staleIssues.length ? "Record the next movement" : "Every active item is fresh"}</small></button>
              <button type="button" disabled={!ownerReport.length} onClick={() => { setSection("dashboard"); setFilter("All"); setMetricFocus("home-open"); }}><span>Highest active load</span><strong>{ownerReport[0]?.[1] ?? 0}</strong><small>{ownerReport[0]?.[0] ?? "No active owner"}</small></button>
            </div>
          </section>

          <section className="insight-action-center" aria-labelledby="insight-action-title-v2"><div className="insight-action-head"><div><p className="eyebrow">ACT ON THE SIGNAL</p><h2 id="insight-action-title-v2">Turn the gaps into next moves</h2><p>Each action opens the exact queue or record that needs attention.</p></div><span>{overdueCount + missingEtaIssues.length + missingOutcomeIssues.length} open recommendation{overdueCount + missingEtaIssues.length + missingOutcomeIssues.length === 1 ? "" : "s"}</span></div><div className="insight-action-list"><article className={overdueCount ? "needs-action" : "is-complete"}><span className="insight-action-mark">{overdueCount ? "!" : "✓"}</span><div><strong>Recover overdue work</strong><p>{overdueCount ? `${overdueCount} active item${overdueCount === 1 ? " is" : "s are"} past the expected update.` : "No active work is overdue."}</p></div>{overdueCount > 0 && <button type="button" onClick={() => openInsightQueue("overdue")}>Work the queue →</button>}</article><article className={missingEtaIssues.length ? "needs-action" : "is-complete"}><span className="insight-action-mark">{missingEtaIssues.length ? "◷" : "✓"}</span><div><strong>Set missing expectations</strong><p>{missingEtaIssues.length ? `${missingEtaIssues.length} active item${missingEtaIssues.length === 1 ? " has" : "s have"} no ETA.` : "Every active item has an expected update."}</p></div>{missingEtaIssues.length > 0 && <button type="button" onClick={() => openInsightQueue("eta")}>Set the first ETA →</button>}</article><article className={missingOutcomeIssues.length ? "needs-action" : "is-complete"}><span className="insight-action-mark">{missingOutcomeIssues.length ? "✎" : "✓"}</span><div><strong>Preserve the outcome</strong><p>{missingOutcomeIssues.length ? `${missingOutcomeIssues.length} completed item${missingOutcomeIssues.length === 1 ? " is" : "s are"} missing the result or learning.` : "Every completed item has an outcome."}</p></div>{missingOutcomeIssues.length > 0 && <button type="button" onClick={() => openInsightQueue("outcome")}>Capture the first outcome →</button>}</article></div></section>
        </>}

        {insightSection === "work" && shippedWall.length > 0 && <section className="insight-panel shipped-wall">
          <div className="insight-panel-head"><div><p className="eyebrow">THE SHIPPED WALL</p><h3>What you actually delivered</h3></div><span className="wall-count">{shippedWall.length} with an outcome</span></div>
          <p className="insight-note wall-note">Closed work where you wrote down what changed. This is the answer to &ldquo;what have you been doing?&rdquo; — in your own words, not a counter.</p>
          <div className="wall-grid">{shippedWall.map(issue => <button key={issue.id} type="button" className="wall-card" onClick={() => { setActiveId(issue.id); setShowDetail(true); }}>
            <strong>{issue.title}</strong>
            <p>{issue.outcome}</p>
            <small>{dateLabel(completedAtOf(issue))}</small>
          </button>)}</div>
        </section>}

        {insightSection === "memory" && <section className="memory-center memory-center-focused"><div className="memory-head"><div><p className="eyebrow">OPERATIONAL MEMORY</p><h2>Keep the fix, not just the closure</h2><p>Previews hide links, addresses, and oversized pasted content until you open the record.</p></div><span>{resolvedIssues.length - incompleteMemories.length}/{resolvedIssues.length} complete</span></div>{resolvedIssues.length ? <div className="memory-list">{resolvedIssues.map(issue => { const raw = issue.memory?.resolution || issue.outcome || "The resolution has not been captured yet."; return <article key={issue.id}><div><strong>{issue.title}</strong><p>{safeMemoryPreview(raw)}</p></div><button type="button" onClick={() => setMemoryIssueId(issue.id)}>{issue.memory?.resolution && issue.memory?.learning ? "Review" : "Capture"} →</button></article>; })}</div> : <p className="memory-empty">Resolve an issue and its operational memory card will appear here.</p>}</section>}

        {insightSection === "rhythm" && <section className="diary-insights diary-insights-focused">
          <div className="diary-insights-head"><div><p className="eyebrow">FROM YOUR DIARY</p><h2>Personal rhythm, on your terms<Petal className="title-petal" size={19}/></h2><p>Private, on-device patterns. Turn off any signal you do not want reflected here.</p></div>{diaryInsights && <button className="secondary" type="button" onClick={() => setSection("diary")}>Open the diary</button>}</div>
          <div className="privacy-controls" aria-label="Diary insight privacy controls">{([['mood','Mood patterns'],['themes','Recurring themes'],['words','Repeated words']] as const).map(([key,label]) => <button key={key} type="button" aria-pressed={diaryInsightPrefs[key]} className={diaryInsightPrefs[key] ? "is-on" : ""} onClick={() => setDiaryInsightPrefs(current => ({ ...current, [key]: !current[key] }))}><span>{diaryInsightPrefs[key] ? "✓" : ""}</span>{label}</button>)}</div>
          {diaryLocked ? <div className="diary-insights-empty"><span><Petal size={26}/></span><h3>Your diary is locked.</h3><p>Unlock it on the Diary page and these patterns come back with it.</p></div> : !diaryInsights ? <div className="diary-insights-empty"><span>✎</span><h3>Nothing to read yet.</h3><p>Write a few reflections and this fills up gently.</p></div> : <>
            <div className="insight-context"><span>{diaryInsights.entries.length < 8 || diaryInsights.daysWritten < 4 ? "Early pattern" : "Established pattern"}</span><span>{diaryInsights.entries.length} reflections across {diaryInsights.daysWritten} day{diaryInsights.daysWritten === 1 ? "" : "s"}</span></div>
            <div className="metric-row insight-metrics"><article><span>Reflections</span><strong>{diaryInsights.entries.length}</strong><small>Private pages on this device</small></article><article className={diaryInsights.currentStreak > 1 ? "good" : ""}><span>Writing streak</span><strong>{diaryInsights.currentStreak || "—"}</strong><small>Best run: {diaryInsights.longestStreak} day{diaryInsights.longestStreak === 1 ? "" : "s"}</small></article><article><span>Words written</span><strong>{diaryInsights.totalWords.toLocaleString()}</strong><small>{diaryInsights.averageWords} per page</small></article><article><span>Pages revisited</span><strong>{diaryInsights.revisited}</strong><small>Reflections you returned to</small></article></div>
            {diaryInsightPrefs.mood && <article className="insight-panel mood-ribbon-card"><div className="insight-panel-head"><div><p className="eyebrow">MOOD RIBBON</p><h3>Your last {diaryInsights.ribbon.length} pages</h3></div><span className={`mood-tag mood-${diaryInsights.topMood.value}`}>{diaryInsights.topMood.symbol} mostly {diaryInsights.topMood.label.toLowerCase()}</span></div><div className="mood-ribbon">{diaryInsights.ribbon.map(entry => <button key={entry.id} type="button" className={`ribbon-block mood-${entry.mood}`} aria-label={`${moodName(entry.mood)} on ${dateLabel(entry.at)}`} onClick={() => { setOpenDiaryId(entry.id); }}/>)}</div></article>}
            {diaryInsightPrefs.mood && pixels && <article className="insight-panel year-card">
              <div className="insight-panel-head">
                <div><p className="eyebrow">A YEAR IN PIXELS</p><h3>{pixelsWritten} day{pixelsWritten === 1 ? "" : "s"} written in {shownYear}</h3></div>
                {diaryYears.length > 1 && <div className="year-switch">{diaryYears.map(year => <button key={year} type="button" className={year === shownYear ? "is-selected" : ""} aria-pressed={year === shownYear} onClick={() => setPixelYear(year)}>{year}</button>)}</div>}
              </div>
              <div className="year-grid" role="img" aria-label={`Mood for each day of ${shownYear}. ${pixelsWritten} days written.`}>
                {pixels.map(row => <div className="year-row" key={row.month}>
                  <span className="year-month">{row.label}</span>
                  <div className="year-days">{row.days.map(day => day.entry
                    ? <button key={day.key} type="button" className={`year-pixel mood-${day.entry.mood} ${day.isToday ? "is-today" : ""}`} title={`${moodName(day.entry.mood)} · ${dateLabel(day.entry.at)}${day.entry.title ? ` · ${day.entry.title}` : ""}`} aria-label={`${moodName(day.entry.mood)} on ${dateLabel(day.entry.at)}`} onClick={() => { setOpenDiaryId(day.entry!.id); }}/>
                    : <span key={day.key} className={`year-pixel is-blank ${day.isToday ? "is-today" : ""} ${day.isFuture ? "is-future" : ""}`} aria-hidden="true"/>)}</div>
                </div>)}
              </div>
              <p className="insight-note">{pixelsWritten === 0 ? `Nothing written in ${shownYear} yet — each square fills in as you write.` : `Every square is a day. The gaps are days too — this is a record, not a scorecard.`}</p>
            </article>}
            <div className="insight-detail">
              {diaryInsightPrefs.themes && <article className="insight-panel"><p className="eyebrow">RECURRING THREADS</p><h3>What may be repeating</h3>{diaryInsights.themes.length ? <ul className="theme-bars">{diaryInsights.themes.map(theme => <li key={theme.label}><span className="theme-name">{theme.label}</span><span className="theme-track"><span style={{ width: `${Math.max(10, Math.round((theme.count / diaryInsights.entries.length) * 100))}%` }}/></span><em>{theme.count}</em></li>)}</ul> : <p>No thread has repeated yet.</p>}<p className="insight-note">{diaryInsights.entries.length < 8 || diaryInsights.daysWritten < 4 ? "This is an early observation, not a conclusion. A few more days of writing will make it more reliable." : "These are repeated themes in your own words, offered as prompts rather than conclusions."}</p></article>}
              {diaryInsightPrefs.words && <article className="insight-panel"><p className="eyebrow">REPEATED WORDS</p><h3>Language you return to</h3>{diaryInsights.words.length ? <div className="word-cloud">{diaryInsights.words.map(([word,count],index) => <span key={word} className="word-chip" style={{ fontSize: `${Math.round(20 - index * 1.2)}px` }} title={`${count} times`}>{word}</span>)}</div> : <p>No word has repeated enough to show yet.</p>}<p className="insight-note">Hidden by default because individual words can lose their meaning outside the page they came from.</p></article>}
            </div>
          </>}
        </section>}
      </section>}
      {section === "diary" && diaryLocked && <section className="diary-section"><div className="lock-screen"><span className="lock-mark"><Petal size={37}/></span><p className="eyebrow">LOCKED</p><h2>Your diary is closed.</h2><p>Enter the passphrase you set. It is not stored anywhere, so nobody — including this app — can open these pages without it.</p><form onSubmit={unlockDiary}><label>Passphrase<input type="password" autoComplete="current-password" value={lockPass} onChange={event => setLockPass(event.target.value)} required/></label><button className="primary" type="submit" disabled={lockBusy}>{lockBusy ? "Opening…" : "Unlock"}</button></form>{lockMessage && <p className="lock-message" role="status">{lockMessage}</p>}</div></section>}
      {section === "diary" && !diaryLocked && <section className="diary-section" style={diarySkin}><div className="diary-grid"><form className={`diary-composer paper-${diaryPaper}`} onSubmit={addDiaryEntry}><div><p className="eyebrow">TODAY&apos;S CHECK-IN</p><h2>What needs room today?</h2><p className="diary-copy">Write it exactly as it feels. This entry stays in this browser.</p></div><div className={`streak-banner ${diaryInsights?.currentStreak ? "" : "is-cold"}`}><span className="streak-flame" aria-hidden="true">{diaryInsights?.currentStreak ? <Petal size={20}/> : "✎"}</span><div><strong>{!diaryInsights ? "Your first page." : !diaryInsights.currentStreak ? "No run going." : diaryInsights.currentStreak === 1 ? "Day one." : `${diaryInsights.currentStreak} days running.`}</strong><small>{!diaryInsights ? "Write once and the streak starts at one." : !diaryInsights.currentStreak ? `Your longest was ${diaryInsights.longestStreak} day${diaryInsights.longestStreak === 1 ? "" : "s"}. Today can start the next one.` : wroteToday ? `Today is already on the page.${diaryInsights.currentStreak >= diaryInsights.longestStreak ? " This is your longest run yet." : ` Your best is ${diaryInsights.longestStreak} days.`}` : `Write today to keep it going.${diaryInsights.currentStreak >= diaryInsights.longestStreak ? " One more makes it your longest run." : ` Your best is ${diaryInsights.longestStreak} days.`}`}</small></div></div><fieldset className="mood-picker"><legend>How are you feeling?</legend>{moods.map(mood => <button key={mood.value} className={diaryMood === mood.value ? "mood-selected" : ""} type="button" aria-pressed={diaryMood === mood.value} onClick={() => setDiaryMood(mood.value)}><span>{mood.symbol}</span><small>{mood.label}</small></button>)}</fieldset><label>Give this moment a name <small>optional</small><input value={diaryTitle} onChange={event => setDiaryTitle(event.target.value)} placeholder="A short title…"/></label><div className="diary-prompt"><span>{writingPrompts[promptIndex]}</span><button type="button" onClick={() => setPromptIndex(index => (index + 1) % writingPrompts.length)} aria-label="Show another prompt">Another</button></div><label>Let it out<textarea className="diary-ruled" required value={diaryText} onChange={event => setDiaryText(event.target.value)} placeholder="What happened? What are you carrying? What do you wish you could say?"/></label>{linkableIssues.length > 0 && <div className="link-picker"><span>Is this about a task? <small>optional</small></span><div className="link-options">{linkableIssues.map(issue => <button key={issue.id} type="button" className={diaryLinks.includes(issue.id) ? "is-linked" : ""} aria-pressed={diaryLinks.includes(issue.id)} onClick={() => setDiaryLinks(current => current.includes(issue.id) ? current.filter(id => id !== issue.id) : [...current, issue.id])}>{issue.title}</button>)}</div></div>}<div className="diary-save"><span>Private on this device</span><button className="primary" type="submit">Save reflection</button></div></form><aside className="diary-companion"><span className="companion-mark"><Petal size={32}/></span><p className="eyebrow">GENTLE NEXT STEP</p><h2>{diaryInsight ? "A thought for right now" : "Your private pause"}</h2><p>{diaryInsight || "After you save a reflection, Signal Petal will offer one small suggestion shaped by your mood and words."}</p><div className="diary-stats"><div><strong>{diaryEntries.length}</strong><span>Total entries</span></div><div><strong>{diaryEntries.filter(entry => Date.now() - new Date(entry.at).getTime() < 604800000).length}</strong><span>Last 7 days</span></div><div><strong className="stat-best">{diaryInsights?.longestStreak ?? 0}</strong><span>Longest run</span></div></div>{lookBack && <button className="look-back" type="button" onClick={() => setOpenDiaryId(lookBack.entry.id)}><span className="eyebrow">{lookBack.label.toUpperCase()}</span><strong>{lookBack.entry.title || "Untitled reflection"}</strong><small>{moodName(lookBack.entry.mood)} · {dateLabel(lookBack.entry.at)}</small></button>}<small className="privacy-note">Suggestions are generated on this device. They are supportive prompts, not professional care.</small></aside></div><section className="diary-history"><div className="diary-history-heading"><div><p className="eyebrow">YOUR REFLECTIONS</p><h2>Recent entries</h2></div>{lockOn && <button className="secondary lock-now" type="button" onClick={lockDiaryNow}>Lock the diary</button>}<span>{diaryNeedle || diaryMoodFilter ? `${visibleDiary.length} of ${diaryEntries.length}` : `${diaryEntries.length} saved`}</span></div>
        <div className="diary-filters"><input type="search" value={diaryQuery} onChange={event => setDiaryQuery(event.target.value)} placeholder="Search your reflections…" aria-label="Search reflections"/><div className="mood-filter">{moods.map(option => <button key={option.value} type="button" className={`mood-tag mood-${option.value} ${diaryMoodFilter === option.value ? "is-chosen" : ""}`} aria-pressed={diaryMoodFilter === option.value} onClick={() => setDiaryMoodFilter(current => current === option.value ? "" : option.value)}>{option.symbol} {option.label}</button>)}{(diaryNeedle || diaryMoodFilter) && <button type="button" className="clear-filters" onClick={() => { setDiaryQuery(""); setDiaryMoodFilter(""); }}>Clear</button>}</div></div><div className="diary-entry-list">{visibleDiary.map(entry => { const mood = moods.find(item => item.value === entry.mood) || moods[2]; return <article className={`diary-entry diary-page paper-${diaryPaper}`} key={entry.id}><button className="diary-page-open" type="button" onClick={() => { setOpenDiaryId(entry.id); setEditingDiaryId(""); }}><span className="diary-entry-top"><span className={`mood-tag mood-${entry.mood}`}>{mood.symbol} {mood.label}</span><time>{dateLabel(entry.at)}{entry.updatedAt ? ` · edited ${dateLabel(entry.updatedAt)}` : ""}</time></span><span className="diary-page-title"><em className="page-number">Page {pageNumbers.get(entry.id) ?? 1}</em>{entry.title || "Untitled reflection"}</span><span className="diary-ruled diary-page-body">{entry.text}</span><span className="diary-page-more">Open page →</span></button></article>; })}{!visibleDiary.length && <div className="diary-empty"><span>✎</span><h3>{diaryEntries.length ? "Nothing matches that." : "Your diary is ready."}</h3><p>{diaryEntries.length ? "Try a different word, or clear the filters to see every page." : "Your first reflection will appear here with its mood and gentle next step."}</p></div>}</div></section></section>}
      {section === "review" && reviewWeek && review && <section className="review-page">
        <div className="review-toolbar">
          <div className={`review-nav ${review.isRecent ? "is-recent" : ""}`}>{!review.isRecent && <button type="button" aria-label="Previous week" onClick={() => setReviewWeek(week => addDays(week ?? new Date(), -7))}>‹</button>}<div><strong>{review.isRecent ? "Recent 7 days" : weekLabel(reviewWeek)}</strong><small>{review.isRecent ? weekLabel(new Date(review.from)) : review.isThisWeek ? "This week so far" : "A finished week"}</small></div>{!review.isRecent && <button type="button" aria-label="Next week" disabled={review.isThisWeek} onClick={() => setReviewWeek(week => addDays(week ?? new Date(), 7))}>›</button>}</div>
          <div className="review-actions"><button className="secondary" type="button" onClick={() => { setReviewRange(range => range === "calendar" ? "recent" : "calendar"); setReviewWeek(startOfWeek(new Date())); }}>{review.isRecent ? "Calendar week" : "Recent 7 days"}</button>{!review.isRecent && !review.isThisWeek && <button className="secondary" type="button" onClick={() => setReviewWeek(startOfWeek(new Date()))}>This week</button>}<button className="primary" type="button" onClick={copyReviewSummary}>Copy summary</button></div>
        </div>
        {reviewCopied && <p className="transfer-message" role="status">{reviewCopied}</p>}

        {review.carried.length > 0 && <article className="review-carried"><p className="eyebrow">YOU SAID LAST WEEK</p>{review.carried.map(line => <blockquote key={line}>“{line}.”</blockquote>)}<small>Your own words from the week before. Did it happen?</small></article>}

        <div className="review-columns">
          <article className="review-card shipped">
            <div className="review-card-head"><p className="eyebrow">SHIPPED</p><strong>{review.shipped.length}</strong></div>
            {review.shipped.length
              ? <ul>{review.shipped.map(issue => <li key={issue.id}><button type="button" onClick={() => { setActiveId(issue.id); setShowDetail(true); }}><span>{issue.title}</span>{issue.outcome && <small>{issue.outcome}</small>}</button></li>)}</ul>
              : <p className="review-empty">Nothing closed out this week. That is worth knowing too — it usually means the work was bigger than it looked.</p>}
          </article>

          <article className="review-card stalled">
            <div className="review-card-head"><p className="eyebrow">STALLED</p><strong>{review.stalled.length}</strong></div>
            {review.stalled.length
              ? <ul>{review.stalled.map(issue => <li key={issue.id}><button type="button" onClick={() => { setActiveId(issue.id); setShowDetail(true); }}><span>{issue.title}</span><small>{daysOverdue(issue)} day{daysOverdue(issue) === 1 ? "" : "s"} past its ETA{issue.followUpPeople.length ? ` · waiting on ${issue.followUpPeople.join(", ")}` : ""}</small></button></li>)}</ul>
              : <p className="review-empty">Nothing is past its ETA. Rare and worth noticing.</p>}
          </article>

          <article className="review-card logged">
            <div className="review-card-head"><p className="eyebrow">NEW THIS WEEK</p><strong>{review.logged.length}</strong></div>
            {review.logged.length
              ? <ul>{review.logged.slice(0, 8).map(issue => <li key={issue.id}><button type="button" onClick={() => { setActiveId(issue.id); setShowDetail(true); }}><span>{issue.title}</span><small>{issue.status}</small></button></li>)}{review.logged.length > 8 && <li className="review-more">and {review.logged.length - 8} more</li>}</ul>
              : <p className="review-empty">Nothing new landed on you this week.</p>}
          </article>
        </div>

        <div className="review-forward"><article className="review-card"><div className="review-card-head"><p className="eyebrow">NEXT WEEK’S PRIORITIES</p><strong>{review.priorities.length}</strong></div>{review.priorities.length ? <ol>{review.priorities.map(issue => <li key={issue.id}><button type="button" onClick={() => openIssueDetail(issue.id)}><span>{issue.title}</span><small>{isOverdue(issue) ? `${daysOverdue(issue)}d overdue` : issue.action || "Define the next action"}</small></button></li>)}</ol> : <p className="review-empty">No active work needs to carry forward.</p>}</article><article className="review-card"><div className="review-card-head"><p className="eyebrow">INTENTIONALLY DEFERRED</p><strong>{review.parkedIssues.length}</strong></div>{review.parkedIssues.length ? <ul>{review.parkedIssues.map(issue => <li key={issue.id}><button type="button" onClick={() => openIssueDetail(issue.id)}><span>{issue.title}</span><small>Parked during a daily check-in</small></button></li>)}</ul> : <p className="review-empty">Nothing was explicitly parked in a daily check-in.</p>}<small className="review-private-note">{review.checkIns.length} daily brief{review.checkIns.length === 1 ? "" : "s"} saved. Private capacity and notes stay out of copied summaries.</small></article></div>

        <article className="review-card review-garden"><div><p className="eyebrow">WEEK IN BLOOM</p><h2>{review.gardenStage === 4 ? "A full Signal Garden" : review.gardenStage ? "The week took root" : "A quiet patch"}</h2><p>{review.gardenStage === 4 ? "Work moved, loops closed, boundaries were set, and the personal side of the week had room too." : "The garden grows from focus moves, completed work, daily briefs, and reflections—not from being busy."}</p><div className="garden-milestones"><span className={review.focusMoves.length ? "is-grown" : ""}>Focus</span><span className={review.shipped.length ? "is-grown" : ""}>Shipped</span><span className={review.checkIns.length ? "is-grown" : ""}>Checked in</span><span className={review.pages.length ? "is-grown" : ""}>Reflected</span></div></div><SignalGarden stage={review.gardenStage} compact label={`This week’s Signal Garden is at stage ${review.gardenStage} of 4`}/></article>

        <article className="review-card review-feel">
          <div className="review-card-head"><p className="eyebrow">HOW THE WEEK FELT</p><strong>{review.pages.length} page{review.pages.length === 1 ? "" : "s"}</strong></div>
          {review.pages.length
            ? <>
              <div className="mood-ribbon">{review.pages.map(entry => <button key={entry.id} type="button" className={`ribbon-block mood-${entry.mood}`} title={`${moodName(entry.mood)} · ${dateLabel(entry.at)}`} aria-label={`${moodName(entry.mood)} on ${dateLabel(entry.at)}`} onClick={() => { setOpenDiaryId(entry.id); }}/>)}</div>
              <p className="review-feel-note">{review.feel === null ? "" : review.feel >= 1 ? "A good week on the page — mostly bright and calm." : review.feel > 0 ? "More light than heavy across the week." : review.feel === 0 ? "An even week: some lift, some weight." : review.feel > -0.6 ? "The week leaned heavy. Worth reading back before planning the next one." : "A hard week by your own account. Whatever you plan next, plan it for the person who wrote those pages."}</p>
              {review.owed.length > 0 && <div className="review-owed"><p className="eyebrow">IN YOUR OWN WORDS</p>{review.owed.map(line => <blockquote key={line}>“{line}.”</blockquote>)}</div>}
            </>
            : <p className="review-empty">No reflections this week. The work side of the review still stands, but the other half is missing.</p>}
        </article>
      </section>}
      {section === "settings" && <section className="settings-page" aria-labelledby="settings-page-title">
        <div className="settings-grid">
          <article className="settings-card">
            <p className="eyebrow">APPEARANCE</p><h2 id="settings-page-title">Theme &amp; display</h2>
            <label className="settings-field">Theme<select value={theme} onChange={e => setTheme(e.target.value)}>{themes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <button className="settings-toggle" type="button" role="switch" aria-checked={darkMode} onClick={() => setDarkMode(value => !value)}><span><strong>Dark mode</strong><small>{darkMode ? "On" : "Off"}</small></span><span className={`switch-track ${darkMode ? "is-on" : ""}`} aria-hidden="true"/></button>
          </article>
          <article className="settings-card">
            <p className="eyebrow">DIARY</p><h2>Paper &amp; handwriting</h2>
            <p className="settings-copy">Choose the face you write in and the colour of the page. Both apply everywhere in the diary.</p>
            <label className="settings-field">Writing font<select value={diaryFont} onChange={event => setDiaryFont(event.target.value)}>{diaryFonts.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <div className="paper-picker"><span>Page colour</span><div className="paper-swatches">{diaryPapers.map(([value, label]) => <button key={value} type="button" className={`paper-swatch paper-${value} ${diaryPaper === value ? "is-chosen" : ""}`} aria-pressed={diaryPaper === value} aria-label={label} title={label} onClick={() => setDiaryPaper(value)}/>)}</div></div>
            <div className={`paper-preview diary-ruled paper-${diaryPaper}`} style={diarySkin} aria-hidden="true">Today felt long, but I got through it. Tomorrow I start with the one thing I keep pushing back.</div>
          </article>
          <article className="settings-card">
            <p className="eyebrow">PRIVACY</p><h2>Diary lock</h2>
            <p className="settings-copy">Without a lock, anything written in the diary can be read by anyone who opens this browser&apos;s developer tools on this computer.</p>
            <button className="settings-toggle" type="button" role="switch" aria-checked={lockOn} onClick={() => { setLockMessage(""); if (lockOn) removeDiaryLock(); else setShowLockSetup(true); }}><span><strong>Lock the diary with a passphrase</strong><small>{lockOn ? (diaryLocked ? "On — locked right now" : "On — unlocked for this session") : "Off"}</small></span><span className={`switch-track ${lockOn ? "is-on" : ""}`} aria-hidden="true"/></button>
            {lockOn && !diaryLocked && <button className="secondary" type="button" onClick={lockDiaryNow}>Lock it now</button>}
            {lockMessage && !showLockSetup && <p className="lock-message" role="status">{lockMessage}</p>}
          </article>
          <article className="settings-card">
            <p className="eyebrow">NOTIFICATIONS</p><h2>Reminders</h2>
            <p className="settings-copy">Get alerts for overdue work, items due within 24 hours, and your daily check-in.</p>
            <button className="settings-toggle" type="button" role="switch" aria-checked={remindersOn} onClick={toggleNotifications}><span><strong>Signal Petal notifications</strong><small>{notificationState}</small></span><span className={`switch-track ${remindersOn ? "is-on" : ""}`} aria-hidden="true"/></button>
            <div className="reminder-controls"><label>Daily check-in time<input type="time" value={reminderTime} onChange={event => setReminderTime(event.target.value)}/></label><button className="secondary" type="button" onClick={testNotifications}>Send test notification</button></div>
            <p className="reminder-explainer">{permission === "denied"
              ? "This browser is blocking notifications for this address. Open the icon beside the address bar, set Notifications to Allow, then reload — the switch above cannot override a browser block."
              : permission === "unsupported"
                ? "This browser has no Notification support, so reminders cannot be delivered here. Chrome, Edge, Firefox, and Safari all support them."
                : "Automatic checks run while Signal Petal is open. Use the test to confirm browser and system permissions."}</p>{reminderFeedback && <p className="reminder-feedback" role="status">{reminderFeedback}</p>}
          </article>
        </div>
        <article className="settings-card settings-wide">
          <p className="eyebrow">WORKFLOW</p><h2>Customize statuses</h2><p className="settings-copy">New, Ongoing, and your completion status stay in the workflow. Choose Resolved or Closed, set colors, and edit or remove every other status. Removed work moves to Ongoing.</p>
          <div className="status-list">{statusDraft.map((item, index) => <div className="status-row" key={item.id}>{item.kind === "terminal" ? <select aria-label="Completion status" value={item.name} onChange={e => { const name = e.target.value; setStatusDraft(items => items.map(draft => draft.id === item.id ? { ...draft, name } : draft)); setStatusError(""); }}><option>Resolved</option><option>Closed</option></select> : <input aria-label={`Status ${index + 1}`} value={item.name} disabled={item.kind === "new" || item.kind === "ongoing"} onChange={e => { const name = e.target.value; setStatusDraft(items => items.map(draft => draft.id === item.id ? { ...draft, name } : draft)); setStatusError(""); }}/>}<input className="status-color" type="color" aria-label={`Color for ${item.name}`} value={item.color} onChange={e => { const color = e.target.value; setStatusDraft(items => items.map(draft => draft.id === item.id ? { ...draft, color } : draft)); }}/>{item.kind ? <span className="status-lock">Required</span> : <button type="button" title="Remove status; matching issues will move to Ongoing" onClick={() => setStatusDraft(items => items.filter(draft => draft.id !== item.id))}>Remove</button>}</div>)}</div>
          <form className="status-add" onSubmit={addStatus}><input value={statusInput} onChange={e => { setStatusInput(e.target.value); setStatusError(""); }} placeholder="Add a new status" aria-label="New status name"/><button className="secondary" type="submit">+ Add</button></form>{statusError && <p className="status-error" role="alert">{statusError}</p>}<div className="settings-actions"><button className="primary" type="button" onClick={saveStatuses}>Save status changes</button></div>
        </article>
        <article className="settings-card settings-wide">
          <p className="eyebrow">DEVICE-LOCAL DATA</p><h2>Export or merge all your data</h2><p className="settings-copy">Backups include tasks, updates, check-ins, workflow details, settings, and diary data. Importing merges newer records and adds anything that does not exist here.</p>
          <div className="backup-file">
            <div className={`backup-status ${backupAge === null ? "never" : backupAge >= 14 ? "stale" : "fresh"}`}>
              <div><strong>{backupAge === null ? "No backup saved yet" : backupAge === 0 ? "Backed up today" : `Last backup ${backupAge} day${backupAge === 1 ? "" : "s"} ago`}</strong><small>{backupAge === null || backupAge >= 14 ? "Everything lives in this browser. Clearing site data for localhost deletes it — a saved file is the only copy that survives that." : "Keep saving a file every couple of weeks and nothing is at the mercy of your browser."}</small></div>
              <button className="primary" type="button" onClick={downloadBackup}>Save backup file</button>
            </div>
            <div className="backup-restore"><div><strong>Merge from a backup file</strong><small>Keeps local data, updates matching records with the newest version, and adds missing records.</small></div><label className="file-button">Choose a backup file<input type="file" accept="application/json,.json" onChange={restoreFromFile}/></label></div>
          </div>
          <div className="data-settings-grid"><div className="transfer-section"><div><strong>Move to another browser</strong><small>A code you can paste into Signal Petal somewhere else. For keeping a copy, use the backup file above instead.</small></div><textarea className="transfer-code" readOnly value={transferCode} aria-label="Backup code"/><button className="secondary" type="button" onClick={copyTransferCode}>Copy backup code</button></div><div className="transfer-section"><div><strong>Merge into this address</strong><small>Matching records keep the latest version; records that are not here yet are added.</small></div><textarea className="transfer-code" value={importCode} onChange={e => setImportCode(e.target.value)} placeholder="Paste a backup code here" aria-label="Backup code to import"/><div className="transfer-actions"><button className="secondary" type="button" onClick={pasteTransferCode}>Paste code</button><button className="primary" type="button" disabled={!importCode.trim()} onClick={importTransfer}>Import and merge</button></div></div></div>{transferMessage && <p className="transfer-message" role="status">{transferMessage}</p>}
        </article>
      </section>}
    </section>
    {showDetail && active && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowDetail(false); }}><section className="detail detail-modal" role="dialog" aria-modal="true" aria-labelledby="issue-detail-title"><button className="close" type="button" aria-label="Close issue details" onClick={() => setShowDetail(false)}>×</button><div className="detail-title"><div><span className={statusClass(active.status)} style={statusStyle(active.status)}>{active.status}</span><h2 id="issue-detail-title">{active.title}</h2><p>{active.details}</p></div><div className="detail-actions"><label>Status<select value={active.status} onChange={e => updateIssue({ status: e.target.value })}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label><button className="delete" type="button" onClick={() => setShowDeleteConfirm(true)}>Delete issue</button></div></div><div className="detail-grid"><div className="field"><span>Primary owner</span><input key={active.id} defaultValue={active.owner} onChange={onOwnerInput} onBlur={e => changeOwner(e.target.value)}/></div><div className="field"><span>Expected update / done</span><input type="datetime-local" value={active.expected} onChange={e => updateIssue({expected:e.target.value})}/></div><div className="field wide people-field"><span>Follow-up people</span>{active.followUpPeople.length > 0 && <div className="people-chips">{active.followUpPeople.map(person => <span className="person-chip" key={person}>{person}<button type="button" aria-label={`Remove ${person}`} onClick={() => removeActiveFollowUp(person)}>×</button></span>)}</div>}<div className="people-add"><input value={followUpInput} onChange={e => onNameInput(e, setFollowUpInput)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addActiveFollowUps(); } }} placeholder="Add names, separated by commas" aria-label="Follow-up people to add"/><button className="secondary" type="button" onClick={addActiveFollowUps}>+ Add people</button></div><small>These names help you track who needs a follow-up; no notifications are sent.</small></div><div className="field wide"><span>What they’re doing / my current action</span><textarea value={active.action} onChange={e => updateIssue({action:e.target.value})}/></div><div className="field wide"><span>Outcome</span><textarea placeholder="Capture the resolution, learning, or impact…" value={active.outcome} onChange={e => updateIssue({outcome:e.target.value})}/></div></div>{!diaryLocked && diaryEntries.some(entry => (entry.issueIds ?? []).includes(active.id)) && <div className="issue-reflections"><div className="issue-reflections-head"><p className="eyebrow">FROM YOUR DIARY</p><small>Only you can see this.</small></div>{diaryEntries.filter(entry => (entry.issueIds ?? []).includes(active.id)).map(entry => { const mood = moods.find(item => item.value === entry.mood) || moods[2]; return <button key={entry.id} type="button" onClick={() => { setShowDetail(false); setOpenDiaryId(entry.id); }}><span className={`mood-tag mood-${entry.mood}`}>{mood.symbol} {mood.label}</span><strong>{entry.title || "Untitled reflection"}</strong><small>{dateLabel(entry.at)}</small></button>; })}</div>}<div className="timeline"><div className="timeline-heading"><h3>Update timeline</h3><span>{active.updates.length} entries</span></div>{active.updates.map(entry => <div className="timeline-entry" key={entry.id}><div className="timeline-dot"/><div><strong>{entry.author}</strong><time>{dateLabel(entry.at)}</time><p>{entry.text}</p></div></div>)}<form className="update-form" onSubmit={addUpdate}><input name="update" placeholder="Add your update, decision, or next step…" aria-label="New update"/><button className="primary">Add update</button></form></div><div className="detail-save-actions"><button className="primary" type="button" onClick={() => setShowDetail(false)}>Save changes</button></div></section></div>}
    {openEntry && (() => {
      const mood = moods.find(item => item.value === openEntry.mood) || moods[2];
      const drafting = editingDiaryId === openEntry.id;
      const suggestion = openEntry.suggestion || diarySuggestion(openEntry.mood, openEntry.text, openEntry.title, diaryEntries.slice(openEntryIndex + 1), openEntry.at);
      const trail = diaryLog.filter(event => event.entryId === openEntry.id);
      const close = () => { setOpenDiaryId(""); setEditingDiaryId(""); };
      return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) close(); }} style={diarySkin}>
        <section className={`diary-open paper-${diaryPaper}`} role="dialog" aria-modal="true" aria-labelledby="diary-open-title">
          <button className="close" type="button" aria-label="Close this page" onClick={close}>×</button>
          <div className="diary-open-head"><em className="page-number">Page {pageNumbers.get(openEntry.id) ?? 1}</em><span className={`mood-tag mood-${drafting ? editDraft.mood : openEntry.mood}`}>{(drafting ? moods.find(item => item.value === editDraft.mood) || mood : mood).symbol} {(drafting ? moods.find(item => item.value === editDraft.mood) || mood : mood).label}</span><time>{dateLabel(openEntry.at)}{openEntry.updatedAt ? ` · edited ${dateLabel(openEntry.updatedAt)}` : ""}</time></div>
          {drafting
            ? <form className="diary-entry-edit" onSubmit={event => saveDiaryEdit(event, openEntry, openEntryIndex)}><fieldset className="mood-picker mood-picker-compact"><legend>Mood</legend>{moods.map(option => <button key={option.value} className={editDraft.mood === option.value ? "mood-selected" : ""} type="button" aria-pressed={editDraft.mood === option.value} onClick={() => setEditDraft(draft => ({ ...draft, mood: option.value }))}><span>{option.symbol}</span><small>{option.label}</small></button>)}</fieldset><label>Title <small>optional</small><input value={editDraft.title} onChange={event => setEditDraft(draft => ({ ...draft, title: event.target.value }))} placeholder="A short title…"/></label><div className="link-picker"><span>Linked tasks</span><div className="link-options">{linkableIssues.map(issue => <button key={issue.id} type="button" className={editDraft.issueIds.includes(issue.id) ? "is-linked" : ""} aria-pressed={editDraft.issueIds.includes(issue.id)} onClick={() => setEditDraft(draft => ({ ...draft, issueIds: draft.issueIds.includes(issue.id) ? draft.issueIds.filter(id => id !== issue.id) : [...draft.issueIds, issue.id] }))}>{issue.title}</button>)}</div></div><label>Reflection<textarea className="diary-ruled" required value={editDraft.text} onChange={event => setEditDraft(draft => ({ ...draft, text: event.target.value }))}/></label><div className="diary-entry-actions"><button className="primary" type="submit">Save changes</button><button className="secondary" type="button" onClick={cancelDiaryEdit}>Cancel</button></div></form>
            : <><h2 id="diary-open-title" className="diary-open-title">{openEntry.title || "Untitled reflection"}</h2><div className="diary-ruled diary-open-body">{openEntry.text}</div>{(openEntry.issueIds ?? []).length > 0 && <div className="entry-links"><span>About</span><div>{(openEntry.issueIds ?? []).map(id => { const issue = issues.find(item => item.id === id); return issue ? <button key={id} type="button" onClick={() => { setOpenDiaryId(""); setActiveId(id); setShowDetail(true); }}>{issue.title}</button> : null; })}</div></div>}<div className="entry-suggestion"><span>Try this</span><p>{suggestion}</p></div>{trail.length > 0 && <ul className="entry-trail">{trail.map(event => <li key={event.id}><strong>{diaryEventLabel(event.action)}</strong> {dateLabel(event.at)} <span>{event.detail}</span></li>)}</ul>}<div className="diary-entry-actions"><button type="button" onClick={() => startDiaryEdit(openEntry)}>Edit</button><button type="button" className="entry-delete" onClick={() => setConfirmDiaryDelete(openEntry.id)}>Delete</button></div></>}
        </section>
      </div>;
    })()}
    {showDailyCheckIn && <div className="modal-backdrop daily-check-in-v2-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowDailyCheckIn(false); }}>
      <form className="daily-check-in-modal-v2" onSubmit={saveDailyCheckIn} role="dialog" aria-modal="true" aria-labelledby="daily-check-in-title-v2">
        <button className="close" type="button" aria-label="Close daily check-in" onClick={() => setShowDailyCheckIn(false)}>×</button>
        {checkInStep < 3 && <><div className="check-in-heading"><p className="eyebrow">TWO-MINUTE WRAP-UP</p><h2 id="daily-check-in-title-v2">{["Review today","Make the boundary","Set up tomorrow"][checkInStep]}</h2><p>{["Start with what changed, then plan with the capacity you actually have.","Choose only what can genuinely wait and give it a date to return.","Leave one clear first move so tomorrow starts without rereading the whole queue."][checkInStep]}</p></div><div className="check-in-steps" aria-label={`Step ${checkInStep + 1} of 3`}>{[0,1,2].map(step => <span key={step} className={step <= checkInStep ? "is-active" : ""}><b>{step + 1}</b>{["Review","Decide","Tomorrow"][step]}</span>)}</div></>}

        {checkInStep === 0 && <div className="check-in-stage"><div className="check-in-facts"><div><strong>{completedToday.length}</strong><span>completed today</span></div><div className={overdueCount ? "needs-care" : ""}><strong>{overdueCount}</strong><span>currently overdue</span></div><div><strong>{openCount}</strong><span>still open</span></div></div>{previousCheckIn && <div className="check-in-change"><span>Since your last brief</span><strong>{completedToday.length ? `${completedToday.length} loop${completedToday.length === 1 ? "" : "s"} closed today` : "The queue is still waiting for movement"}</strong><small>Last capacity: {previousCheckIn.capacity === "high" ? "strong" : previousCheckIn.capacity === "low" ? "limited" : "steady"}</small></div>}<fieldset className="capacity-picker"><legend>What capacity are you planning with?</legend><p>Private in Signal Petal and never included in copied work summaries.</p><div>{([['high','Strong','Room for demanding work'],['steady','Steady','A normal, focused load'],['low','Limited','Protect the essentials']] as const).map(([value,label,copy]) => <button key={value} type="button" className={checkInCapacity === value ? "is-selected" : ""} aria-pressed={checkInCapacity === value} onClick={() => setCheckInCapacity(value)}><strong>{label}</strong><small>{copy}</small></button>)}</div></fieldset></div>}

        {checkInStep === 1 && <div className="check-in-stage">{parkableIssues.length ? <fieldset className="park-picker-v2"><legend>What can intentionally wait?</legend><p>The most urgent work is shown first. Selected items return on one shared date, which updates their expected time and keeps Insights honest.</p><div>{parkableIssues.slice(0, checkInShowAll ? parkableIssues.length : 5).map(issue => <label key={issue.id}><input type="checkbox" checked={checkInParked.includes(issue.id)} onChange={() => setCheckInParked(ids => ids.includes(issue.id) ? ids.filter(id => id !== issue.id) : [...ids, issue.id])}/><span><strong>{issue.title}</strong><small>{isOverdue(issue) ? `${daysOverdue(issue)}d overdue` : issue.expected ? dateLabel(issue.expected) : "No expectation set"} · {issue.owner}</small></span></label>)}</div>{parkableIssues.length > 5 && <button className="show-all-work" type="button" onClick={() => setCheckInShowAll(value => !value)}>{checkInShowAll ? "Show the priority five" : `Show all ${parkableIssues.length} active items`}</button>}</fieldset> : <div className="check-in-clear"><Petal size={30}/><strong>The queue is clear.</strong><p>There is nothing to defer tonight.</p></div>}{checkInParked.length > 0 && <label className="resume-field">Bring these back on<input type="datetime-local" min={checkInResumeMinimum} value={checkInResumeAt} onChange={event => setCheckInResumeAt(event.target.value)} required/><small>This becomes the new expected update for {checkInParked.length} selected item{checkInParked.length === 1 ? "" : "s"}.</small></label>}</div>}

        {checkInStep === 2 && <div className="check-in-stage tomorrow-stage"><label>Today’s win <small>optional</small><input value={checkInWin} onChange={event => setCheckInWin(event.target.value)} placeholder="What moved or became clearer?"/></label><label>Tomorrow’s first move <small>recommended</small><textarea value={checkInTomorrowMove} onChange={event => setCheckInTomorrowMove(event.target.value)} placeholder="The first concrete action you want waiting for you…"/></label><label>Anything else tomorrow-you should know? <small>optional</small><textarea value={checkInNote} onChange={event => setCheckInNote(event.target.value)} placeholder="A decision, constraint, or useful context…"/></label><div className="check-in-preview"><p className="eyebrow">YOUR BRIEF WILL CAPTURE</p><span>{completedToday.length} completed · {overdueCount} overdue · {checkInParked.length} deferred · {checkInCapacity} capacity{checkInTomorrowMove.trim() ? " · first move ready" : ""}</span></div></div>}

        {checkInStep === 3 && checkInSaved && <div className="check-in-receipt" role="status"><span className="receipt-mark"><Petal size={34}/></span><p className="eyebrow">DAILY BRIEF SAVED</p><h2>Tomorrow has a starting point.</h2><p>{checkInParked.length ? `${checkInParked.length} item${checkInParked.length === 1 ? " was" : "s were"} deferred to ${dateLabel(checkInResumeAt)}.` : "Nothing was pushed aside without a decision."}</p>{checkInTomorrowMove.trim() && <blockquote>{checkInTomorrowMove.trim()}</blockquote>}<div className="check-in-actions"><button className="secondary" type="button" onClick={() => { setCheckInStep(0); setCheckInSaved(false); }}>Edit brief</button><button className="primary" type="button" onClick={() => setShowDailyCheckIn(false)}>Done</button></div></div>}

        {checkInStep < 3 && <div className="check-in-actions check-in-nav">{checkInStep > 0 ? <button className="secondary" type="button" onClick={() => setCheckInStep(step => step - 1)}>Back</button> : <button className="secondary" type="button" onClick={() => setShowDailyCheckIn(false)}>Cancel</button>}<button className="primary" type={checkInStep === 2 ? "submit" : "button"} onClick={checkInStep < 2 ? () => setCheckInStep(step => step + 1) : undefined}>{checkInStep === 2 ? todayCheckIn ? "Update daily brief" : "Save daily brief" : "Continue"}</button></div>}
        {checkInStep < 3 && dailyCheckIns.length > 0 && <div className="check-in-history-toggle"><button type="button" onClick={() => setShowCheckInHistory(value => !value)}>{showCheckInHistory ? "Hide previous briefs" : "View previous briefs"}</button>{showCheckInHistory && <div className="check-in-history">{dailyCheckIns.slice(0,3).map(checkIn => <article key={checkIn.id}><time>{dateLabel(checkIn.at)}</time><p>{clip(checkIn.brief, 220)}</p></article>)}</div>}</div>}
      </form>
    </div>}
    {showCommandPalette && <div className="modal-backdrop command-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowCommandPalette(false); }}><section className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette"><div className="command-search"><span>⌕</span><input autoFocus value={commandQuery} onChange={event => { setCommandQuery(event.target.value); setCommandIndex(0); }} onKeyDown={walkCommands} placeholder="Search commands, tasks, or reflections…" aria-label="Search commands"/><kbd>Esc</kbd></div><div className="command-results">{commandItems.map((item, index) => <Fragment key={item.key}>{(index === 0 || commandItems[index - 1].group !== item.group) && <p>{item.group}</p>}<button type="button" className={index === commandCursor ? "is-active" : ""} ref={node => { if (index === commandCursor) node?.scrollIntoView({ block: "nearest" }); }} onMouseEnter={() => setCommandIndex(index)} onClick={item.run}><span className={item.group === "REFLECTIONS" ? "command-mood" : ""}>{item.icon}</span><strong>{item.label}</strong>{item.group === "QUICK ACTIONS" ? <kbd>{item.hint}</kbd> : <small>{item.hint}</small>}</button></Fragment>)}{!commandItems.length && <div className="command-empty">No command, task, or reflection matches “{commandQuery}”.</div>}</div><footer><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span>Shortcut <kbd>⌘ K</kbd> or <kbd>/</kbd></span></footer></section></div>}
    {showOnboarding && profile && <div className="modal-backdrop onboarding-backdrop" role="presentation"><section className="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onboarding-title"><button className="onboarding-skip" type="button" onClick={() => finishOnboarding()}>Skip for now</button><span className="profile-mark"><Petal size={31}/></span><p className="eyebrow">YOUR FIRST SIGNAL LOOP</p><h2 id="onboarding-title">{["Capture what needs attention","Give the work a next move","Let Focus now rank the queue","Close the day deliberately"][onboardingStep]}</h2><p>{["Start with one real issue, handoff, task, or risk you are carrying.","An owner, current action, and expected update turn a note into something the app can protect.","Overdue work, missing ETAs, and unclear actions rise automatically—with reversible actions beside them.","The daily check-in records movement, what can wait, and the capacity tomorrow’s plan should respect."][onboardingStep]}</p><div className="onboarding-visual"><span>{onboardingStep + 1}</span><div><strong>{["Log a signal","Name the next move","Work the ranked queue","Save the daily brief"][onboardingStep]}</strong><small>{["Title · context · owner","Action · ETA · follow-up people","Follow up · reschedule · handle","Movement · boundaries · capacity"][onboardingStep]}</small></div></div><div className="onboarding-dots">{[0,1,2,3].map(step => <button key={step} type="button" className={step === onboardingStep ? "is-current" : ""} aria-label={`Onboarding step ${step + 1}`} onClick={() => setOnboardingStep(step)}/>)}</div><div className="onboarding-actions">{onboardingStep > 0 && <button className="secondary" type="button" onClick={() => setOnboardingStep(step => step - 1)}>Back</button>}{onboardingStep < 3 ? <button className="primary" type="button" onClick={() => setOnboardingStep(step => step + 1)}>Next</button> : <><button className="secondary" type="button" onClick={() => finishOnboarding("check-in")}>Try the check-in</button><button className="primary" type="button" onClick={() => finishOnboarding("create")}>Log my first signal</button></>}</div></section></div>}
    {memoryIssue && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setMemoryIssueId(""); }}><form className="memory-modal" onSubmit={saveOperationalMemory} role="dialog" aria-modal="true" aria-labelledby="memory-title"><button className="close" type="button" aria-label="Close operational memory" onClick={() => setMemoryIssueId("")}>×</button><p className="eyebrow">OPERATIONAL MEMORY</p><h2 id="memory-title">{memoryIssue.title}</h2><p className="memory-modal-copy">Capture enough context that the next person—or future you—can recognise and resolve this faster.</p><label>Symptoms and impact<textarea name="symptoms" defaultValue={memoryIssue.memory?.symptoms ?? memoryIssue.details} placeholder="What did users or systems experience?"/></label><label>Root cause<textarea name="rootCause" defaultValue={memoryIssue.memory?.rootCause ?? ""} placeholder="What actually produced the failure?"/></label><label>Resolution<textarea name="resolution" defaultValue={memoryIssue.memory?.resolution ?? memoryIssue.outcome} placeholder="What restored service or completed the work?" required/></label><label>Learning<textarea name="learning" defaultValue={memoryIssue.memory?.learning ?? ""} placeholder="What should be repeated, changed, or avoided next time?" required/></label><label>Follow-up actions<textarea name="followUp" defaultValue={memoryIssue.memory?.followUp ?? ""} placeholder="Monitoring, automation, documentation, or prevention work…"/></label><div className="check-in-actions"><button className="secondary" type="button" onClick={() => setMemoryIssueId("")}>Cancel</button><button className="primary" type="submit">Save operational memory</button></div></form></div>}
    {showDailyCheckIn && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowDailyCheckIn(false); }}><form className="daily-check-in-modal" onSubmit={saveDailyCheckIn} role="dialog" aria-modal="true" aria-labelledby="daily-check-in-title"><button className="close" type="button" aria-label="Close daily check-in" onClick={() => setShowDailyCheckIn(false)}>×</button><div className="check-in-heading"><p className="eyebrow">TWO-MINUTE WRAP-UP</p><h2 id="daily-check-in-title">How did today actually move?</h2><p>Review the operational facts, then make tomorrow realistic for the capacity you have.</p></div><div className="check-in-facts"><div><strong>{completedToday.length}</strong><span>completed today</span></div><div className={overdueCount ? "needs-care" : ""}><strong>{overdueCount}</strong><span>currently overdue</span></div><div><strong>{openCount}</strong><span>still open</span></div></div><fieldset className="capacity-picker"><legend>What capacity are you planning with?</legend><p>This stays private in Signal Petal and is never included in copied work summaries.</p><div>{([['high','Strong','I have room for demanding work'],['steady','Steady','A normal, focused load'],['low','Limited','Protect the essentials']] as const).map(([value,label,copy]) => <button key={value} type="button" className={checkInCapacity === value ? "is-selected" : ""} aria-pressed={checkInCapacity === value} onClick={() => setCheckInCapacity(value)}><strong>{label}</strong><small>{copy}</small></button>)}</div></fieldset>{issues.some(issue => !isCompleteStatus(issue.status)) && <fieldset className="park-picker"><legend>What can intentionally wait?</legend><p>Parking does not change status or ETA. It records the boundary in today’s brief.</p><div>{issues.filter(issue => !isCompleteStatus(issue.status)).slice(0,8).map(issue => <label key={issue.id}><input type="checkbox" checked={checkInParked.includes(issue.id)} onChange={() => setCheckInParked(ids => ids.includes(issue.id) ? ids.filter(id => id !== issue.id) : [...ids, issue.id])}/><span><strong>{issue.title}</strong><small>{issue.owner} · {isOverdue(issue) ? `${daysOverdue(issue)}d overdue` : dateLabel(issue.expected)}</small></span></label>)}</div></fieldset>}<label className="check-in-note">What should tomorrow-you know? <small>optional</small><textarea value={checkInNote} onChange={event => setCheckInNote(event.target.value)} placeholder="A decision, constraint, win, or first move for tomorrow…"/></label><div className="check-in-preview"><p className="eyebrow">YOUR BRIEF WILL CAPTURE</p><span>{completedToday.length} completed · {overdueCount} overdue · {checkInParked.length} intentionally waiting · {checkInCapacity} capacity</span></div><div className="check-in-actions"><button className="secondary" type="button" onClick={() => setShowDailyCheckIn(false)}>Cancel</button><button className="primary" type="submit">{todayCheckIn ? "Update today’s brief" : "Save daily brief"}</button></div>{dailyCheckIns.length > 0 && <div className="check-in-history"><p className="eyebrow">RECENT BRIEFS</p>{dailyCheckIns.slice(0,3).map(checkIn => <article key={checkIn.id}><time>{dateLabel(checkIn.at)}</time><p>{checkIn.brief}</p></article>)}</div>}</form></div>}
    {confirmEntry && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setConfirmDiaryDelete(""); }}>
      <section className="confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="confirm-diary-title">
        <h2 id="confirm-diary-title">Delete this reflection?</h2>
        <p>“{confirmEntry.title || "Untitled reflection"}” from {dateLabel(confirmEntry.at)}. Its place in your calendar and insights goes with it. You will get a short window to undo.</p>
        <div className="confirm-actions"><button className="secondary" type="button" onClick={() => setConfirmDiaryDelete("")}>Keep it</button><button className="delete" type="button" onClick={() => deleteDiaryEntry(confirmEntry)}>Delete</button></div>
      </section>
    </div>}
    {win && !undo && <div className="undo-bar is-win" role="status"><span className="win-mark" aria-hidden="true">✓</span><span className="win-copy"><strong>{clip(win.title, 46)} is done.</strong><small>{win.span} from logged to closed{completedToday.length > 1 ? ` · ${completedToday.length} closed today` : ""}</small></span><button className="undo-dismiss" type="button" aria-label="Dismiss" onClick={() => setWin(null)}>×</button></div>}
    {undo && <div className="undo-bar" role="status"><span>{undo.label}</span><button type="button" onClick={() => { undo.restore(); setUndo(null); }}>Undo</button><button className="undo-dismiss" type="button" aria-label="Dismiss" onClick={() => setUndo(null)}>×</button></div>}
    {showLockSetup && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowLockSetup(false); }}>
      <form className="confirm-card lock-setup" onSubmit={enableDiaryLock} role="dialog" aria-modal="true" aria-labelledby="lock-setup-title">
        <h2 id="lock-setup-title">Lock the diary</h2>
        <p>Your reflections will be encrypted on this computer with a key made from this passphrase. The key is never saved.</p>
        <p className="lock-warning"><strong>There is no recovery.</strong> Forget the passphrase and these pages are gone for good — not by me, not by anyone. Write it down somewhere safe before you continue.</p>
        <label>Passphrase <small>at least 8 characters</small><input type="password" autoComplete="new-password" value={lockPass} onChange={event => setLockPass(event.target.value)} required minLength={8}/></label>
        <label>Type it again<input type="password" autoComplete="new-password" value={lockConfirm} onChange={event => setLockConfirm(event.target.value)} required/></label>
        <label className="lock-check"><input type="checkbox" checked={lockUnderstood} onChange={event => setLockUnderstood(event.target.checked)}/><span>I understand that losing this passphrase means losing the diary.</span></label>
        {lockMessage && <p className="lock-message" role="status">{lockMessage}</p>}
        <div className="confirm-actions"><button className="secondary" type="button" onClick={() => { setShowLockSetup(false); setLockMessage(""); }}>Cancel</button><button className="primary" type="submit" disabled={lockBusy}>{lockBusy ? "Locking…" : "Lock the diary"}</button></div>
      </form>
    </div>}
    {showCreate && <div className="modal-backdrop" role="presentation"><form className="modal" onSubmit={addIssue}><button className="close" type="button" onClick={() => setShowCreate(false)}>×</button><p className="eyebrow">NEW WORK ITEM</p><h2>Log/Track</h2><label>Title<input required name="title" placeholder="What needs attention?"/></label><label>Details<textarea name="details" placeholder="Context, impact, links, and useful clues…"/></label><div className="form-grid"><label>Primary owner<input name="owner" placeholder={personalOwner} onChange={onOwnerInput}/></label><label>Expected update<input name="expected" type="datetime-local"/></label></div><div className="people-field"><span>Follow-up people</span>{newFollowUps.length > 0 && <div className="people-chips">{newFollowUps.map(person => <span className="person-chip" key={person}>{person}<button type="button" aria-label={`Remove ${person}`} onClick={() => setNewFollowUps(items => items.filter(name => name !== person))}>×</button></span>)}</div>}<div className="people-add"><input value={newFollowUpInput} onChange={e => onNameInput(e, setNewFollowUpInput)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addNewFollowUps(); } }} placeholder="Add names, separated by commas" aria-label="Follow-up people to add"/><button className="secondary" type="button" onClick={addNewFollowUps}>+ Add people</button></div><small>Optional. These people will only be tracked inside this issue.</small></div><label>Current action<textarea name="action" placeholder="What are they—or you—doing next?"/></label><button className="primary create" type="submit">Create issue</button></form></div>}
    {showDeleteConfirm && active && <div className="modal-backdrop confirm-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description"><span className="confirm-icon">!</span><h2 id="delete-title">Delete this issue?</h2><p id="delete-description">“{active.title}” and its update history will be permanently removed.</p><div className="confirm-actions"><button className="secondary" type="button" autoFocus onClick={() => setShowDeleteConfirm(false)}>Keep issue</button><button className="danger" type="button" onClick={deleteIssue}>Delete issue</button></div></section></div>}
    {hydrated && !profile && <div className="profile-backdrop"><form className="profile-card" onSubmit={saveProfile} role="dialog" aria-modal="true" aria-labelledby="setup-title"><span className="profile-mark"><Petal size={31}/></span><p className="eyebrow">WELCOME TO SIGNAL PETAL</p><h1 id="setup-title">Let&apos;s make this yours.</h1><p>Tell us a little about yourself and we&apos;ll personalize your workspace. This stays only in this browser.</p><label>Your name<input required name="name" autoFocus placeholder="e.g. Aesi"/></label><label>Your role<input required name="role" placeholder="e.g. Site Reliability Engineer"/></label><button className="primary" type="submit">Create my workspace</button><div className="profile-restore"><span>Coming back after losing your data?</span><label className="file-button">Restore from a backup file<input type="file" accept="application/json,.json" onChange={restoreFromFile}/></label>{transferMessage && <small role="status">{transferMessage}</small>}</div></form></div>}
  </main>;
}
