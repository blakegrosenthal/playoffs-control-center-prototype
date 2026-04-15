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
      type: "thread";
      seriesId: string;
      returnTo: PrimaryTab;
    }
  | {
      type: "friend";
      userId: string;
      returnTo: PrimaryTab;
    };

type SeriesActivityItem = {
  id: string;
  title: string;
  detail: string;
  tone: "pick" | "wager" | "comment";
};

const wagerOptions = [50, 120, 250, 500];
const previewSeriesIds = ["east-r1-2", "west-r1-2", "west-r1-4"];
const quickStats = [
  { label: "Teams locked", value: "13/16" },
  { label: "Active hubs", value: "9" },
  { label: "Most discussed", value: "18.9K" },
];

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const toneClasses: Record<PrototypeSeries["statusTone"], string> = {
  hot: "border-rose-400/30 bg-rose-500/15 text-rose-100",
  watch: "border-sky-400/30 bg-sky-500/15 text-sky-100",
  locked: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
  pending: "border-white/12 bg-white/[0.06] text-slate-200",
};

const activityToneClasses: Record<SeriesActivityItem["tone"], string> = {
  pick: "border-sky-400/25 bg-sky-500/12 text-sky-100",
  wager: "border-amber-400/25 bg-amber-500/12 text-amber-100",
  comment: "border-violet-400/25 bg-violet-500/12 text-violet-100",
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
      linear-gradient(140deg, ${hexToRgba(left.primary, 0.22)}, rgba(7, 11, 22, 0.98) 52%, ${hexToRgba(right.primary, 0.22)}),
      radial-gradient(circle at top left, ${hexToRgba(left.secondary, 0.14)}, transparent 38%),
      radial-gradient(circle at bottom right, ${hexToRgba(right.secondary, 0.12)}, transparent 40%)
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

function getCommunityFavorite(series: PrototypeSeries) {
  if (series.community.teamA >= series.community.teamB) {
    return `${getSlotLabel(series.teamA)} ${series.community.teamA}%`;
  }

  return `${getSlotLabel(series.teamB)} ${series.community.teamB}%`;
}

function getFriendLean(series: PrototypeSeries) {
  const sideA = series.friends.filter((friend) => friend.side === "teamA");
  const sideB = series.friends.filter((friend) => friend.side === "teamB");
  const leaningSide = sideA.length >= sideB.length ? "teamA" : "teamB";
  const leaningFriends = series.friends.filter((friend) => friend.side === leaningSide);

  if (leaningFriends.length === 0) {
    return "Friends are split";
  }

  const names = leaningFriends.slice(0, 2).map((friend) => friend.name).join(", ");
  const overflow =
    leaningFriends.length > 2 ? ` +${leaningFriends.length - 2}` : "";

  return `${names}${overflow} on ${getWinningSlotLabel(series, leaningSide)}`;
}

function buildSeriesActivity(
  series: PrototypeSeries,
  comments: PrototypeComment[],
  activityFeed: typeof communityActivity,
) {
  const items: SeriesActivityItem[] = [];

  const directActivity = activityFeed
    .filter((item) => item.seriesId === series.id)
    .slice(0, 3);

  for (const item of directActivity) {
    items.push({
      id: item.id,
      title: `${item.user} ${item.action}`,
      detail: item.detail,
      tone:
        item.tone === "wager"
          ? "wager"
          : item.tone === "comment"
            ? "comment"
            : "pick",
    });
  }

  if (!items.some((item) => item.tone === "pick")) {
    const friendPick = series.friends.find(
      (friend) => !friend.confidence.includes("Coins"),
    );

    if (friendPick) {
      items.push({
        id: `${series.id}-friend-pick`,
        title: `${friendPick.name} picked ${getWinningSlotLabel(
          series,
          friendPick.side,
        )}`,
        detail: friendPick.confidence,
        tone: "pick",
      });
    }
  }

  if (!items.some((item) => item.tone === "wager")) {
    const friendWager = series.friends.find((friend) =>
      friend.confidence.includes("Coins"),
    );

    if (friendWager) {
      items.push({
        id: `${series.id}-friend-wager`,
        title: `${friendWager.name} wagered ${friendWager.confidence}`,
        detail: friendWager.note,
        tone: "wager",
      });
    }
  }

  if (!items.some((item) => item.tone === "comment") && comments[0]) {
    items.push({
      id: `${series.id}-comment-preview`,
      title: `${comments[0].user} commented on this series`,
      detail: comments[0].text,
      tone: "comment",
    });
  }

  return items.slice(0, 3);
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

function ChatIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 5.5h11v7.5h-5L7.5 15.5v-2.5h-3z" />
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
        "rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.065),rgba(255,255,255,0.035))] p-3 shadow-[0_12px_30px_rgba(2,6,23,0.34)] backdrop-blur",
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
    <div className="mb-1.5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-[14px] font-semibold text-white">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-[11px] leading-5 text-slate-400">{subtitle}</p>
        ) : null}
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function SlotBadge({ slot, size = "md" }: { slot: PrototypeSlot; size?: "md" | "lg" }) {
  const teams = getSlotTeams(slot);
  const badgeSize = size === "lg" ? "h-10 w-10" : "h-8 w-8";

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
          width={size === "lg" ? 30 : 24}
          height={size === "lg" ? 30 : 24}
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
          0.86,
        )}, ${hexToRgba(colors.secondary, 0.86)})`,
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_45%)]" />
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
                width={size === "lg" ? 18 : 14}
                height={size === "lg" ? 18 : 14}
                unoptimized
                className="h-auto w-auto"
              />
            </div>
          ))}
          {teams.length > 2 ? (
            <span className="-ml-2 rounded-full border border-white/20 bg-slate-950/85 px-1.5 py-0.5 text-[10px] font-semibold text-white">
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
        "flex items-center gap-2 rounded-[16px] border border-white/10 bg-black/20",
        compact ? "p-2" : "p-2.5",
      )}
    >
      <SlotBadge slot={slot} size={compact ? "md" : "lg"} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          {slot.seed ? (
            <span className="rounded-full border border-white/10 bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-semibold text-slate-200">
              ({slot.seed})
            </span>
          ) : null}
          <p className="truncate text-[13px] font-semibold text-white">
            {getSlotLabel(slot)}
          </p>
        </div>
        {slot.note ? (
          <p className="mt-0.5 truncate text-[10px] text-slate-400">{slot.note}</p>
        ) : null}
      </div>
      {typeof percentage === "number" ? (
        <div className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-semibold text-slate-100">
          {percentage}%
        </div>
      ) : null}
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-[16px] border border-white/8 bg-black/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="max-w-[68%] text-right text-[13px] font-medium leading-5 text-slate-100">
        {value}
      </p>
    </div>
  );
}

function ActionButton({
  label,
  tone,
  icon,
  onClick,
}: {
  label: string;
  tone: "primary" | "secondary";
  icon?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex min-h-[44px] items-center justify-center gap-2 rounded-[16px] px-3 py-2.5 text-[13px] font-semibold transition active:scale-[0.98]",
        tone === "primary"
          ? "bg-white text-slate-950"
          : "border border-white/14 bg-white/[0.05] text-white",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
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
      className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] p-2.5 text-left transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {series.round}
          </p>
          <div className="flex items-center gap-2.5">
            <SlotBadge slot={series.teamA} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-white">
                {getSlotLabel(series.teamA)}
              </p>
              <p className="text-[10px] text-slate-400">
                {series.community.teamA}% picked
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <SlotBadge slot={series.teamB} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-white">
                {getSlotLabel(series.teamB)}
              </p>
              <p className="text-[10px] text-slate-400">
                {series.community.teamB}% picked
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className={cx(
              "rounded-full border px-2 py-1 text-[10px] font-semibold",
              toneClasses[series.statusTone],
            )}
          >
            {series.score}
          </span>
          <ChevronIcon />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
        <span>{series.activeLabel}</span>
        <span>{series.fansDiscussing} discussing</span>
      </div>
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
    <SurfaceCard style={getSeriesGradient(series)} className="p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-300">
            Featured Series
          </p>
          <p className="mt-0.5 truncate text-[15px] font-semibold text-white">
            {getSlotLabel(series.teamA)} vs {getSlotLabel(series.teamB)}
          </p>
          <p className="mt-1 text-[11px] text-slate-300">
            {series.activeLabel} • {series.fansDiscussing} discussing
          </p>
        </div>
        <span
          className={cx(
            "rounded-full border px-2 py-1 text-[10px] font-semibold",
            toneClasses[series.statusTone],
          )}
        >
          {series.status}
        </span>
      </div>
      <div className="mt-2.5 space-y-1.5">
        <SlotRow slot={series.teamA} percentage={series.community.teamA} compact />
        <SlotRow slot={series.teamB} percentage={series.community.teamB} compact />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-[16px] border border-white/10 bg-black/25 px-3 py-2">
          <p className="text-[9px] uppercase tracking-[0.14em] text-slate-400">Series</p>
          <p className="mt-0.5 text-[13px] font-semibold text-white">{series.score}</p>
        </div>
        <div className="rounded-[16px] border border-white/10 bg-black/25 px-3 py-2">
          <p className="text-[9px] uppercase tracking-[0.14em] text-slate-400">Friends</p>
          <p className="mt-0.5 truncate text-[13px] font-semibold text-white">
            {getFriendLean(series)}
          </p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <ActionButton label="Open Hub" tone="primary" onClick={onOpenSeries} />
        <ActionButton label="Predict" tone="secondary" onClick={onPredict} />
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
      <SurfaceCard style={getSeriesGradient(series)} className="p-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
            <span>{series.conference}</span>
            <span className="text-slate-500">•</span>
            <span>{series.round}</span>
          </div>
          <span
            className={cx(
              "rounded-full border px-2 py-1 text-[10px] font-semibold",
              toneClasses[series.statusTone],
            )}
          >
            {series.status}
          </span>
        </div>
        <div className="mt-2 space-y-1.5">
          <SlotRow slot={series.teamA} percentage={series.community.teamA} compact />
          <SlotRow slot={series.teamB} percentage={series.community.teamB} compact />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-300">
          <span className="font-semibold text-white">Series {series.score}</span>
          <span>{series.fansDiscussing} discussing</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3 text-[10px] text-slate-400">
          <span>{series.activeLabel}</span>
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
    (detailScreen.type === "series" ||
      detailScreen.type === "prediction" ||
      detailScreen.type === "thread")
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
  const seriesActivity = buildSeriesActivity(
    selectedSeries,
    visibleComments,
    activityFeed,
  );
  const currentReturnTo =
    detailScreen && detailScreen.type !== "friend" ? detailScreen.returnTo : activeTab;

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

  const openThread = (seriesId: string, returnTo: PrimaryTab) => {
    setDetailScreen({ type: "thread", seriesId, returnTo });
  };

  const openFriendBracket = (userId: string) => {
    setDetailScreen({ type: "friend", userId, returnTo: "leaderboard" });
  };

  const goBack = () => {
    if (!detailScreen) {
      return;
    }

    if (detailScreen.type === "prediction" || detailScreen.type === "thread") {
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
      ...current.slice(0, 7),
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
      `Locked in ${draftWager} Coins on ${getWinningSlotLabel(
        series,
        draftWinner,
      )} for the next game.`,
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
    updateActivity(
      "You",
      "commented on",
      `${getSlotLabel(selectedSeries.teamA)} vs ${getSlotLabel(selectedSeries.teamB)}`,
      "comment",
      selectedSeries.id,
    );
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
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">
            {prototypeData.asOfLabel}
          </p>
          <h1 className="mt-1 font-display text-[1.9rem] uppercase leading-[0.94] tracking-[0.04em] text-white">
            NBA Playoffs
          </h1>
          <p className="mt-1 max-w-[19rem] text-[13px] leading-5 text-slate-300">
            The bracket runs picks, wagers, threads and friend movement every night.
          </p>
        </div>
        <div className="shrink-0 rounded-[16px] border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-right">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-amber-100">
            <CoinsIcon />
            <span>{coins}</span>
          </div>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-amber-200/80">
            Coins
          </p>
        </div>
      </div>

      <SurfaceCard
        className="p-3"
        style={{
          backgroundImage:
            "linear-gradient(145deg, rgba(56,189,248,0.18), rgba(15,23,42,0.98) 48%, rgba(249,115,22,0.18)), radial-gradient(circle at top right, rgba(251,191,36,0.14), transparent 32%)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-sky-200">
              Control Center
            </p>
            <h2 className="mt-1 text-[16px] font-semibold text-white">
              {prototypeData.home.heroTitle}
            </h2>
            <p className="mt-1 text-[13px] leading-5 text-slate-200">
              Jump from the bracket into every series conversation, pick, and bracket swing.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTab("bracket");
              setDetailScreen(null);
            }}
            className="shrink-0 rounded-full border border-white/12 bg-white/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white"
          >
            Bracket
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {quickStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[16px] border border-white/10 bg-black/25 p-2.5"
            >
              <p className="text-[15px] font-semibold text-white">{stat.value}</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-[0.14em] text-slate-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-[16px] border border-white/10 bg-black/25 px-3 py-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-400">
                Most active series
              </p>
              <p className="mt-0.5 truncate text-[13px] font-semibold text-white">
                {getSlotLabel(featuredSeries.teamA)} vs {getSlotLabel(featuredSeries.teamB)}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {featuredSeries.fansDiscussing} discussing • {featuredSeries.activeLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openSeries(featuredSeries.id, "home")}
              className="shrink-0 rounded-full border border-white/12 bg-white/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white"
            >
              Open
            </button>
          </div>
        </div>
      </SurfaceCard>

      <div>
        <SectionHeader
          eyebrow="Featured"
          title="Active Series"
          subtitle="The matchup driving the most picks, wagers and comments."
        />
        <FeaturedSeriesCard
          series={featuredSeries}
          onOpenSeries={() => openSeries(featuredSeries.id, "home")}
          onPredict={() => openPrediction(featuredSeries.id, "home")}
        />
      </div>

      <div>
        <SectionHeader
          eyebrow="Preview"
          title="Bracket Shortcuts"
          subtitle="Fast taps into the branches your feed keeps returning to."
          action={
            <button
              type="button"
              onClick={() => {
                setActiveTab("bracket");
                setDetailScreen(null);
              }}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200"
            >
              Full bracket
            </button>
          }
        />
        <div className="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-1">
          {previewSeriesIds.map((seriesId) => (
            <div key={seriesId} className="min-w-[250px] shrink-0">
              <MiniSeriesButton
                series={seriesById[seriesId]}
                onOpen={() => openSeries(seriesId, "home")}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionHeader
          eyebrow="Schedule"
          title="Upcoming Games"
          subtitle="The next windows that shift picks and bracket pressure."
        />
        <div className="space-y-2">
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
              <SurfaceCard className="p-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      {game.label}
                    </p>
                    <h3 className="mt-0.5 text-[13px] font-semibold text-white">
                      {game.matchup}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-slate-400">{game.window}</p>
                  </div>
                  <ChevronIcon />
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-[11px]">
                  <p className="text-slate-300">{game.note}</p>
                  <span className="shrink-0 rounded-full border border-sky-400/20 bg-sky-500/10 px-2 py-1 text-[10px] font-semibold text-sky-100">
                    Impact
                  </span>
                </div>
              </SurfaceCard>
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionHeader
          eyebrow="Compete"
          title="Leaderboard"
          subtitle="Standings stay close to the bracket so every result stays personal."
          action={
            <button
              type="button"
              onClick={() => {
                setActiveTab("leaderboard");
                setDetailScreen(null);
              }}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200"
            >
              View all
            </button>
          }
        />
        <div className="space-y-2">
          {leaderboard.slice(0, 3).map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => openFriendBracket(entry.id)}
              className="w-full text-left"
            >
              <SurfaceCard className="p-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-[16px] border border-white/10 bg-white/[0.06] text-[13px] font-semibold text-white">
                      #{entry.rank}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-white">
                        {entry.username}
                      </p>
                      <p className="truncate text-[11px] text-slate-400">
                        {entry.points} pts • {entry.correctPicks} correct • {entry.recentAccuracy}
                      </p>
                    </div>
                  </div>
                  <ChevronIcon />
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
          subtitle="Social proof attached directly to the playoff map."
        />
        <div className="space-y-2">
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
              <SurfaceCard className="p-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white">
                      {item.user} {item.action}
                    </p>
                    <p className="truncate text-[13px] text-slate-300">{item.detail}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{item.time}</p>
                  </div>
                  <span
                    className={cx(
                      "rounded-full border px-2 py-1 text-[10px] font-semibold",
                      item.tone === "prediction" && activityToneClasses.pick,
                      item.tone === "comment" && activityToneClasses.comment,
                      item.tone === "wager" && activityToneClasses.wager,
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
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Bracket Navigation
        </p>
        <h1 className="font-display text-[1.85rem] uppercase leading-[0.94] tracking-[0.04em] text-white">
          Playoff Map
        </h1>
        <p className="text-[13px] leading-5 text-slate-300">
          Tap any matchup to jump into its social control center.
        </p>
      </div>

      {roundSections.map((section) => (
        <div key={section.title} className="space-y-2">
          <SectionHeader
            eyebrow={section.title}
            title={section.title}
            subtitle={section.description}
          />
          <div className="space-y-2">
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

  const renderSeriesHub = () => {
    const nextGame = selectedSeries.schedule[0];

    return (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-[13px] font-semibold text-white"
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
            className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200"
          >
            Leaderboard
          </button>
        </div>

        <SurfaceCard style={getSeriesGradient(selectedSeries)} className="p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                {selectedSeries.conference} • {selectedSeries.round}
              </p>
              <h1 className="mt-1 text-[16px] font-semibold text-white">
                {getSlotLabel(selectedSeries.teamA)} vs {getSlotLabel(selectedSeries.teamB)}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-300">
                <span>Series {selectedSeries.score}</span>
                <span className="text-slate-500">•</span>
                <span>{selectedSeries.fansDiscussing} discussing</span>
              </div>
            </div>
            <span
              className={cx(
                "max-w-[144px] rounded-full border px-2.5 py-1 text-center text-[10px] font-semibold leading-4",
                toneClasses[selectedSeries.statusTone],
              )}
            >
              {selectedSeries.status}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="min-w-0 rounded-[16px] border border-white/10 bg-black/25 p-2">
              <div className="flex items-center gap-2">
                <SlotBadge slot={selectedSeries.teamA} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-white">
                    {getSlotLabel(selectedSeries.teamA)}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {selectedSeries.teamA.seed
                      ? `Seed ${selectedSeries.teamA.seed}`
                      : selectedSeries.teamA.note ?? "Waiting"}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[16px] border border-white/10 bg-black/30 px-3 py-2 text-center">
              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-400">Series</p>
              <p className="mt-0.5 text-[15px] font-semibold text-white">
                {selectedSeries.score}
              </p>
            </div>
            <div className="min-w-0 rounded-[16px] border border-white/10 bg-black/25 p-2">
              <div className="flex items-center gap-2">
                <SlotBadge slot={selectedSeries.teamB} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-white">
                    {getSlotLabel(selectedSeries.teamB)}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {selectedSeries.teamB.seed
                      ? `Seed ${selectedSeries.teamB.seed}`
                      : selectedSeries.teamB.note ?? "Waiting"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-2 text-[12px] leading-5 text-slate-300">
            {selectedSeries.cardNote}
          </p>
        </SurfaceCard>

        <SurfaceCard className="p-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Friends Activity
              </p>
              <p className="truncate text-[12px] text-slate-300">
                Picks, wagers and comments moving this series right now.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openThread(selectedSeries.id, currentReturnTo)}
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200"
            >
              View all
            </button>
          </div>
          <div className="mt-2 -mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-0.5">
            {seriesActivity.map((item) => (
              <div
                key={item.id}
                className={cx(
                  "min-w-[214px] rounded-[16px] border px-3 py-2",
                  activityToneClasses[item.tone],
                )}
              >
                <p className="truncate text-[12px] font-semibold text-white">{item.title}</p>
                <p className="mt-0.5 text-[11px] leading-5 text-slate-200">{item.detail}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <div className="grid grid-cols-3 gap-2">
          <ActionButton
            label="Predict"
            tone="primary"
            onClick={() => openPrediction(selectedSeries.id, currentReturnTo)}
          />
          <ActionButton
            label="Wager"
            tone="secondary"
            icon={<CoinsIcon />}
            onClick={() => openPrediction(selectedSeries.id, currentReturnTo)}
          />
          <ActionButton
            label="Thread"
            tone="secondary"
            icon={<ChatIcon />}
            onClick={() => openThread(selectedSeries.id, currentReturnTo)}
          />
        </div>

        <SurfaceCard className="p-3">
          <SectionHeader
            eyebrow="Quick Info"
            title="Before the next tip"
            subtitle="The fastest scan before you make a pick or jump into the thread."
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[16px] border border-white/10 bg-black/20 px-3 py-2.5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-400">
                Next Game
              </p>
              <p className="mt-0.5 text-[13px] font-semibold text-white">
                {nextGame ? nextGame.date : "TBD"}
              </p>
              <p className="text-[11px] text-slate-400">
                {nextGame ? `${nextGame.time} • ${nextGame.venue}` : "Schedule coming soon"}
              </p>
            </div>
            <div className="rounded-[16px] border border-white/10 bg-black/20 px-3 py-2.5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-400">
                Community Pick
              </p>
              <p className="mt-0.5 text-[13px] font-semibold text-white">
                {getCommunityFavorite(selectedSeries)}
              </p>
              <p className="text-[11px] text-slate-400">{selectedSeries.activeLabel}</p>
            </div>
          </div>
          <div className="mt-2 space-y-2">
            <InfoRow label="Friends" value={getFriendLean(selectedSeries)} />
            <InfoRow label="Bracket Impact" value={selectedSeries.impactStat} />
            {userPrediction ? (
              <InfoRow
                label="Your Pick"
                value={`${getWinningSlotLabel(selectedSeries, userPrediction.winner)} • ${userPrediction.wager} Coins`}
              />
            ) : null}
          </div>
        </SurfaceCard>

        <div>
          <SectionHeader
            eyebrow="Players"
            title="Top Performances"
            subtitle="The quick stat lines shaping how fans are calling this matchup."
          />
          <div className="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-1">
            {selectedSeries.playerPerformances.map((performance) => {
              const team = teamMap[performance.teamId];

              return (
                <div
                  key={`${selectedSeries.id}-${performance.player}`}
                  className="min-w-[160px] rounded-[16px] border border-white/10 bg-white/[0.05] p-2.5"
                >
                  <div
                    className="inline-flex rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${hexToRgba(
                        team.colors.primary,
                        0.85,
                      )}, ${hexToRgba(team.colors.secondary, 0.75)})`,
                    }}
                  >
                    {team.shortName}
                  </div>
                  <p className="mt-2 text-[13px] font-semibold text-white">
                    {performance.player}
                  </p>
                  <p className="mt-0.5 text-[12px] text-slate-300">{performance.line}</p>
                </div>
              );
            })}
          </div>
        </div>

        <SurfaceCard className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Discussion
              </p>
              <h2 className="mt-0.5 text-[14px] font-semibold text-white">
                Series Thread
              </h2>
              <p className="text-[11px] text-slate-400">
                {selectedSeries.fansDiscussing} fans discussing this series
              </p>
            </div>
            <button
              type="button"
              onClick={() => openThread(selectedSeries.id, currentReturnTo)}
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200"
            >
              Open
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {visibleComments.slice(0, 2).map((comment) => (
              <div
                key={comment.id}
                className="rounded-[16px] border border-white/10 bg-black/20 px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-white">{comment.user}</p>
                    <p className="text-[10px] text-slate-500">
                      {comment.flair} • {comment.time}
                    </p>
                  </div>
                </div>
                <p className="mt-1 text-[12px] leading-5 text-slate-200">{comment.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 rounded-[16px] border border-white/10 bg-black/20 px-3 py-2">
            <div className="flex flex-wrap gap-1.5">
              {reactionTotals.map((reaction) => (
                <div
                  key={`${selectedSeries.id}-${reaction.emoji}`}
                  className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-slate-100"
                >
                  {reaction.emoji} {reaction.count}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => openThread(selectedSeries.id, currentReturnTo)}
              className="shrink-0 text-[11px] font-semibold text-sky-300"
            >
              View Full Thread &gt;
            </button>
          </div>
        </SurfaceCard>

        <div className="space-y-2">
          <SectionHeader
            eyebrow="More"
            title="Deeper Context"
            subtitle="Results, stakes and bracket pressure once you want more than the quick scan."
          />

          <SurfaceCard className="p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Recent Games
                </p>
                <p className="text-[12px] text-slate-300">Context carrying into the series.</p>
              </div>
            </div>
            <div className="mt-2 space-y-2">
              {selectedSeries.recentResults.map((result) => (
                <div
                  key={`${selectedSeries.id}-${result.label}-${result.result}`}
                  className="rounded-[16px] border border-white/10 bg-black/20 px-3 py-2.5"
                >
                  <p className="text-[9px] uppercase tracking-[0.14em] text-slate-400">
                    {result.label}
                  </p>
                  <p className="mt-0.5 text-[13px] font-semibold text-white">
                    {result.result}
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-slate-300">
                    {result.detail}
                  </p>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-2.5">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                What This Game Means
              </p>
              <p className="text-[12px] text-slate-300">
                The wider bracket story under the score line.
              </p>
            </div>
            <div className="mt-2 space-y-2">
              {selectedSeries.stakes.map((item) => (
                <div
                  key={`${selectedSeries.id}-${item}`}
                  className="rounded-[16px] border border-white/10 bg-black/20 px-3 py-2.5"
                >
                  <p className="text-[12px] leading-5 text-slate-200">{item}</p>
                </div>
              ))}
            </div>
          </SurfaceCard>
        </div>
      </div>
    );
  };

  const renderThread = () => (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-[13px] font-semibold text-white"
        >
          <BackIcon />
          Back to hub
        </button>
      </div>

      <SurfaceCard style={getSeriesGradient(selectedSeries)} className="p-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-300">
          Series Thread
        </p>
        <h1 className="mt-1 text-[16px] font-semibold text-white">
          {getSlotLabel(selectedSeries.teamA)} vs {getSlotLabel(selectedSeries.teamB)}
        </h1>
        <p className="mt-1 text-[12px] text-slate-300">
          {selectedSeries.fansDiscussing} fans discussing this series
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {reactionTotals.map((reaction) => (
            <div
              key={`${selectedSeries.id}-thread-${reaction.emoji}`}
              className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-slate-100"
            >
              {reaction.emoji} {reaction.count}
            </div>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-3">
        <SectionHeader
          eyebrow="Post"
          title="Jump into the thread"
          subtitle="Talk strategy, picks or player matchups."
        />
        <textarea
          value={commentDrafts[selectedSeries.id] ?? ""}
          onChange={(event) =>
            setCommentDrafts((current) => ({
              ...current,
              [selectedSeries.id]: event.target.value,
            }))
          }
          rows={3}
          placeholder="Add your take..."
          className="w-full resize-none rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3 text-[13px] text-white outline-none placeholder:text-slate-500"
        />
        <button
          type="button"
          onClick={submitComment}
          className="mt-3 rounded-[16px] bg-white px-4 py-3 text-[13px] font-semibold text-slate-950 transition active:scale-[0.98]"
        >
          Post Comment
        </button>
      </SurfaceCard>

      <div className="space-y-2">
        {visibleComments.map((comment) => (
          <SurfaceCard key={comment.id} className="p-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-white">{comment.user}</p>
                <p className="text-[10px] text-slate-400">
                  {comment.flair} • {comment.time}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[13px] leading-5 text-slate-200">{comment.text}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {comment.reactions.map((reaction) => (
                <button
                  key={`${comment.id}-${reaction.emoji}`}
                  type="button"
                  onClick={() => reactToComment(selectedSeries.id, comment.id, reaction.emoji)}
                  className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-semibold text-slate-100"
                >
                  {reaction.emoji} {reaction.count}
                </button>
              ))}
            </div>
          </SurfaceCard>
        ))}
      </div>
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
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-[13px] font-semibold text-white"
          >
            <BackIcon />
            Back to hub
          </button>
          <div className="rounded-full border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-[13px] font-semibold text-amber-100">
            {coins} Coins
          </div>
        </div>

        <SurfaceCard style={getSeriesGradient(predictionSeries)} className="p-3">
          <SectionHeader
            eyebrow="Prediction Flow"
            title="Predict Next Game"
            subtitle={`${predictionSeries.schedule[0]?.label ?? "Next game"} • ${
              predictionSeries.schedule[0]?.date ?? "TBD"
            } • ${predictionSeries.schedule[0]?.time ?? "TBD"}`}
          />
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setDraftWinner("teamA")}
              className={cx(
                "w-full rounded-[18px] border p-2 text-left transition",
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
                "w-full rounded-[18px] border p-2 text-left transition",
                draftWinner === "teamB"
                  ? "border-amber-300/40 bg-amber-500/12"
                  : "border-white/10 bg-white/[0.04]",
              )}
            >
              <SlotRow slot={predictionSeries.teamB} compact />
            </button>
          </div>

          <div className="mt-3.5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-300">
              Wager
            </p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {wagerOptions.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setDraftWager(amount)}
                  className={cx(
                    "rounded-[14px] border px-3 py-2.5 text-[13px] font-semibold transition",
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

          <div className="mt-3.5 rounded-[16px] border border-white/10 bg-black/25 p-3">
            <p className="text-[9px] uppercase tracking-[0.14em] text-slate-400">Your ticket</p>
            <p className="mt-1.5 text-[13px] font-semibold text-white">
              {draftWinner
                ? `${getWinningSlotLabel(predictionSeries, draftWinner)} • ${draftWager} Coins`
                : "Choose a team first"}
            </p>
            <p className="mt-1 text-[12px] text-slate-300">
              Locks at tip-off and shows up in the series hub and your activity feed.
            </p>
          </div>

          {!canAfford ? (
            <div className="mt-3 rounded-[16px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-[13px] text-rose-100">
              You only have {coins} Coins left to use on new picks.
            </div>
          ) : null}

          {predictionMessage ? (
            <div className="mt-3 rounded-[16px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-100">
              {predictionMessage}
            </div>
          ) : null}

          <button
            type="button"
            disabled={!draftWinner || !canAfford}
            onClick={confirmPrediction}
            className={cx(
              "mt-3.5 w-full rounded-[16px] px-4 py-3 text-[13px] font-semibold transition",
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
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Prediction Race
        </p>
        <h1 className="font-display text-[1.85rem] uppercase leading-[0.94] tracking-[0.04em] text-white">
          Leaderboard
        </h1>
        <p className="text-[13px] leading-5 text-slate-300">
          Friend brackets stay close to the standings so every result feels social.
        </p>
      </div>

      <SurfaceCard
        className="p-3"
        style={{
          backgroundImage:
            "linear-gradient(145deg, rgba(250,204,21,0.18), rgba(15,23,42,0.98) 52%, rgba(59,130,246,0.15))",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-200">
              Your standing
            </p>
            <h2 className="mt-1 text-[16px] font-semibold text-white">
              #{prototypeData.user.rank} in your circle
            </h2>
            <p className="mt-1 text-[12px] text-slate-200">
              {prototypeData.user.accuracy} recent accuracy • {prototypeData.user.streak}
            </p>
          </div>
          <div className="rounded-[16px] border border-white/12 bg-black/25 px-3 py-2 text-right">
            <p className="text-[9px] uppercase tracking-[0.14em] text-slate-400">Coins</p>
            <p className="mt-0.5 text-[15px] font-semibold text-white">{coins}</p>
          </div>
        </div>
      </SurfaceCard>

      <div className="space-y-2">
        {leaderboard.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => openFriendBracket(entry.id)}
            className="w-full text-left"
          >
            <SurfaceCard className="p-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-[16px] border border-white/10 bg-white/[0.06] text-[13px] font-semibold text-white">
                    #{entry.rank}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-white">
                      {entry.username}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">
                      {entry.points} pts • {entry.correctPicks} correct • {entry.recentAccuracy}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold text-white">{entry.trend}</p>
                  <ChevronIcon />
                </div>
              </div>
              <div className="mt-2 rounded-[16px] border border-white/10 bg-black/20 px-3 py-2 text-[12px] text-slate-200">
                {entry.favoriteCall}
              </div>
            </SurfaceCard>
          </button>
        ))}
      </div>
    </div>
  );

  const renderFriendBracket = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-[13px] font-semibold text-white"
        >
          <BackIcon />
          Back
        </button>
      </div>

      <SurfaceCard
        className="p-3"
        style={{
          backgroundImage:
            "linear-gradient(145deg, rgba(34,197,94,0.15), rgba(15,23,42,0.98) 52%, rgba(59,130,246,0.15))",
        }}
      >
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
          Friend Bracket
        </p>
        <h1 className="mt-1 text-[16px] font-semibold text-white">{selectedUser.username}</h1>
        <p className="mt-1 text-[12px] text-slate-200">
          Rank #{selectedUser.rank} • {selectedUser.points} pts • {selectedUser.correctPicks} correct
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/12 px-2.5 py-1 text-[10px] font-semibold text-emerald-100">
            Green = correct
          </span>
          <span className="rounded-full border border-rose-400/30 bg-rose-500/12 px-2.5 py-1 text-[10px] font-semibold text-rose-100">
            Red = incorrect
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-slate-200">
            Pending = slate
          </span>
        </div>
      </SurfaceCard>

      <div className="space-y-2">
        {selectedUser.bracketPreview.map((pick) => (
          <SurfaceCard key={pick.id} className="p-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {pick.round}
                </p>
                <h3 className="mt-0.5 text-[13px] font-semibold text-white">
                  {pick.matchup}
                </h3>
              </div>
              <span
                className={cx(
                  "rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                  pickStatusClasses[pick.status],
                )}
              >
                {pick.status}
              </span>
            </div>
            <div className="mt-2 rounded-[16px] border border-white/10 bg-black/20 px-3 py-2 text-[13px] font-semibold text-white">
              {pick.pick}
            </div>
            <p className="mt-2 text-[12px] leading-5 text-slate-300">{pick.note}</p>
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

    if (detailScreen?.type === "thread") {
      return renderThread();
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
    <main className="relative mx-auto flex min-h-[calc(100vh-0.5rem)] w-full max-w-[430px] items-center justify-center">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_35%),radial-gradient(circle_at_bottom,rgba(249,115,22,0.12),transparent_30%)]" />
      <div className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#050912] shadow-[0_28px_120px_rgba(2,6,23,0.72)] sm:min-h-[860px]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]" />
        <div className="relative mx-auto mt-3 h-1.5 w-24 rounded-full bg-white/12" />
        <div
          ref={scrollRef}
          className="relative flex-1 overflow-y-auto px-3 pb-[5.5rem] pt-2.5"
        >
          {renderContent()}
        </div>
        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-[#060b15]/95 px-3 pb-3 pt-2 backdrop-blur-xl">
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
                    "rounded-[16px] px-2 py-2.5 text-center transition",
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
                    <span className="text-[9px] font-semibold">{tab.label}</span>
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
