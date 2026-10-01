import { useMemo, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "../../../server/routers";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Bell,
  CalendarPlus,
  BrainCircuit,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Dumbbell,
  Flame,
  HeartPulse,
  Home as HomeIcon,
  Info,
  Leaf,
  LineChart,
  LoaderCircle,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  Trophy,
  UserPlus,
  Users,
  Upload,
  Waves,
  Zap,
} from "lucide-react";
import { GlassCard, TiltCard } from "@/components/GlassCard";

type ViewKey = "overview" | "habits" | "insights" | "social" | "events" | "alerts" | "settings";
type DashboardData = inferRouterOutputs<AppRouter>["dashboard"]["get"];
type ParsedEntry = { habitType: string; value: number; date: string; note?: string };
type SocialData = inferRouterOutputs<AppRouter>["social"]["home"];
type EventRows = inferRouterOutputs<AppRouter>["events"]["list"];
type AlertData = inferRouterOutputs<AppRouter>["alerts"]["list"];

const navigation: { key: ViewKey; label: string; icon: typeof HomeIcon }[] = [
  { key: "overview", label: "Overview", icon: HomeIcon },
  { key: "habits", label: "Habits", icon: Target },
  { key: "insights", label: "Insights", icon: LineChart },
  { key: "social", label: "Friends", icon: Users },
  { key: "events", label: "Events", icon: CalendarPlus },
];
const weekLabels = ["M", "T", "W", "T", "F", "S", "S"];
const fallbackReadingBars = [44, 62, 34, 74, 58, 88, 76];
const sleepTrend = [45, 56, 49, 68, 61, 76, 73];

function dateKey(date = new Date()) { return date.toISOString().slice(0, 10); }
function weekDates() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return weekLabels.map((_, index) => { const day = new Date(monday); day.setDate(monday.getDate() + index); return dateKey(day); });
}
function displayName(user: { name?: string | null } | null | undefined) { return user?.name?.split(" ")[0] || "Jordan"; }

function PageTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="page-title"><div className="eyebrow"><span className="eyebrow__dot" />{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>;
}

function MiniMetric({ label, value, detail, icon: Icon, accent = "ember" }: { label: string; value: string; detail: string; icon: typeof Flame; accent?: "ember" | "gold" | "teal" }) {
  return <GlassCard variant="flat" className="mini-metric"><div className={`mini-metric__icon mini-metric__icon--${accent}`}><Icon size={17} strokeWidth={2.2} /></div><div className="mini-metric__copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><ArrowUpRight className="mini-metric__arrow" size={16} /></GlassCard>;
}

function ProgressRing({ value, label, sublabel }: { value: number; label: string; sublabel: string }) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - Math.min(value, 1) * circumference;
  return <div className="progress-ring" aria-label={`${Math.round(value * 100)} percent complete`}><svg viewBox="0 0 120 120" role="img"><circle className="progress-ring__track" cx="60" cy="60" r={radius} /><circle className="progress-ring__value" cx="60" cy="60" r={radius} strokeDasharray={circumference} strokeDashoffset={offset} /></svg><div className="progress-ring__label"><strong>{label}</strong><span>{sublabel}</span></div></div>;
}

function SparkBars({ values }: { values: number[] }) {
  return <div className="spark-bars" aria-label="Seven day activity bars">{values.map((height, index) => <span key={`${height}-${index}`} style={{ height: `${height}%` }} className={index === values.length - 1 ? "is-today" : ""} />)}</div>;
}

function SleepLine() {
  const points = sleepTrend.map((value, index) => `${index * 36 + 4},${90 - value}`).join(" ");
  return <svg className="sleep-line" viewBox="0 0 220 100" preserveAspectRatio="none" role="img" aria-label="Seven day sleep trend"><defs><linearGradient id="sleepFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5aa889" stopOpacity="0.28" /><stop offset="100%" stopColor="#5aa889" stopOpacity="0" /></linearGradient></defs><polygon points={`4,90 ${points} 220,90`} fill="url(#sleepFill)" /><polyline points={points} fill="none" stroke="#76c5a1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />{sleepTrend.map((value, index) => <circle key={index} cx={index * 36 + 4} cy={90 - value} r="2.8" fill="#d8efdf" />)}</svg>;
}

