"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  communityActivity,
  leaderboard,
  primaryTabs,
  prototypeData,
  prototypeSeries,
  roundSections,
  seriesById,
  teamMap,
  type PrototypeComment,
  type PrototypeLeaderboardEntry,
  type PrototypeSeries,
  type PrototypeSlot,
} from "@/lib/playoffs-prototype-data";

type PrimaryTab = (typeof primaryTabs)[number]["id"];
type SlotSide = "teamA" | "teamB";
type PredictionRecord = {
  winner: SlotSide;
  wager: number;
};
type DetailScreen =
  | {
      type: "series";
      seriesId: string;
      returnTo: PrimaryTab;
    }
  | {
      type: "prediction";
      seriesId: string;
      returnTo: PrimaryTab;
    }
  | {
      type: "friend";
      userId: string;
      returnTo: PrimaryTab;
    };

const wagerOptions = [50, 120, 250, 500];
const previewSeriesIds = ["east-r1-2", "west-r1-2", "west-r1-4"];
const quickStats = [
  { label: "Playoff teams locked", value: "13/16" },
  { label: "Bracket slots still moving", value: "3" },
  { label: "Most active hub", value: "18.9K" },
];

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const toneClasses: Record<PrototypeSeries["statusTone"], string> = {
  hot: "border-rose-400/30 bg-rose-500/15 text-rose-100",
  watch: "border-sky-400/30 bg-sky-500/15 text-sky-100",
  locked: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
  pending: "border-white/12 bg-white/[0.06] text-slate-200",
};

const pickStatusClasses: Record<
  PrototypeLeaderboardEntry["bracketPreview"][number]["status"],
  string
> = {
  correct: "border-emerald-400/30 bg-emerald-500/12 text-emerald-100",
  incorrect: "border-rose-400/30 bg-rose-500/12 text-rose-100",
  pending: "border-white/12 bg-white/[0.05] text-slate-200",
};

function hexToRgba(hex: string, alpha: number) {
  const cleaned = hex.replace("#", "");
  const value = Number.parseInt(cleaned, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getSlotTeams(slot: PrototypeSlot) {
  return slot.candidateTeamIds
    .map((teamId) => teamMap[teamId])
    .filter(Boolean);
}

function getSlotColors(slot: PrototypeSlot) {
  const [first, second, third] = getSlotTeams(slot);

  return {
    primary:
      slot.type === "team" && slot.teamId
        ? teamMap[slot.teamId].colors.primary
        : first?.colors.primary ?? "#334155",
    secondary:
      slot.type === "team" && slot.teamId
        ? teamMap[slot.teamId].colors.secondary
        : second?.colors.secondary ?? first?.colors.secondary ?? "#94A3B8",
    accent:
      slot.type === "team" && slot.teamId
        ? teamMap[slot.teamId].colors.accent
        : third?.colors.accent ?? first?.colors.accent ?? "#E2E8F0",
  };
}

function getSeriesGradient(series: PrototypeSeries) {
  const left = getSlotColors(series.teamA);
  const right = getSlotColors(series.teamB);

  return {
    backgroundImage: `
      linear-gradient(140deg, ${hexToRgba(left.primary, 0.25)}, rgba(8, 12, 24, 0.98) 52%, ${hexToRgba(right.primary, 0.25)}),
      radial-gradient(circle at top left, ${hexToRgba(left.secondary, 0.18)}, transparent 40%),
      radial-gradient(circle at bottom right, ${hexToRgba(right.secondary, 0.14)}, transparent 44%)
    `,
  };
}

function getSlotLabel(slot: PrototypeSlot) {
  return slot.shortLabel;
}

function getWinningSlotLabel(series: PrototypeSeries, side: SlotSide) {
  return side === "teamA" ? getSlotLabel(series.teamA) : getSlotLabel(series.teamB);
}

function aggregateReactions(comments: PrototypeComment[]) {
  const totals: Record<string, number> = {
    "🔥": 0,
    "🏀": 0,
    "😳": 0,
  };

  for (const comment of comments) {
    for (const reaction of comment.reactions) {
      totals[reaction.emoji] = (totals[reaction.emoji] ?? 0) + reaction.count;
    }
  }

  return Object.entries(totals).map(([emoji, count]) => ({
    emoji,
    count: count > 999 ? `${(count / 1000).toFixed(1)}K` : `${count}`,
  }));
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cx("h-5 w-5", active ? "text-white" : "text-slate-400")}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.8V20h13V9.8" />
    </svg>
  );
}

function BracketIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cx("h-5 w-5", active ? "text-white" : "text-slate-400")}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 5h5v5H4zM4 14h5v5H4zM15 9.5h5v5h-5z" />
      <path d="M9 7.5h3.5v4h2.5M9 16.5h3.5v-4h2.5" />
    </svg>
  );
}

function TrophyIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cx("h-5 w-5", active ? "text-white" : "text-slate-400")}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 4h8v3a4 4 0 0 1-8 0z" />
      <path d="M9 18h6M12 11v7M6 5H4a2 2 0 0 0 2 4h1M18 5h2a2 2 0 0 1-2 4h-1" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="h-4 w-4 text-slate-300"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m7 4 6 6-6 6" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="h-4 w-4 text-slate-50"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 4 7 10l6 6" />
    </svg>
  );
}

function CoinsIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="h-4 w-4 text-amber-200"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="10" cy="6" rx="5.5" ry="2.5" />
      <path d="M4.5 6v5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V6" />
      <path d="M4.5 11v3c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-3" />
    </svg>
  );
}

function SurfaceCard({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cx(
        "rounded-[28px] border border-white/10 bg-white/[0.05] p-4 shadow-[0_18px_60px_rgba(2,6,23,0.55)] backdrop-blur",
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-display text-[1.65rem] uppercase leading-none tracking-[0.05em] text-white">
          {title}
        </h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-300">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function SlotBadge({ slot, size = "md" }: { slot: PrototypeSlot; size?: "md" | "lg" }) {
  const teams = getSlotTeams(slot);
  const badgeSize = size === "lg" ? "h-12 w-12" : "h-10 w-10";

  if (slot.type === "team" && slot.teamId) {
    return (
      <div
        className={cx(
          "grid shrink-0 place-items-center rounded-2xl border border-white/14 bg-white/[0.08] shadow-inner shadow-black/30",
          badgeSize,
        )}
      >
        <Image
          src={teamMap[slot.teamId].logo}
          alt={`${slot.label} logo`}
          width={size === "lg" ? 36 : 30}
          height={size === "lg" ? 36 : 30}
          unoptimized
          className="h-auto w-auto"
        />
      </div>
    );
  }

  const colors = getSlotColors(slot);

  return (
    <div
      className={cx(
        "relative shrink-0 overflow-hidden rounded-2xl border border-white/14 shadow-inner shadow-black/30",
        badgeSize,
      )}
      style={{
        backgroundImage: `linear-gradient(145deg, ${hexToRgba(
          colors.primary,
          0.88,
        )}, ${hexToRgba(colors.secondary, 0.88)})`,
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.24),transparent_45%)]" />
      <div className="relative flex h-full items-center justify-center">
        <div className="flex items-center">
          {teams.slice(0, 2).map((team, index) => (
            <div
              key={team.id}
              className={cx(
                "grid place-items-center rounded-full border border-white/20 bg-slate-950/70 p-0.5",
                index > 0 && "-ml-2",
              )}
            >
              <Image
                src={team.logo}
                alt={`${team.shortName} logo`}
                width={size === "lg" ? 22 : 18}
                height={size === "lg" ? 22 : 18}
                unoptimized
                className="h-auto w-auto"
              />
            </div>
          ))}
          {teams.length > 2 ? (
            <span className="-ml-2 rounded-full border border-white/20 bg-slate-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              +{teams.length - 2}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SlotRow({
  slot,
  percentage,
  compact = false,
}: {
  slot: PrototypeSlot;
  percentage?: number;
  compact?: boolean;
}) {
  return (
    <div
      className={cx(
        "flex items-center gap-3 rounded-[22px] border border-white/10 bg-black/20",
        compact ? "p-3" : "p-3.5",
      )}
    >
      <SlotBadge slot={slot} size={compact ? "md" : "lg"} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {slot.seed ? (
            <span className="rounded-full border border-white/10 bg-white/[0.08] px-2 py-0.5 text-[11px] font-semibold text-slate-200">
              ({slot.seed})
            </span>
          ) : null}
          <p className="truncate text-sm font-semibold text-white">{slot.label}</p>
        </div>
        {slot.note ? <p className="mt-1 text-xs text-slate-400">{slot.note}</p> : null}
      </div>
      {typeof percentage === "number" ? (
        <div className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-slate-100">
          {percentage}%
        </div>
      ) : null}
    </div>
  );
}

function ProgressBar({
  leftLabel,
  rightLabel,
  leftValue,
  rightValue,
}: {
  leftLabel: string;
  rightLabel: string;
  leftValue: number;
  rightValue: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="flex h-full">
          <div
            className="h-full rounded-r-full bg-gradient-to-r from-sky-400 to-cyan-300"
            style={{ width: `${leftValue}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-amber-300 to-orange-400"
            style={{ width: `${rightValue}%` }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-100">
        <span>{leftValue}%</span>
        <span>{rightValue}%</span>
      </div>
    </div>
  );
}

function MiniSeriesButton({
  series,
  onOpen,
}: {
  series: PrototypeSeries;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-[24px] border border-white/10 bg-white/[0.04] p-3 text-left transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <SlotBadge slot={series.teamA} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {getSlotLabel(series.teamA)}
              </p>
              <p className="text-xs text-slate-400">{series.community.teamA}% picked</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SlotBadge slot={series.teamB} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {getSlotLabel(series.teamB)}
              </p>
              <p className="text-xs text-slate-400">{series.community.teamB}% picked</p>
            </div>
          </div>
        </div>
        <ChevronIcon />
      </div>
      <p className="mt-3 text-xs text-slate-400">{series.activeLabel}</p>
    </button>
  );
}

function FeaturedSeriesCard({
  series,
  onOpenSeries,
  onPredict,
}: {
  series: PrototypeSeries;
  onOpenSeries: () => void;
  onPredict: () => void;
}) {
  return (
    <SurfaceCard style={getSeriesGradient(series)} className="overflow-hidden p-0">
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">
              Featured Series
            </p>
            <p className="mt-1 text-sm text-slate-200">{series.cardNote}</p>
          </div>
          <span
            className={cx(
              "rounded-full border px-3 py-1 text-[11px] font-semibold",
              toneClasses[series.statusTone],
            )}
          >
            {series.activeLabel}
          </span>
        </div>
        <div className="mt-4 space-y-3">
          <SlotRow slot={series.teamA} percentage={series.community.teamA} compact />
          <SlotRow slot={series.teamB} percentage={series.community.teamB} compact />
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-black/30 p-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Series Score</p>
            <p className="mt-1 text-2xl font-semibold text-white">{series.score}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Fans discussing</p>
            <p className="mt-1 text-lg font-semibold text-white">{series.fansDiscussing}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-100">{series.preview}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onOpenSeries}
            className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition active:scale-[0.98]"
          >
            Open Series Hub
          </button>
          <button
            type="button"
            onClick={onPredict}
            className="rounded-2xl border border-white/16 bg-black/30 px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
          >
            Predict Next Game
          </button>
        </div>
      </div>
    </SurfaceCard>
  );
}

function BracketCard({
  series,
  onOpen,
}: {
  series: PrototypeSeries;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left transition active:scale-[0.99]"
    >
      <SurfaceCard style={getSeriesGradient(series)} className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
            <span>{series.conference}</span>
            <span className="text-slate-500">/</span>
            <span>{series.round}</span>
          </div>
          <span
            className={cx(
              "rounded-full border px-3 py-1 text-[11px] font-semibold",
              toneClasses[series.statusTone],
            )}
          >
            {series.status}
          </span>
        </div>

        <div className="mt-4 space-y-3">
          <SlotRow slot={series.teamA} percentage={series.community.teamA} compact />
          <SlotRow slot={series.teamB} percentage={series.community.teamB} compact />
        </div>

        <div className="mt-4 rounded-[22px] border border-white/10 bg-black/25 p-3">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Series</span>
            <span className="font-semibold text-white">{series.score}</span>
          </div>
          <div className="mt-3">
            <ProgressBar
              leftLabel={getSlotLabel(series.teamA)}
              rightLabel={getSlotLabel(series.teamB)}
              leftValue={series.community.teamA}
              rightValue={series.community.teamB}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-sm leading-6 text-slate-200">{series.cardNote}</p>
          <ChevronIcon />
        </div>
      </SurfaceCard>
    </button>
  );
}

function PlayoffsPrototypeApp() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<PrimaryTab>("home");
  const [detailScreen, setDetailScreen] = useState<DetailScreen | null>(null);
  const [coins, setCoins] = useState(prototypeData.user.coins);
  const [predictions, setPredictions] = useState<Record<string, PredictionRecord>>({});
  const [draftWinner, setDraftWinner] = useState<SlotSide | null>(null);
  const [draftWager, setDraftWager] = useState<number>(250);
  const [predictionMessage, setPredictionMessage] = useState<string | null>(null);
  const [activityFeed, setActivityFeed] = useState(communityActivity);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentsBySeries, setCommentsBySeries] = useState<Record<string, PrototypeComment[]>>(
    () =>
      Object.fromEntries(
        prototypeSeries.map((series) => [series.id, [...series.comments]]),
      ) as Record<string, PrototypeComment[]>,
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab, detailScreen]);

  const selectedSeriesId =
    detailScreen &&
    (detailScreen.type === "series" || detailScreen.type === "prediction")
      ? detailScreen.seriesId
      : prototypeData.home.featuredSeriesId;
  const selectedSeries = seriesById[selectedSeriesId];
  const featuredSeries = seriesById[prototypeData.home.featuredSeriesId];
  const selectedUser =
    detailScreen && detailScreen.type === "friend"
      ? leaderboard.find((entry) => entry.id === detailScreen.userId) ?? leaderboard[0]
      : leaderboard[0];
  const visibleComments = commentsBySeries[selectedSeries.id] ?? selectedSeries.comments;
  const userPrediction = predictions[selectedSeries.id];
  const reactionTotals = aggregateReactions(visibleComments);

  const openSeries = (seriesId: string, returnTo: PrimaryTab) => {
    setDetailScreen({ type: "series", seriesId, returnTo });
  };

  const openPrediction = (seriesId: string, returnTo: PrimaryTab) => {
    const existing = predictions[seriesId];
    setDraftWinner(existing?.winner ?? "teamA");
    setDraftWager(existing?.wager ?? 250);
    setPredictionMessage(null);
    setDetailScreen({ type: "prediction", seriesId, returnTo });
  };

  const openFriendBracket = (userId: string) => {
    setDetailScreen({ type: "friend", userId, returnTo: "leaderboard" });
  };

  const goBack = () => {
    if (!detailScreen) {
      return;
    }

    if (detailScreen.type === "prediction") {
      setDetailScreen({
        type: "series",
        seriesId: detailScreen.seriesId,
        returnTo: detailScreen.returnTo,
      });
      return;
    }

    setDetailScreen(null);
    setActiveTab(detailScreen.returnTo);
  };

  const updateActivity = (
    user: string,
    action: string,
    detail: string,
    tone: "prediction" | "comment" | "wager",
    seriesId?: string,
  ) => {
    setActivityFeed((current) => [
      {
        id: `${user}-${Date.now()}`,
        user,
        action,
        detail,
        tone,
        time: "Just now",
        seriesId,
      },
      ...current.slice(0, 5),
    ]);
  };

  const confirmPrediction = () => {
    if (!detailScreen || detailScreen.type !== "prediction" || !draftWinner) {
      return;
    }

    const series = seriesById[detailScreen.seriesId];
    const previous = predictions[detailScreen.seriesId];
    const delta = draftWager - (previous?.wager ?? 0);

    if (delta > coins) {
      return;
    }

    setPredictions((current) => ({
      ...current,
      [detailScreen.seriesId]: {
        winner: draftWinner,
        wager: draftWager,
      },
    }));
    setCoins((current) => current - delta);
    setPredictionMessage(
      `Locked in ${draftWager} Coins on ${getWinningSlotLabel(series, draftWinner)} for the next game.`,
    );
    updateActivity(
      "You",
      "predicted",
      `${getWinningSlotLabel(series, draftWinner)} in the next game`,
      "prediction",
      series.id,
    );
  };

  const submitComment = () => {
    const draft = commentDrafts[selectedSeries.id]?.trim();

    if (!draft) {
      return;
    }

    const nextComment: PrototypeComment = {
      id: `comment-${Date.now()}`,
      user: "You",
      flair: "Your bracket",
      time: "Just now",
      text: draft,
      reactions: [
        { emoji: "🔥", count: 0 },
        { emoji: "🏀", count: 0 },
        { emoji: "😳", count: 0 },
      ],
    };

    setCommentsBySeries((current) => ({
      ...current,
      [selectedSeries.id]: [nextComment, ...(current[selectedSeries.id] ?? [])],
    }));
    setCommentDrafts((current) => ({
      ...current,
      [selectedSeries.id]: "",
    }));
    updateActivity("You", "commented on", `${getSlotLabel(selectedSeries.teamA)} vs ${getSlotLabel(selectedSeries.teamB)}`, "comment", selectedSeries.id);
  };

  const reactToComment = (seriesId: string, commentId: string, emoji: string) => {
    setCommentsBySeries((current) => ({
      ...current,
      [seriesId]: (current[seriesId] ?? []).map((comment) =>
        comment.id !== commentId
          ? comment
          : {
              ...comment,
              reactions: comment.reactions.map((reaction) =>
                reaction.emoji === emoji
                  ? {
                      ...reaction,
                      count: reaction.count + 1,
                    }
                  : reaction,
              ),
            },
      ),
    }));
  };

  const renderHome = () => (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-300">
            {prototypeData.asOfLabel}
          </p>
          <h1 className="mt-2 font-display text-[2.8rem] uppercase leading-[0.9] tracking-[0.04em] text-white">
            NBA Playoffs
          </h1>
          <p className="mt-2 max-w-[26rem] text-sm leading-6 text-slate-300">
            {prototypeData.home.heroCopy}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-right">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-100">
            <CoinsIcon />
            <span>{coins} Coins</span>
          </div>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-amber-200/80">
            Wallet
          </p>
        </div>
      </div>

      <SurfaceCard
        style={{
          backgroundImage:
            "linear-gradient(145deg, rgba(56,189,248,0.18), rgba(15,23,42,0.98) 46%, rgba(249,115,22,0.22)), radial-gradient(circle at top right, rgba(251,191,36,0.14), transparent 35%)",
        }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-200">
          Control Center
        </p>
        <h2 className="mt-2 font-display text-[2rem] uppercase leading-none text-white">
          {prototypeData.home.heroTitle}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-200">
          Tap a matchup, jump into its Series Hub, and watch how one play-in result or one Game 1 upset changes every friend bracket around you.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {quickStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[20px] border border-white/10 bg-black/25 p-3"
            >
              <p className="text-lg font-semibold text-white">{stat.value}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveTab("bracket");
              setDetailScreen(null);
            }}
            className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition active:scale-[0.98]"
          >
            Open Full Bracket
          </button>
          <button
            type="button"
            onClick={() => openSeries(featuredSeries.id, "home")}
            className="rounded-2xl border border-white/16 bg-black/25 px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
          >
            Jump to Series Hub
          </button>
        </div>
      </SurfaceCard>

      <div>
        <SectionHeader
          eyebrow="Preview"
          title="Live Bracket Map"
          subtitle="Three quick jumps into the branches fans are checking most."
          action={
            <button
              type="button"
              onClick={() => {
                setActiveTab("bracket");
                setDetailScreen(null);
              }}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200"
            >
              Full bracket
            </button>
          }
        />
        <div className="space-y-3">
          {previewSeriesIds.map((seriesId) => (
            <MiniSeriesButton
              key={seriesId}
              series={seriesById[seriesId]}
              onOpen={() => openSeries(seriesId, "home")}
            />
          ))}
        </div>
      </div>

      <div>
        <SectionHeader
          eyebrow="Spotlight"
          title="Featured Series"
          subtitle="The most followed matchup in the product right now."
        />
        <FeaturedSeriesCard
          series={featuredSeries}
          onOpenSeries={() => openSeries(featuredSeries.id, "home")}
          onPredict={() => openPrediction(featuredSeries.id, "home")}
        />
      </div>

      <div>
        <SectionHeader
          eyebrow="Schedule"
          title="Upcoming Games"
          subtitle="Tonight's play-in games still reshape the playoff bracket."
        />
        <div className="space-y-3">
          {prototypeData.upcomingGames.map((game) => (
            <button
              type="button"
              key={game.id}
              onClick={() => {
                if (game.id === "upcoming-1") {
                  openSeries("east-r1-2", "home");
                  return;
                }
                if (game.id === "upcoming-2") {
                  openSeries("west-r1-1", "home");
                  return;
                }
                if (game.id === "upcoming-3") {
                  openSeries("east-r1-4", "home");
                  return;
                }
                openSeries("west-r1-4", "home");
              }}
              className="w-full text-left"
            >
              <SurfaceCard className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {game.label}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-white">{game.matchup}</h3>
                    <p className="mt-1 text-sm text-slate-300">{game.window}</p>
                  </div>
                  <ChevronIcon />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-200">{game.note}</p>
                <div className="mt-3 rounded-[20px] border border-sky-400/12 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
                  {game.impact}
                </div>
              </SurfaceCard>
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionHeader
          eyebrow="Compete"
          title="Leaderboard Preview"
          subtitle="Tap any player to view their bracket path."
          action={
            <button
              type="button"
              onClick={() => {
                setActiveTab("leaderboard");
                setDetailScreen(null);
              }}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200"
            >
              View all
            </button>
          }
        />
        <div className="space-y-3">
          {leaderboard.slice(0, 3).map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => openFriendBracket(entry.id)}
              className="w-full text-left"
            >
              <SurfaceCard className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-sm font-semibold text-white">
                      #{entry.rank}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-white">{entry.username}</p>
                      <p className="text-sm text-slate-400">
                        {entry.points} pts • {entry.correctPicks} correct • {entry.recentAccuracy} recent
                      </p>
                    </div>
                  </div>
                  <ChevronIcon />
                </div>
                <div className="mt-3 rounded-[20px] border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200">
                  Favorite call: {entry.favoriteCall}
                </div>
              </SurfaceCard>
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionHeader
          eyebrow="Community"
          title="Recent Activity"
          subtitle="The bracket feed lives inside every series thread."
        />
        <div className="space-y-3">
          {activityFeed.slice(0, 5).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.seriesId) {
                  openSeries(item.seriesId, "home");
                }
              }}
              className="w-full text-left"
            >
              <SurfaceCard className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {item.user} {item.action} {item.detail}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">{item.time}</p>
                  </div>
                  <span
                    className={cx(
                      "rounded-full border px-3 py-1 text-[11px] font-semibold",
                      item.tone === "prediction" && "border-sky-400/20 bg-sky-500/10 text-sky-100",
                      item.tone === "comment" && "border-violet-400/20 bg-violet-500/10 text-violet-100",
                      item.tone === "wager" && "border-amber-400/20 bg-amber-500/10 text-amber-100",
                    )}
                  >
                    {item.tone}
                  </span>
                </div>
              </SurfaceCard>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderBracket = () => (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          Bracket Navigation
        </p>
        <h1 className="mt-2 font-display text-[2.6rem] uppercase leading-[0.92] tracking-[0.05em] text-white">
          Playoff Map
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Every matchup is a doorway into its own Series Hub with predictions, wagers, friend picks, player form and playoff conversation.
        </p>
      </div>

      {roundSections.map((section) => (
        <div key={section.title} className="space-y-3">
          <SectionHeader
            eyebrow={section.title}
            title={section.title}
            subtitle={section.description}
          />
          <div className="space-y-3">
            {section.seriesIds.map((seriesId) => (
              <BracketCard
                key={seriesId}
                series={seriesById[seriesId]}
                onOpen={() => openSeries(seriesId, "bracket")}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderSeriesHub = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-semibold text-white"
        >
          <BackIcon />
          Back
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("leaderboard");
            setDetailScreen(null);
          }}
          className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-semibold text-slate-200"
        >
          Leaderboard
        </button>
      </div>

      <SurfaceCard style={getSeriesGradient(selectedSeries)} className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">
              {selectedSeries.conference} • {selectedSeries.round}
            </p>
            <h1 className="mt-2 font-display text-[2.2rem] uppercase leading-none text-white">
              Series Hub
            </h1>
          </div>
          <span
            className={cx(
              "rounded-full border px-3 py-1 text-[11px] font-semibold",
              toneClasses[selectedSeries.statusTone],
            )}
          >
            {selectedSeries.status}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="space-y-3">
            <SlotRow slot={selectedSeries.teamA} compact />
          </div>
          <div className="rounded-full border border-white/12 bg-black/25 px-3 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-100">
            VS
          </div>
          <div className="space-y-3">
            <SlotRow slot={selectedSeries.teamB} compact />
          </div>
        </div>

        <div className="mt-4 rounded-[24px] border border-white/10 bg-black/25 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Series Score</p>
              <p className="mt-1 text-3xl font-semibold text-white">{selectedSeries.score}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Fans discussing</p>
              <p className="mt-1 text-xl font-semibold text-white">{selectedSeries.fansDiscussing}</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-200">{selectedSeries.preview}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() =>
              openPrediction(
                selectedSeries.id,
                detailScreen && detailScreen.type === "series"
                  ? detailScreen.returnTo
                  : activeTab,
              )
            }
            className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition active:scale-[0.98]"
          >
            Predict Next Game
          </button>
          <button
            type="button"
            onClick={() =>
              openPrediction(
                selectedSeries.id,
                detailScreen && detailScreen.type === "series"
                  ? detailScreen.returnTo
                  : activeTab,
              )
            }
            className="rounded-2xl border border-white/16 bg-black/25 px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
          >
            Wager Coins
          </button>
        </div>

        {userPrediction ? (
          <div className="mt-4 rounded-[22px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Your latest call: {getWinningSlotLabel(selectedSeries, userPrediction.winner)} •{" "}
            {userPrediction.wager} Coins
          </div>
        ) : null}
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader
          eyebrow="Schedule"
          title="Game Window"
          subtitle="The next tap from the bracket should always tell you exactly what is coming."
        />
        <div className="space-y-3">
          {selectedSeries.schedule.map((item) => (
            <div
              key={`${selectedSeries.id}-${item.label}`}
              className="flex items-start justify-between gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] p-3"
            >
              <div>
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="mt-1 text-sm text-slate-300">
                  {item.date} • {item.time}
                </p>
                <p className="mt-1 text-xs text-slate-400">{item.venue}</p>
              </div>
              {item.note ? (
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold text-slate-200">
                  {item.note}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader
          eyebrow="Community"
          title="Pick Split"
          subtitle={selectedSeries.impactStat}
        />
        <ProgressBar
          leftLabel={getSlotLabel(selectedSeries.teamA)}
          rightLabel={getSlotLabel(selectedSeries.teamB)}
          leftValue={selectedSeries.community.teamA}
          rightValue={selectedSeries.community.teamB}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Friends on {getSlotLabel(selectedSeries.teamA)}
            </p>
            <div className="mt-3 space-y-2">
              {selectedSeries.friends
                .filter((friend) => friend.side === "teamA")
                .map((friend) => (
                  <div
                    key={`${selectedSeries.id}-${friend.name}`}
                    className="rounded-2xl border border-white/10 bg-black/25 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{friend.name}</p>
                      <span className="text-xs text-slate-300">{friend.confidence}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{friend.note}</p>
                  </div>
                ))}
            </div>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Friends on {getSlotLabel(selectedSeries.teamB)}
            </p>
            <div className="mt-3 space-y-2">
              {selectedSeries.friends
                .filter((friend) => friend.side === "teamB")
                .map((friend) => (
                  <div
                    key={`${selectedSeries.id}-${friend.name}`}
                    className="rounded-2xl border border-white/10 bg-black/25 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{friend.name}</p>
                      <span className="text-xs text-slate-300">{friend.confidence}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{friend.note}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader
          eyebrow="Form"
          title="Recent Game Results"
          subtitle="Pre-series form and play-in results flow directly into the bracket story."
        />
        <div className="space-y-3">
          {selectedSeries.recentResults.map((result) => (
            <div
              key={`${selectedSeries.id}-${result.label}-${result.result}`}
              className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4"
            >
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{result.label}</p>
              <p className="mt-1 text-base font-semibold text-white">{result.result}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{result.detail}</p>
            </div>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader
          eyebrow="Players"
          title="Top Performances"
          subtitle="The quick-scan stat lines fans want before they make a pick."
        />
        <div className="space-y-3">
          {selectedSeries.playerPerformances.map((performance) => {
            const team = teamMap[performance.teamId];
            const chipStyle = {
              backgroundImage: `linear-gradient(135deg, ${hexToRgba(
                team.colors.primary,
                0.85,
              )}, ${hexToRgba(team.colors.secondary, 0.72)})`,
            };

            return (
              <div
                key={`${selectedSeries.id}-${performance.player}`}
                className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="rounded-2xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white"
                    style={chipStyle}
                  >
                    {team.shortName}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{performance.player}</p>
                    <p className="text-sm text-slate-400">{performance.line}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader
          eyebrow="Bracket Impact"
          title="What This Game Means"
          subtitle="Why one result changes the rest of the playoff map."
        />
        <div className="space-y-3">
          {selectedSeries.stakes.map((item) => (
            <div
              key={`${selectedSeries.id}-${item}`}
              className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4"
            >
              <p className="text-sm leading-6 text-slate-200">{item}</p>
            </div>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader
          eyebrow="Discussion"
          title="Series Thread"
          subtitle={`${selectedSeries.fansDiscussing} fans discussing this series`}
        />
        <div className="mb-4 flex flex-wrap gap-2">
          {reactionTotals.map((reaction) => (
            <div
              key={`${selectedSeries.id}-${reaction.emoji}`}
              className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-slate-100"
            >
              {reaction.emoji} {reaction.count}
            </div>
          ))}
        </div>
        <div className="rounded-[24px] border border-white/10 bg-black/20 p-3">
          <label className="block text-[11px] uppercase tracking-[0.2em] text-slate-400">
            Jump into the thread
          </label>
          <textarea
            value={commentDrafts[selectedSeries.id] ?? ""}
            onChange={(event) =>
              setCommentDrafts((current) => ({
                ...current,
                [selectedSeries.id]: event.target.value,
              }))
            }
            rows={3}
            placeholder="Talk strategy, picks or player matchups..."
            className="mt-3 w-full resize-none rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={submitComment}
            className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition active:scale-[0.98]"
          >
            Post Comment
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {visibleComments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{comment.user}</p>
                  <p className="text-xs text-slate-400">
                    {comment.flair} • {comment.time}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-200">{comment.text}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {comment.reactions.map((reaction) => (
                  <button
                    key={`${comment.id}-${reaction.emoji}`}
                    type="button"
                    onClick={() => reactToComment(selectedSeries.id, comment.id, reaction.emoji)}
                    className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-slate-100"
                  >
                    {reaction.emoji} {reaction.count}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );

  const renderPrediction = () => {
    const predictionSeries =
      detailScreen && detailScreen.type === "prediction"
        ? seriesById[detailScreen.seriesId]
        : selectedSeries;
    const existing = predictions[predictionSeries.id];
    const delta = draftWager - (existing?.wager ?? 0);
    const canAfford = delta <= coins;

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-semibold text-white"
          >
            <BackIcon />
            Back to hub
          </button>
          <div className="rounded-full border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-100">
            {coins} Coins
          </div>
        </div>

        <SurfaceCard style={getSeriesGradient(predictionSeries)}>
          <SectionHeader
            eyebrow="Prediction Flow"
            title="Predict Next Game"
            subtitle={`${predictionSeries.schedule[0]?.label ?? "Next game"} • ${
              predictionSeries.schedule[0]?.date ?? "TBD"
            } • ${predictionSeries.schedule[0]?.time ?? "TBD"}`}
          />
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setDraftWinner("teamA")}
              className={cx(
                "w-full rounded-[24px] border p-3 text-left transition",
                draftWinner === "teamA"
                  ? "border-sky-300/40 bg-sky-500/12"
                  : "border-white/10 bg-white/[0.04]",
              )}
            >
              <SlotRow slot={predictionSeries.teamA} compact />
            </button>
            <button
              type="button"
              onClick={() => setDraftWinner("teamB")}
              className={cx(
                "w-full rounded-[24px] border p-3 text-left transition",
                draftWinner === "teamB"
                  ? "border-amber-300/40 bg-amber-500/12"
                  : "border-white/10 bg-white/[0.04]",
              )}
            >
              <SlotRow slot={predictionSeries.teamB} compact />
            </button>
          </div>

          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">
              Choose your wager
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {wagerOptions.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setDraftWager(amount)}
                  className={cx(
                    "rounded-2xl border px-3 py-3 text-sm font-semibold transition",
                    draftWager === amount
                      ? "border-amber-300/30 bg-amber-500/12 text-amber-100"
                      : "border-white/10 bg-white/[0.05] text-slate-200",
                  )}
                >
                  {amount}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-[22px] border border-white/10 bg-black/25 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Your ticket</p>
            <p className="mt-2 text-base font-semibold text-white">
              {draftWinner
                ? `${getWinningSlotLabel(predictionSeries, draftWinner)} • ${draftWager} Coins`
                : "Choose a team first"}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Picks lock at tip-off and show up in the series hub and your leaderboard activity.
            </p>
          </div>

          {!canAfford ? (
            <div className="mt-4 rounded-[20px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              You only have {coins} Coins left to use on new picks.
            </div>
          ) : null}

          {predictionMessage ? (
            <div className="mt-4 rounded-[22px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {predictionMessage}
            </div>
          ) : null}

          <button
            type="button"
            disabled={!draftWinner || !canAfford}
            onClick={confirmPrediction}
            className={cx(
              "mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition",
              draftWinner && canAfford
                ? "bg-white text-slate-950 active:scale-[0.98]"
                : "cursor-not-allowed bg-white/10 text-slate-500",
            )}
          >
            Confirm Prediction
          </button>
        </SurfaceCard>
      </div>
    );
  };

  const renderLeaderboard = () => (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          Prediction Race
        </p>
        <h1 className="mt-2 font-display text-[2.6rem] uppercase leading-[0.92] tracking-[0.05em] text-white">
          Leaderboard
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Friend brackets stay one tap away from the standings, so every rank shift sends people back into the bracket.
        </p>
      </div>

      <SurfaceCard
        style={{
          backgroundImage:
            "linear-gradient(145deg, rgba(250,204,21,0.18), rgba(15,23,42,0.98) 50%, rgba(59,130,246,0.15))",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-200">
              Your standing
            </p>
            <h2 className="mt-2 font-display text-[1.9rem] uppercase leading-none text-white">
              #{prototypeData.user.rank} in your circle
            </h2>
            <p className="mt-2 text-sm text-slate-200">
              {prototypeData.user.accuracy} recent accuracy • {prototypeData.user.streak}
            </p>
          </div>
          <div className="rounded-2xl border border-white/12 bg-black/25 px-4 py-3 text-right">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Coins left</p>
            <p className="mt-1 text-lg font-semibold text-white">{coins}</p>
          </div>
        </div>
      </SurfaceCard>

      <div className="space-y-3">
        {leaderboard.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => openFriendBracket(entry.id)}
            className="w-full text-left"
          >
            <SurfaceCard className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-sm font-semibold text-white">
                    #{entry.rank}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">{entry.username}</p>
                    <p className="text-sm text-slate-400">
                      {entry.points} pts • {entry.correctPicks} correct • {entry.recentAccuracy} recent
                    </p>
                  </div>
                </div>
                <ChevronIcon />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-[20px] border border-white/10 bg-black/20 px-3 py-2">
                <p className="text-sm text-slate-200">{entry.favoriteCall}</p>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold text-slate-200">
                  {entry.trend}
                </span>
              </div>
            </SurfaceCard>
          </button>
        ))}
      </div>
    </div>
  );

  const renderFriendBracket = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-semibold text-white"
        >
          <BackIcon />
          Back
        </button>
      </div>

      <SurfaceCard
        style={{
          backgroundImage:
            "linear-gradient(145deg, rgba(34,197,94,0.15), rgba(15,23,42,0.98) 50%, rgba(59,130,246,0.15))",
        }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
          Friend Bracket
        </p>
        <h1 className="mt-2 font-display text-[2.2rem] uppercase leading-none text-white">
          {selectedUser.username}
        </h1>
        <p className="mt-2 text-sm text-slate-200">
          Rank #{selectedUser.rank} • {selectedUser.points} pts • {selectedUser.correctPicks} correct picks
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/12 px-3 py-2 text-xs font-semibold text-emerald-100">
            Green = correct
          </span>
          <span className="rounded-full border border-rose-400/30 bg-rose-500/12 px-3 py-2 text-xs font-semibold text-rose-100">
            Red = incorrect
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-slate-200">
            Slate = pending
          </span>
        </div>
      </SurfaceCard>

      <div className="space-y-3">
        {selectedUser.bracketPreview.map((pick) => (
          <SurfaceCard key={pick.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {pick.round}
                </p>
                <h3 className="mt-1 text-base font-semibold text-white">{pick.matchup}</h3>
              </div>
              <span
                className={cx(
                  "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                  pickStatusClasses[pick.status],
                )}
              >
                {pick.status}
              </span>
            </div>
            <div className="mt-3 rounded-[20px] border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-white">
              {pick.pick}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{pick.note}</p>
          </SurfaceCard>
        ))}
      </div>
    </div>
  );

  const renderContent = () => {
    if (detailScreen?.type === "series") {
      return renderSeriesHub();
    }

    if (detailScreen?.type === "prediction") {
      return renderPrediction();
    }

    if (detailScreen?.type === "friend") {
      return renderFriendBracket();
    }

    if (activeTab === "bracket") {
      return renderBracket();
    }

    if (activeTab === "leaderboard") {
      return renderLeaderboard();
    }

    return renderHome();
  };

  return (
    <main className="relative mx-auto flex min-h-[calc(100vh-1rem)] w-full max-w-[440px] items-center justify-center">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_35%),radial-gradient(circle_at_bottom,rgba(249,115,22,0.12),transparent_30%)]" />
      <div className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[#050912] shadow-[0_28px_120px_rgba(2,6,23,0.72)] sm:min-h-[880px]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]" />
        <div className="relative mx-auto mt-3 h-1.5 w-24 rounded-full bg-white/12" />
        <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-4 pb-28 pt-4">
          {renderContent()}
        </div>
        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-[#060b15]/95 px-3 pb-4 pt-3 backdrop-blur-xl">
          <div className="grid grid-cols-3 gap-2">
            {primaryTabs.map((tab) => {
              const isActive = !detailScreen && activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setDetailScreen(null);
                  }}
                  className={cx(
                    "rounded-2xl px-3 py-3 text-center transition",
                    isActive ? "bg-white text-slate-950" : "bg-white/[0.04] text-slate-300",
                  )}
                >
                  <div className="flex flex-col items-center gap-1">
                    {tab.id === "home" ? (
                      <HomeIcon active={isActive} />
                    ) : tab.id === "bracket" ? (
                      <BracketIcon active={isActive} />
                    ) : (
                      <TrophyIcon active={isActive} />
                    )}
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">
                      {tab.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

export default PlayoffsPrototypeApp;