function AppNav({ active, onChange, unreadCount }: { active: ViewKey; onChange: (key: ViewKey) => void; unreadCount: number }) {
  const items = [...navigation, { key: "alerts" as ViewKey, label: "Alerts", icon: Bell }];
  return <><aside className="sidebar"><div className="brand"><div className="brand__mark"><Leaf size={20} /></div><span>NIXESIS</span><em>25</em></div><div className="sidebar__section-label">YOUR ARC</div><nav className="sidebar__nav" aria-label="Main navigation">{items.map(({ key, label, icon: Icon }) => <button key={key} className={active === key ? "nav-item is-active" : "nav-item"} onClick={() => onChange(key)}><Icon size={18} /><span>{label}</span>{key === "alerts" && unreadCount > 0 && <span className="nav-item__badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}{active === key && <span className="nav-item__active-dot" />}</button>)}<button className={active === "settings" ? "nav-item is-active" : "nav-item"} onClick={() => onChange("settings")}><Settings size={18} /><span>Settings</span></button></nav><div className="sidebar__bottom"><div className="sidebar__quote"><Sparkles size={16} /><p>Small acts, repeated daily, become a different life.</p></div><div className="sidebar__version"><span>WINTER ARC</span><strong>01 <i>/</i> 25</strong></div></div></aside><nav className="mobile-nav" aria-label="Mobile navigation">{navigation.slice(0, 3).map(({ key, label, icon: Icon }) => <button key={key} className={active === key ? "mobile-nav__item is-active" : "mobile-nav__item"} onClick={() => onChange(key)}><Icon size={19} /><span>{label}</span></button>)}<button className={active === "social" ? "mobile-nav__item is-active" : "mobile-nav__item"} onClick={() => onChange("social")}><Users size={19} /><span>Friends</span></button><button className={active === "alerts" ? "mobile-nav__item is-active" : "mobile-nav__item"} onClick={() => onChange("alerts")}><Bell size={19} /><span>Alerts</span>{unreadCount > 0 && <b>{unreadCount}</b>}</button></nav></>;
}

function DashboardHeader({ active, user, onSignIn }: { active: ViewKey; user: { name?: string | null } | null | undefined; onSignIn: () => void }) {
  const currentDate = useMemo(() => new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" }).format(new Date()), []);
  const labels: Record<ViewKey, string> = { overview: "Overview", habits: "Habits", insights: "Insights", social: "Friends", events: "Events", alerts: "Alerts", settings: "Settings" };
  return <header className="topbar"><div className="topbar__crumb"><span>NIXESIS</span><span>/</span><strong>{labels[active]}</strong></div><div className="topbar__actions"><div className="date-pill"><CalendarDays size={15} /><span>{currentDate}</span></div><button className="profile-pill" onClick={onSignIn} aria-label={user ? "Open profile menu" : "Sign in"}><span className="profile-pill__avatar">{user ? displayName(user).slice(0, 2).toUpperCase() : "--"}</span><span className="profile-pill__name">{user ? displayName(user) : "Sign in"}</span>{user && <ChevronDown size={14} />}</button></div></header>;
}

function TodayRhythm({ dashboard, isAuthenticated }: { dashboard?: DashboardData; isAuthenticated: boolean }) {
  const [localReading, setLocalReading] = useState<number | null>(null);
  const [logText, setLogText] = useState("");
  const [parsedEntries, setParsedEntries] = useState<ParsedEntry[]>([]);
  const readingHabit = dashboard?.habits.find((habit) => habit.type === "reading");
  const today = dateKey();
  const persistedReading = dashboard?.logs.filter((log) => log.habitId === readingHabit?.id && log.loggedAt === today).reduce((total, log) => total + Number(log.value), 0) ?? 15;
  const readingMinutes = localReading ?? persistedReading;
  const goal = dashboard?.profile ? Number(dashboard.profile.readingGoalMinutes) : 20;
  const progress = Math.min(readingMinutes / goal, 1);
  const utils = trpc.useUtils();
  const logMutation = trpc.habits.log.useMutation({ onSuccess: () => utils.dashboard.get.invalidate() });
  const parseMutation = trpc.ai.parseNaturalLanguage.useMutation();
  const addReading = (amount: number) => {
    const next = readingMinutes + amount;
    setLocalReading(next);
    if (isAuthenticated && readingHabit) logMutation.mutate({ habitId: readingHabit.id, loggedAt: today, value: next });
  };
  const parseText = async () => {
    if (!logText.trim()) return;
    if (!isAuthenticated) { setParsedEntries([{ habitType: "reading", value: 25, date: today }]); return; }
    try {
      const result = await parseMutation.mutateAsync({ text: logText });
      setParsedEntries(result.entries as ParsedEntry[]);
    } catch {
      setParsedEntries([]);
    }
  };
  const applyEntries = () => {
    parsedEntries.forEach((entry) => {
      const habit = dashboard?.habits.find((item) => item.type === entry.habitType);
      if (isAuthenticated && habit) logMutation.mutate({ habitId: habit.id, loggedAt: entry.date, value: entry.value, note: entry.note });
      if (entry.habitType === "reading") setLocalReading((current) => (current ?? readingMinutes) + entry.value);
    });
    setParsedEntries([]); setLogText("");
  };
  const bars = dashboard ? weekLabels.map((_, index) => { const day = new Date(); day.setDate(day.getDate() - (6 - index)); const key = dateKey(day); return Math.min(100, (dashboard.logs.filter((log) => log.habitId === readingHabit?.id && log.loggedAt === key).reduce((total, log) => total + Number(log.value), 0) / goal) * 100 || 0); }) : fallbackReadingBars;
  return <TiltCard className="rhythm-card"><div className="card-header"><div><div className="card-kicker"><BookOpen size={14} />FOCUS HABIT</div><h2>Today’s rhythm</h2></div><button className="icon-button" aria-label="More rhythm options"><MoreHorizontal size={18} /></button></div><div className="rhythm-card__body"><div className="reading-block"><ProgressRing value={progress} label={`${readingMinutes}`} sublabel={`of ${goal} min`} /><div className="reading-copy"><span className="reading-copy__label">Reading</span><strong>{readingMinutes >= goal ? "Goal reached" : `${goal - readingMinutes} min to go`}</strong><p>A quiet page is still a step forward.</p></div></div><div className="rhythm-card__divider" /><div className="rhythm-card__week"><div className="week-head"><span>LAST 7 DAYS</span><span className="week-head__trend"><TrendingUpIcon /> {dashboard ? "LIVE" : "+18%"}</span></div><SparkBars values={bars} /><div className="week-labels">{weekLabels.map((label, index) => <span key={index} className={index === 6 ? "is-today" : ""}>{label}</span>)}</div></div></div><div className="quick-add"><span>Quick add</span><div className="quick-add__actions">{[5, 10, 15].map((amount) => <button key={amount} onClick={() => addReading(amount)} disabled={logMutation.isPending}><Plus size={13} />{amount}</button>)}</div></div><div className="log-line"><div className="log-line__input"><Zap size={15} /><input value={logText} onChange={(event) => setLogText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void parseText(); }} placeholder="Log your day… e.g. read 25 min" /><button onClick={() => void parseText()} aria-label="Parse natural language log">{parseMutation.isPending ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />}</button></div></div>{parsedEntries.length > 0 && <div className="confirm-log"><div className="confirm-log__check"><Check size={13} /></div><div><strong>{parsedEntries.map((entry) => `${entry.habitType} · ${entry.value}`).join(", ")}</strong><span>Review before adding to your day</span></div><button onClick={applyEntries}>Apply</button><button className="confirm-log__close" onClick={() => setParsedEntries([])} aria-label="Dismiss"><Info size={14} /></button></div>}</TiltCard>;
}

function AIInsight({ insight, isAuthenticated }: { insight?: DashboardData["insight"]; isAuthenticated: boolean }) {
  const [generated, setGenerated] = useState<DashboardData["insight"]>();
  const summaryMutation = trpc.ai.weeklySummary.useMutation({ onSuccess: (data) => setGenerated(data) });
  const activeInsight = generated ?? insight;
  return <TiltCard variant="glowing" className="insight-card"><div className="insight-card__orb"><div className="insight-card__orb-inner"><BrainCircuit size={23} /></div></div><div className="card-kicker card-kicker--gold"><Sparkles size={14} />AI INSIGHT · THIS WEEK</div><h2>{activeInsight?.content ? "Your consistency is compounding." : "Your next insight is waiting."}</h2><p>{activeInsight?.content ?? "Let Nixesis read the shape of your week and turn it into one kind, specific next step."}</p><div className="insight-card__footer"><span><span className="pulse-dot" />{activeInsight ? "Cached this week" : "Private server-side analysis"}</span><button disabled={!isAuthenticated || summaryMutation.isPending} onClick={() => summaryMutation.mutate()}>{summaryMutation.isPending ? "Reading…" : activeInsight ? "Refresh recap" : "Generate recap"} <ArrowUpRight size={14} /></button></div></TiltCard>;
}

function GymCard({ dashboard, isAuthenticated }: { dashboard?: DashboardData; isAuthenticated: boolean }) {
  const [localDays, setLocalDays] = useState<boolean[] | null>(null);
  const dates = weekDates();
  const gymHabit = dashboard?.habits.find((habit) => habit.type === "gym");
  const persistedDays = dates.map((date) => Boolean(dashboard?.logs.some((log) => log.habitId === gymHabit?.id && log.loggedAt === date && Number(log.value) > 0)));
  const gymDays = localDays ?? (dashboard ? persistedDays : [true, true, false, true, false, false, false]);
  const completed = gymDays.filter(Boolean).length;
  const utils = trpc.useUtils();
  const logMutation = trpc.habits.log.useMutation({ onSuccess: () => utils.dashboard.get.invalidate() });
  const removeMutation = trpc.habits.removeLog.useMutation({ onSuccess: () => utils.dashboard.get.invalidate() });
  const toggle = (index: number) => {
    const next = gymDays.map((day, dayIndex) => dayIndex === index ? !day : day);
    setLocalDays(next);
    if (!isAuthenticated || !gymHabit) return;
    if (next[index]) logMutation.mutate({ habitId: gymHabit.id, loggedAt: dates[index], value: 1 });
    else removeMutation.mutate({ habitId: gymHabit.id, loggedAt: dates[index] });
  };
  return <TiltCard className={`gym-card ${completed >= 4 ? "is-complete" : ""}`}><div className="card-header"><div><div className="card-kicker card-kicker--ember"><Dumbbell size={14} />MOVEMENT</div><h2>Gym consistency</h2></div><div className="streak-badge"><Flame size={15} />{completed >= 4 ? "Target hit" : "4 day target"}</div></div><div className="gym-card__summary"><strong>{completed}<span>/4</span></strong><p>sessions this week<br /><small>{completed >= 4 ? "You showed up for yourself." : `${4 - completed} more to lock this week.`}</small></p></div><div className="day-pills">{gymDays.map((checked, index) => <button key={index} className={checked ? "day-pill is-checked" : "day-pill"} onClick={() => toggle(index)}><span>{weekLabels[index]}</span>{checked && <Check size={13} />}</button>)}</div><div className="card-footnote"><span><span className="legend-dot legend-dot--ember" />Tap a day to log movement</span><span>Live sync <span className="live-dot" /></span></div></TiltCard>;
}

function SleepCard({ dashboard }: { dashboard?: DashboardData }) {
  const sleepHabit = dashboard?.habits.find((habit) => habit.type === "sleep");
  const lastSleep = dashboard?.logs.find((log) => log.habitId === sleepHabit?.id);
  const duration = lastSleep ? Number(lastSleep.value) : 7.57;
  return <TiltCard className="sleep-card"><div className="card-header"><div><div className="card-kicker card-kicker--teal"><Moon size={14} />RECOVERY</div><h2>Sleep window</h2></div><button className="icon-button" aria-label="Reset sleep window"><TimerReset size={17} /></button></div><div className="sleep-card__times"><div><span>BEDTIME</span><strong>11:08 <small>PM</small></strong></div><div className="sleep-card__connector"><span /><Clock3 size={14} /><span /></div><div className="sleep-card__time--right"><span>WAKE</span><strong>06:42 <small>AM</small></strong></div></div><div className="sleep-card__duration"><span><HeartPulse size={14} />Last night</span><strong>{Math.floor(duration)}h {Math.round((duration % 1) * 60)}m</strong><em>{lastSleep ? "synced" : "+22m"}</em></div><SleepLine /><div className="week-labels sleep-labels">{weekLabels.map((label, index) => <span key={index} className={index === 6 ? "is-today" : ""}>{label}</span>)}</div></TiltCard>;
}

function MomentumCard() {
  return <GlassCard variant="flat" className="momentum-card"><div className="card-header"><div><div className="card-kicker"><Activity size={14} />MOMENTUM</div><h2>Focus score</h2></div><span className="score-change"><TrendingUpIcon /> +6.4%</span></div><div className="momentum-card__score"><strong>84</strong><span>/ 100</span><div className="score-track"><span /></div></div><div className="momentum-card__stats"><span><i className="stat-dot stat-dot--green" />Consistency <strong>92%</strong></span><span><i className="stat-dot stat-dot--orange" />Energy <strong>78%</strong></span></div></GlassCard>;
}

function HabitsView({ dashboard, isAuthenticated }: { dashboard?: DashboardData; isAuthenticated: boolean }) {
  const [name, setName] = useState("");
  const [created, setCreated] = useState(false);
  const utils = trpc.useUtils();
  const createMutation = trpc.habits.create.useMutation({ onSuccess: () => { setCreated(true); setName(""); void utils.dashboard.get.invalidate(); } });
  const habits = dashboard?.habits ?? [];
  return <div className="subview"><PageTitle eyebrow="THE DAILY SYSTEM" title="Make the next rep easy." description="Your habits are the smallest reliable units of change. Keep them visible, keep them kind." /><div className="habits-grid">{habits.map((habit) => <GlassCard key={habit.id} className={`habit-detail habit-detail--${habit.type}`}><div className="habit-detail__icon">{habit.type === "reading" ? <BookOpen size={19} /> : habit.type === "gym" ? <Dumbbell size={19} /> : habit.type === "sleep" ? <Moon size={19} /> : <Target size={19} />}</div><div><span>{habit.frequencyType === "weekly_count" ? "WEEKLY" : "DAILY"} · {habit.targetValue} {habit.unit.toUpperCase()}</span><h2>{habit.name}</h2><p>{habit.type === "reading" ? "Quiet focus builds a longer attention span." : habit.type === "gym" ? "Train the promise, not just the muscle." : habit.type === "sleep" ? "Recovery is part of the work." : "Make the system fit your life."}</p></div><strong>{habit.targetValue}<small> target</small></strong><button className="primary-button">Log {habit.unit} <Plus size={15} /></button></GlassCard>)}<div className="add-habit"><Plus size={19} /><span><strong>Create a custom habit</strong><small>{created ? "Saved — it will appear on your dashboard." : "Make the system fit your life"}</small></span><input aria-label="Custom habit name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" /><button className="primary-button" disabled={!isAuthenticated || name.trim().length < 2 || createMutation.isPending} onClick={() => createMutation.mutate({ name: name.trim(), icon: "target", type: "custom", frequencyType: "daily", targetValue: 1, unit: "times" })}>{createMutation.isPending ? "Saving…" : "Add"}</button></div></div></div>;
}

function InsightsView({ dashboard, isAuthenticated }: { dashboard?: DashboardData; isAuthenticated: boolean }) {
  return <div className="subview"><PageTitle eyebrow="PATTERNS, NOT PRESSURE" title="Read your momentum." description="A softer look at the signals behind your week — what’s working, what’s drifting, and what to protect." /><div className="insights-grid"><GlassCard variant="glowing" className="insight-large"><div className="insight-large__heading"><div className="insight-card__orb insight-card__orb--small"><div className="insight-card__orb-inner"><Sparkles size={19} /></div></div><div><span className="card-kicker card-kicker--gold">WEEKLY ASSESSMENT</span><h2>{dashboard?.insight ? "Progress is a practice." : "Your patterns are forming."}</h2></div></div><p>{dashboard?.insight?.content ?? "Generate your first private weekly assessment from the Overview tab after a few logs are in place."}</p><div className="insight-large__action"><span><Trophy size={15} /> {isAuthenticated ? dashboard?.insight?.actionableSuggestion ?? "Keep one small promise today." : "Sign in to sync your patterns"}</span><button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Back to overview <ArrowUpRight size={14} /></button></div></GlassCard><MomentumCard /><GlassCard className="pattern-card"><div className="card-header"><div><div className="card-kicker card-kicker--teal"><Waves size={14} />WEEKLY SHAPE</div><h2>Where energy goes</h2></div><span className="pattern-caption">Past 7 days</span></div><div className="pattern-bars">{[58, 42, 76, 69, 91, 54, 68].map((height, index) => <div key={index}><span style={{ height: `${height}%` }} className={index === 4 ? "is-high" : ""} /><small>{weekLabels[index]}</small></div>)}</div></GlassCard></div></div>;
}

function SettingsView({ user }: { user: { name?: string | null; email?: string | null } | null | undefined }) {
  const auth = useAuth();
  const supabaseStatus = trpc.supabase.status.useQuery(undefined, { enabled: auth.isAuthenticated, staleTime: 60_000 });
  const backupLabel = supabaseStatus.data?.configured ? "Supabase cloud backup active" : "Local backup provider active";
  return <div className="subview"><PageTitle eyebrow="YOUR SPACE" title="Tune the system." description="Keep the dashboard aligned with the life you’re actually building." /><div className="settings-grid"><GlassCard className="settings-card"><div className="settings-card__profile"><div className="settings-avatar">{displayName(user).slice(0, 2).toUpperCase()}</div><div><span>ACCOUNT</span><h2>{user?.name ?? "Guest mode"}</h2><p>{user?.email ?? "Sign in to save your rhythm"}</p></div><button className="icon-button" onClick={() => user ? void auth.logout() : startLogin()}><ArrowUpRight size={17} /></button></div>{[["Profile & timezone", "UTC", CalendarDays], ["Daily reading goal", "20 minutes", BookOpen], ["Weekly gym target", "4 sessions", Dumbbell], ["Sleep goal", "8 hours", Moon]].map(([label, value, Icon]) => <button className="setting-row" key={label as string}><span className="setting-row__icon"><Icon size={16} /></span><span><strong>{label as string}</strong><small>{value as string}</small></span><ChevronDown size={15} /></button>)}</GlassCard><GlassCard className="settings-card settings-card--security"><div className="card-kicker card-kicker--teal"><ShieldCheck size={14} />YOUR DATA</div><h2>Private by design.</h2><p>Your logs stay yours. Nixesis uses your patterns to guide your next step, never to grade your worth.</p><div className="privacy-line"><span><span className="live-dot" />{backupLabel}</span><span className="shield-icon"><Check size={12} /></span></div><button className="secondary-button" onClick={() => user ? void auth.logout() : startLogin()}>{user ? "Sign out" : "Sign in"} <Settings size={15} /></button></GlassCard></div></div>;
}

function SignInPrompt({ title, description }: { title: string; description: string }) {
  return <GlassCard className="signin-prompt"><div className="signin-prompt__icon"><Users size={22} /></div><div><span className="card-kicker card-kicker--gold">MEMBERS ONLY</span><h2>{title}</h2><p>{description}</p></div><button className="primary-button" onClick={() => startLogin()}>Sign in <ArrowUpRight size={14} /></button></GlassCard>;
}

function SocialView({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [query, setQuery] = useState("");
  const socialQuery = trpc.social.home.useQuery(undefined, { enabled: isAuthenticated });
  const searchQuery = trpc.social.search.useQuery({ query }, { enabled: isAuthenticated && query.trim().length >= 2 });
  const utils = trpc.useUtils();
  const sendMutation = trpc.social.sendRequest.useMutation({ onSuccess: () => { void utils.social.home.invalidate(); void utils.alerts.list.invalidate(); setQuery(""); } });
  const respondMutation = trpc.social.respond.useMutation({ onSuccess: () => { void utils.social.home.invalidate(); void utils.alerts.list.invalidate(); } });
  if (!isAuthenticated) return <div className="subview"><PageTitle eyebrow="YOUR PEOPLE" title="Progress is better together." description="Share the shape of your week with a friend, without turning the journey into a scoreboard." /><SignInPrompt title="Sign in to find your people" description="Your dashboard stays private until you choose to connect with someone." /></div>;
  const data = socialQuery.data;
  return <div className="subview"><PageTitle eyebrow="YOUR PEOPLE" title="Progress is better together." description="Share the shape of your week with friends. No public feed, no pressure — just a small circle that keeps showing up." /><div className="social-toolbar"><div className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or email" /></div><span className="privacy-caption"><ShieldCheck size={14} /> Only accepted friends see your progress</span></div>{query.trim().length >= 2 && <div className="search-results">{searchQuery.isLoading ? <span className="muted-line">Searching…</span> : searchQuery.data?.length ? searchQuery.data.map((person) => <div className="person-row" key={person.id}><span className="person-avatar">{person.name.slice(0, 2).toUpperCase()}</span><span><strong>{person.name}</strong><small>{person.email || "Nixesis member"}</small></span><button className="secondary-button" onClick={() => sendMutation.mutate({ userId: person.id })}><UserPlus size={14} /> Add</button></div>) : <span className="muted-line">No members found yet. Ask your friend to sign in first.</span>}</div>}<div className="social-grid"><GlassCard className="friend-card friend-card--invite"><div className="friend-card__top"><div className="friend-card__icon"><UserPlus size={18} /></div><span className="card-kicker card-kicker--gold">BUILD YOUR CIRCLE</span></div><h2>Invite someone who gets it.</h2><p>Search their name or email above. Once they accept, you’ll both see a gentle seven-day snapshot.</p><div className="friend-card__rule"><CheckCircle2 size={15} /> No public leaderboards</div></GlassCard>{data?.incoming.map((request) => <GlassCard className="friend-card" key={request.requestId}><div className="friend-card__top"><div className="person-avatar">{request.name.slice(0, 2).toUpperCase()}</div><span className="card-kicker">FRIEND REQUEST</span></div><h2>{request.name}</h2><p>Wants to share progress with you.</p><div className="friend-actions"><button className="primary-button" onClick={() => respondMutation.mutate({ requestId: request.requestId, accept: true })}><Check size={14} /> Accept</button><button className="text-button" onClick={() => respondMutation.mutate({ requestId: request.requestId, accept: false })}>Not now</button></div></GlassCard>)}{data?.friends.map((friend) => <GlassCard className="friend-card" key={friend.id}><div className="friend-card__top"><div className="person-avatar person-avatar--teal">{friend.name.slice(0, 2).toUpperCase()}</div><span className="card-kicker card-kicker--teal">SHARED ARC</span></div><h2>{friend.name}</h2><div className="friend-stats"><div><strong>{friend.progress.readingMinutes}</strong><span>reading min</span></div><div><strong>{friend.progress.gymSessions}</strong><span>gym sessions</span></div><div><strong>{friend.progress.completedHabits}</strong><span>habit wins</span></div></div><div className="friend-progress"><span /><small>Last 7 days · synced moments ago</small></div></GlassCard>)}{data && data.friends.length === 0 && data.incoming.length === 0 && <GlassCard className="empty-card"><Users size={22} /><h2>Your circle starts here.</h2><p>Invite your friend above and their progress will appear here after they accept.</p></GlassCard>}</div></div>;
}

function EventsView({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<"competition" | "group_goal" | "meetup">("competition");
  const [metric, setMetric] = useState<"reading_minutes" | "gym_sessions" | "sleep_hours" | "habit_completions">("habit_completions");
  const [startDate, setStartDate] = useState(dateKey());
  const [endDate, setEndDate] = useState(dateKey(new Date(Date.now() + 6 * 86400000)));
  const [goalValue, setGoalValue] = useState("10");
  const [inviteIds, setInviteIds] = useState<number[]>([]);
  const socialQuery = trpc.social.home.useQuery(undefined, { enabled: isAuthenticated });
  const eventsQuery = trpc.events.list.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();
  const createMutation = trpc.events.create.useMutation({ onSuccess: () => { setShowCreate(false); setTitle(""); setDescription(""); void utils.events.list.invalidate(); void utils.alerts.list.invalidate(); } });
  const joinMutation = trpc.events.join.useMutation({ onSuccess: () => { void utils.events.list.invalidate(); void utils.alerts.list.invalidate(); } });
  if (!isAuthenticated) return <div className="subview"><PageTitle eyebrow="THE COMMON ROOM" title="Make a challenge worth joining." description="Organise a friendly competition, a shared goal, or a low-key meetup around the habits you care about." /><SignInPrompt title="Sign in to organise events" description="Create events, invite friends, and keep the whole group moving together." /></div>;
  return <div className="subview"><div className="page-title-row"><PageTitle eyebrow="THE COMMON ROOM" title="Make a challenge worth joining." description="Organise a friendly competition, a shared goal, or a low-key meetup around the habits you care about." /><button className="primary-button" onClick={() => setShowCreate((open) => !open)}><CalendarPlus size={15} /> {showCreate ? "Close" : "Organise event"}</button></div>{showCreate && <GlassCard className="event-form"><div className="form-grid"><label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Seven-day reading sprint" /></label><label>Format<select value={eventType} onChange={(event) => setEventType(event.target.value as typeof eventType)}><option value="competition">Friendly competition</option><option value="group_goal">Shared goal</option><option value="meetup">Meetup</option></select></label><label>Metric<select value={metric} onChange={(event) => setMetric(event.target.value as typeof metric)}><option value="habit_completions">Habit completions</option><option value="reading_minutes">Reading minutes</option><option value="gym_sessions">Gym sessions</option><option value="sleep_hours">Sleep hours</option></select></label><label>Goal<input type="number" min="1" value={goalValue} onChange={(event) => setGoalValue(event.target.value)} /></label><label>Starts<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>Ends<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label><label className="form-span-2">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What will make this feel fun and doable?" /></label></div><div className="invite-picker"><span className="card-kicker">INVITE FRIENDS</span>{socialQuery.data?.friends.length ? socialQuery.data.friends.map((friend) => <button key={friend.id} className={inviteIds.includes(friend.id) ? "invite-chip is-selected" : "invite-chip"} onClick={() => setInviteIds((ids) => ids.includes(friend.id) ? ids.filter((id) => id !== friend.id) : [...ids, friend.id])}><span>{friend.name.slice(0, 2).toUpperCase()}</span>{friend.name}{inviteIds.includes(friend.id) && <Check size={13} />}</button>) : <small>Add friends in the Friends tab first.</small>}</div><button className="primary-button form-submit" disabled={title.trim().length < 3 || createMutation.isPending} onClick={() => createMutation.mutate({ title: title.trim(), description: description.trim() || undefined, eventType, metric, startDate, endDate, goalValue: Number(goalValue), inviteUserIds: inviteIds })}>{createMutation.isPending ? "Creating…" : "Create event"} <ArrowUpRight size={14} /></button></GlassCard>}<div className="events-grid">{eventsQuery.data?.map((event) => <GlassCard className="event-card" key={event.id}><div className="event-card__top"><span className={`event-type event-type--${event.eventType}`}>{event.eventType === "competition" ? <Trophy size={13} /> : event.eventType === "meetup" ? <Users size={13} /> : <Target size={13} />}{event.eventType.replace("_", " ")}</span><span className="event-date">{event.startDate} → {event.endDate}</span></div><h2>{event.title}</h2><p>{event.description || "Show up together and let the small wins compound."}</p><div className="event-card__meta"><span><strong>{event.participants.length}</strong> joined</span><span><strong>{event.goalValue || "—"}</strong> goal</span><span>by {event.organizer.name}</span></div><div className="event-card__people">{event.participants.slice(0, 5).map((person) => <span key={person.id} title={person.name}>{person.name.slice(0, 2).toUpperCase()}</span>)}{event.participants.length > 5 && <span>+{event.participants.length - 5}</span>}</div><button className={event.isJoined ? "secondary-button is-joined" : "primary-button"} disabled={event.isJoined || joinMutation.isPending} onClick={() => joinMutation.mutate({ eventId: event.id })}>{event.isJoined ? <><Check size={14} /> You’re in</> : <>Join event <ArrowUpRight size={14} /></>}</button></GlassCard>)}{eventsQuery.data?.length === 0 && <GlassCard className="empty-card"><CalendarPlus size={22} /><h2>No events yet.</h2><p>Organise the first challenge and invite your circle.</p></GlassCard>}</div></div>;
}

function AlertsView({ isAuthenticated }: { isAuthenticated: boolean }) {
  const alertsQuery = trpc.alerts.list.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: isAuthenticated ? 30_000 : false });
  const utils = trpc.useUtils();
  const markReadMutation = trpc.alerts.markRead.useMutation({ onSuccess: () => void utils.alerts.list.invalidate() });
  if (!isAuthenticated) return <div className="subview"><PageTitle eyebrow="YOUR SIGNALS" title="Keep the important nudges close." description="Friend requests, event invitations, and small signs of momentum will collect here." /><SignInPrompt title="Sign in to receive alerts" description="Your alerts are private and only generated by actions that involve you." /></div>;
  const rows = alertsQuery.data?.rows ?? [];
  return <div className="subview"><div className="page-title-row"><PageTitle eyebrow="YOUR SIGNALS" title="Keep the important nudges close." description="Friend requests, event invitations, and small signs of momentum will collect here." />{rows.some((row) => !row.isRead) && <button className="secondary-button" onClick={() => markReadMutation.mutate({})}>Mark all read</button>}</div><div className="alerts-list">{rows.map((alert) => <button key={alert.id} className={alert.isRead ? "alert-row is-read" : "alert-row"} onClick={() => !alert.isRead && markReadMutation.mutate({ alertId: alert.id })}><span className="alert-row__icon">{alert.kind.includes("friend") ? <Users size={16} /> : alert.kind.includes("event") ? <CalendarPlus size={16} /> : <Bell size={16} />}</span><span><strong>{alert.title}</strong><small>{alert.message}</small><em>{new Date(alert.createdAt).toLocaleString()}</em></span>{!alert.isRead && <i />}</button>)}{rows.length === 0 && <GlassCard className="empty-card"><Bell size={22} /><h2>All quiet, in a good way.</h2><p>When a friend accepts or an event starts, you’ll see it here.</p></GlassCard>}</div></div>;
}

function ShieldIcon() { return <span className="shield-icon"><Check size={12} /></span>; }
function TrendingUpIcon() { return <ArrowUpRight size={13} />; }

function StravaImport({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [parsed, setParsed] = useState<{ distanceKm: number; durationSeconds: number; pace: string; activityDate: string; sourceScreenshotUrl: string } | null>(null);
  const uploadMutation = trpc.strava.upload.useMutation();
  const parseMutation = trpc.ai.parseStrava.useMutation();
  const confirmMutation = trpc.strava.confirm.useMutation();
  const handleFile = async (file?: File) => {
    if (!file || !isAuthenticated || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const result = String(reader.result);
      const base64 = result.split(",")[1] ?? "";
      try {
        const uploaded = await uploadMutation.mutateAsync({ fileName: file.name, contentType: file.type, base64 });
        const metrics = await parseMutation.mutateAsync({ imageUrl: uploaded.signedUrl });
        setParsed({ ...metrics, sourceScreenshotUrl: uploaded.url });
      } catch {
        setParsed(null);
      }
    };
    reader.readAsDataURL(file);
  };
  const busy = uploadMutation.isPending || parseMutation.isPending;
  return <div className="strava-import-wrap"><label className="sync-note sync-note-button"><input type="file" accept="image/*" hidden onChange={(event) => void handleFile(event.target.files?.[0])} /><span className="sync-note__icon">{busy ? <LoaderCircle size={14} className="animate-spin" /> : <Upload size={14} />}</span><span><strong>{busy ? "Reading screenshot…" : "Strava import"}</strong><small>{isAuthenticated ? "Upload a screenshot for AI parsing" : "Sign in to enable screenshot parsing"}</small></span><ArrowUpRight size={15} /></label>{parsed && <div className="strava-confirm"><div><strong>{parsed.distanceKm} km · {parsed.pace}</strong><span>{parsed.durationSeconds}s · {parsed.activityDate}</span></div><button disabled={confirmMutation.isPending} onClick={() => confirmMutation.mutate(parsed, { onSuccess: () => setParsed(null) })}>{confirmMutation.isPending ? "Saving…" : "Confirm"}</button><button className="strava-confirm__dismiss" onClick={() => setParsed(null)}>Dismiss</button></div>}</div>;
}

function OverviewView({ dashboard, isAuthenticated }: { dashboard?: DashboardData; isAuthenticated: boolean }) {
  const readingGoal = dashboard?.profile.readingGoalMinutes ?? 20;
  const currentReading = dashboard?.logs.filter((log) => log.loggedAt === dateKey() && dashboard.habits.find((habit) => habit.id === log.habitId)?.type === "reading").reduce((total, log) => total + Number(log.value), 0) ?? 15;
  return <div className="overview"><div className="hero-row"><PageTitle eyebrow="MONDAY · WINTER ARC 01" title="Build your winter arc." description="A clear mind is built in small, repeated moments. Here’s your shape for today." /><div className="hero-row__side"><div className="focus-chip"><span className="focus-chip__icon"><Sparkles size={15} /></span><span><small>FOCUS WEATHER</small><strong>{isAuthenticated ? "Live & steady" : "Preview mode"}</strong></span><span className="focus-chip__bar"><i /></span></div><button className="help-button"><Info size={15} />How it works</button></div></div><div className="metrics-row"><MiniMetric label="Current streak" value={currentReading >= readingGoal ? "1 day" : "12 days"} detail="Best: 18 days" icon={Flame} /><MiniMetric label="Focus score" value="84 / 100" detail="+6.4% this week" icon={BrainCircuit} accent="teal" /><MiniMetric label="Weekly arc" value={`${dashboard?.habits.length ?? 3} habits`} detail={isAuthenticated ? "Synced to your account" : "Preview data"} icon={Trophy} accent="gold" /></div><div className="overview-grid"><TodayRhythm dashboard={dashboard} isAuthenticated={isAuthenticated} /><AIInsight insight={dashboard?.insight} isAuthenticated={isAuthenticated} /><GymCard dashboard={dashboard} isAuthenticated={isAuthenticated} /><SleepCard dashboard={dashboard} /><MomentumCard /></div><div className="bottom-row"><div className="streak-warning"><div className="streak-warning__icon"><Flame size={18} /></div><div><strong>Your streak is still warm.</strong><span>{currentReading >= readingGoal ? "You made today count. Protect the next small promise." : `A ${readingGoal} minute reading session before midnight keeps today alive.`}</span></div><button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Keep it going <ArrowUpRight size={14} /></button></div><StravaImport isAuthenticated={isAuthenticated} /></div></div>;
}

export default function Home() {
  const [active, setActive] = useState<ViewKey>("overview");
  const auth = useAuth();
  const dashboardQuery = trpc.dashboard.get.useQuery(undefined, { enabled: auth.isAuthenticated, retry: false, staleTime: 30_000 });
  const alertsQuery = trpc.alerts.list.useQuery(undefined, { enabled: auth.isAuthenticated, refetchInterval: auth.isAuthenticated ? 30_000 : false });
  const dashboard = dashboardQuery.data;
  const content = active === "overview" ? <OverviewView dashboard={dashboard} isAuthenticated={auth.isAuthenticated} /> : active === "habits" ? <HabitsView dashboard={dashboard} isAuthenticated={auth.isAuthenticated} /> : active === "insights" ? <InsightsView dashboard={dashboard} isAuthenticated={auth.isAuthenticated} /> : active === "social" ? <SocialView isAuthenticated={auth.isAuthenticated} /> : active === "events" ? <EventsView isAuthenticated={auth.isAuthenticated} /> : active === "alerts" ? <AlertsView isAuthenticated={auth.isAuthenticated} /> : <SettingsView user={auth.user} />;
  return <div className="app-shell"><div className="ambient ambient--one" /><div className="ambient ambient--two" /><div className="particle-field" aria-hidden="true">{Array.from({ length: 12 }).map((_, index) => <span key={index} style={{ "--i": index } as React.CSSProperties} />)}</div><AppNav active={active} onChange={setActive} unreadCount={alertsQuery.data?.unreadCount ?? 0} /><main className="main-content"><DashboardHeader active={active} user={auth.user} onSignIn={() => auth.user ? setActive("settings") : startLogin()} />{dashboardQuery.isLoading && auth.isAuthenticated && <div className="data-sync"><LoaderCircle size={14} className="animate-spin" /> Syncing your arc…</div>}{content}</main></div>;
}
