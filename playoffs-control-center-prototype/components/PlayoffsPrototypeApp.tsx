"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  communityActivity,
  prototypeData,
  seriesById,
  teamMap,
  type PrototypeSeries,
  type PrototypeSlot,
} from "@/lib/playoffs-prototype-data";

type SlotSide = "teamA" | "teamB";
type SheetMode = "overview" | "predict" | "wager";
type SheetState = {
  mode: SheetMode;
  seriesId: string;
};
type PredictionRecord = {
  winner: SlotSide;
};
type WagerRecord = {
  amount: number;
  winner: SlotSide;
};
type FriendActivity = {
  id: string;
  detail: string;
  label: string;
  tone: "comment" | "pick" | "wager";
};

const wagerOptions = [50, 120, 250, 500];
const bracketGridTemplateColumns = "minmax(0, 1.28fr) 15px minmax(0, 1fr) 15px minmax(0, 0.88fr)";
const bracketGridTemplateRows = "repeat(7, 80px)";

const conferenceTrees = [
  {
    id: "west",
    label: "Western Conference",
    roundOne: ["west-r1-1", "west-r1-2", "west-r1-3", "west-r1-4"],
    semifinals: ["west-sf-1", "west-sf-2"],
    finals: "west-finals",
  },
  {
    id: "east",
    label: "Eastern Conference",
    roundOne: ["east-r1-1", "east-r1-2", "east-r1-3", "east-r1-4"],
    semifinals: ["east-sf-1", "east-sf-2"],
    finals: "east-finals",
  },
] as const;

const roundOneRows = [1, 3, 5, 7];
const activityToneClasses: Record<FriendActivity["tone"], string> = {
  comment: "border-violet-400/20 bg-violet-500/10 text-violet-100",
  pick: "border-sky-400/20 bg-sky-500/10 text-sky-100",
  wager: "border-amber-400/20 bg-amber-500/10 text-amber-100",
};

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

function hexToRgba(hex: string, alpha: number) {
  const cleaned = hex.replace("#", "");
  const value = Number.parseInt(cleaned, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function parseMetricCount(value: string) {
  const match = value.trim().match(/^([\d.]+)\s*([KM])?$/i);

  if (!match) {
    return Number.parseFloat(value) || 0;
  }

  const amount = Number.parseFloat(match[1]);
  const suffix = match[2]?.toUpperCase();

  if (suffix === "M") {
    return amount * 1_000_000;
  }

  if (suffix === "K") {
    return amount * 1_000;
  }

  return amount;
}

function formatCompactCount(value: number) {
  if (value >= 1_000_000) {
    const scaled = value / 1_000_000;
    return `${Number(scaled.toFixed(scaled >= 10 ? 0 : 1))}M`;
  }

  if (value >= 1_000) {
    const scaled = value / 1_000;
    return `${Number(scaled.toFixed(scaled >= 10 ? 0 : 1))}K`;
  }

  return `${Math.round(value)}`;
}

function getSlotTeams(slot: PrototypeSlot) {
  return slot.candidateTeamIds.map((teamId) => teamMap[teamId]).filter(Boolean);
}

function getSlotColors(slot: PrototypeSlot) {
  const [first, second] = getSlotTeams(slot);

  return {
    primary:
      slot.type === "team" && slot.teamId
        ? teamMap[slot.teamId].colors.primary
        : first?.colors.primary ?? "#334155",
    secondary:
      slot.type === "team" && slot.teamId
        ? teamMap[slot.teamId].colors.secondary
        : second?.colors.secondary ?? first?.colors.secondary ?? "#94A3B8",
  };
}

function getSeriesGradient(series: PrototypeSeries) {
  const left = getSlotColors(series.teamA);
  const right = getSlotColors(series.teamB);

  return {
    backgroundImage: `
      linear-gradient(150deg, ${hexToRgba(left.primary, 0.18)}, rgba(6, 10, 20, 0.96) 52%, ${hexToRgba(right.primary, 0.18)}),
      radial-gradient(circle at top left, ${hexToRgba(left.secondary, 0.12)}, transparent 40%),
      radial-gradient(circle at bottom right, ${hexToRgba(right.secondary, 0.12)}, transparent 42%)
    `,
  };
}

function getSlotLabel(slot: PrototypeSlot) {
  return slot.shortLabel;
}

function getWinnerLabel(series: PrototypeSeries, side: SlotSide) {
  return side === "teamA" ? getSlotLabel(series.teamA) : getSlotLabel(series.teamB);
}

function getCommunityFavorite(series: PrototypeSeries) {
  if (series.community.teamA >= series.community.teamB) {
    return {
      label: getSlotLabel(series.teamA),
      percent: series.community.teamA,
      side: "teamA" as const,
    };
  }

  return {
    label: getSlotLabel(series.teamB),
    percent: series.community.teamB,
    side: "teamB" as const,
  };
}

function getSeriesSummary(series: PrototypeSeries) {
  return series.score.includes("-") ? `Series ${series.score}` : series.score;
}

function getEngagementSnapshot(series: PrototypeSeries) {
  const discussionCount = parseMetricCount(series.fansDiscussing);
  const roundMultiplier: Record<PrototypeSeries["round"], number> = {
    "Round 1": 3.9,
    "Conference Semifinals": 3.1,
    "Conference Finals": 2.6,
    "NBA Finals": 3.4,
  };
  const toneBoost: Record<PrototypeSeries["statusTone"], number> = {
    hot: 1.1,
    watch: 1,
    locked: 0.9,
    pending: 0.78,
  };
  const wagerMultiplier: Record<PrototypeSeries["statusTone"], number> = {
    hot: 0.35,
    watch: 0.28,
    locked: 0.22,
    pending: 0.18,
  };
  const heatScore = discussionCount * toneBoost[series.statusTone];
  const intensity = heatScore >= 18_500 ? "high" : heatScore >= 11_500 ? "medium" : "low";

  return {
    discussionCount,
    discussionLabel: series.fansDiscussing,
    predictionsLabel: formatCompactCount(
      discussionCount * roundMultiplier[series.round] * toneBoost[series.statusTone],
    ),
    wagersLabel: formatCompactCount(discussionCount * wagerMultiplier[series.statusTone]),
    intensity,
  };
}

function getNodeStyle(series: PrototypeSeries): CSSProperties {
  const colors = getSlotColors(series.teamA);
  const engagement = getEngagementSnapshot(series);
  const borderAlpha = engagement.intensity === "high" ? 0.34 : engagement.intensity === "medium" ? 0.22 : 0.12;
  const glowAlpha = engagement.intensity === "high" ? 0.18 : engagement.intensity === "medium" ? 0.12 : 0.06;

  return {
    ...getSeriesGradient(series),
    borderColor: hexToRgba(colors.secondary, borderAlpha),
    boxShadow:
      engagement.intensity === "high"
        ? `0 0 0 1px ${hexToRgba(colors.secondary, 0.18)}, 0 18px 30px rgba(2, 6, 23, 0.28), 0 0 24px ${hexToRgba(colors.secondary, glowAlpha)}`
        : engagement.intensity === "medium"
          ? `0 12px 24px rgba(2, 6, 23, 0.22), 0 0 18px ${hexToRgba(colors.secondary, glowAlpha)}`
          : "0 10px 18px rgba(2, 6, 23, 0.18)",
  };
}

function buildFriendActivity(series: PrototypeSeries) {
  const items: FriendActivity[] = [];

  for (const item of communityActivity.filter((entry) => entry.seriesId === series.id).slice(0, 2)) {
    if (item.tone === "comment") {
      items.push({
        id: item.id,
        detail: item.detail,
        label: `${item.user} commented`,
        tone: "comment",
      });
      continue;
    }

    items.push({
      id: item.id,
      detail: item.time,
      label: `${item.user} ${item.action} ${item.detail}`,
      tone: item.tone === "wager" ? "wager" : "pick",
    });
  }

  for (const friend of series.friends) {
    if (items.length >= 2) {
      break;
    }

    items.push(
      friend.confidence.includes("Coins")
        ? {
            id: `${series.id}-${friend.name}-wager`,
            detail: `on ${getWinnerLabel(series, friend.side)}`,
            label: `${friend.name} wagered ${friend.confidence}`,
            tone: "wager",
          }
        : {
            id: `${series.id}-${friend.name}-pick`,
            detail: friend.confidence,
            label: `${friend.name} picked ${getWinnerLabel(series, friend.side)}`,
            tone: "pick",
          },
    );
  }

  return items;
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
        "rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.03))] shadow-[0_16px_34px_rgba(2,6,23,0.32)] backdrop-blur",
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}

function XIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <path d="m5 5 10 10M15 5 5 15" />
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
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    >
      <path d="M4.5 5.5h11v7.5h-5L7.5 15.5v-2.5h-3z" />
    </svg>
  );
}

function CoinsIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    >
      <ellipse cx="10" cy="6" rx="5.5" ry="2.5" />
      <path d="M4.5 6v5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V6" />
      <path d="M4.5 11v3c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-3" />
    </svg>
  );
}

function SlotAvatar({
  slot,
  compact = false,
}: {
  slot: PrototypeSlot;
  compact?: boolean;
}) {
  const teams = getSlotTeams(slot);
  const shellClass = compact
    ? "h-6 w-6 rounded-[14px]"
    : "h-8 w-8 rounded-[16px]";

  if (slot.type === "team" && slot.teamId) {
    return (
      <div
        className={cx(
          "grid shrink-0 place-items-center border border-white/12 bg-white/[0.08]",
          shellClass,
        )}
      >
        <Image
          src={teamMap[slot.teamId].logo}
          alt={`${slot.label} logo`}
          width={compact ? 16 : 20}
          height={compact ? 16 : 20}
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
        "relative grid shrink-0 place-items-center overflow-hidden border border-white/12",
        shellClass,
      )}
      style={{
        backgroundImage: `linear-gradient(145deg, ${hexToRgba(colors.primary, 0.9)}, ${hexToRgba(
          colors.secondary,
          0.9,
        )})`,
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_45%)]" />
      <div className="relative flex items-center">
        {teams.slice(0, 2).map((team, index) => (
          <div
            key={team.id}
            className={cx(
              "grid place-items-center rounded-full border border-white/25 bg-slate-950/70 p-0.5",
              compact ? "h-3.5 w-3.5" : "h-4.5 w-4.5",
              index > 0 && "-ml-1.5",
            )}
          >
            <Image
              src={team.logo}
              alt={`${team.shortName} logo`}
              width={compact ? 10 : 12}
              height={compact ? 10 : 12}
              unoptimized
              className="h-auto w-auto"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamRow({
  slot,
  compact = false,
}: {
  slot: PrototypeSlot;
  compact?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <SlotAvatar slot={slot} compact={compact} />
      <div className="min-w-0 flex-1">
        <p
          className={cx(
            "font-semibold text-white",
            compact ? "text-[10px] leading-[1.05]" : "text-[12px] leading-[1.1]",
          )}
        >
          {getSlotLabel(slot)}
        </p>
      </div>
      {slot.seed ? (
        <span className="rounded-full border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold text-slate-200">
          {slot.seed}
        </span>
      ) : null}
    </div>
  );
}

function HeatMetric({
  icon,
  value,
}: {
  icon: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-200">
      <span>{icon}</span>
      <span>{value}</span>
    </span>
  );
}

function MatchupNode({
  series,
  onOpen,
}: {
  series: PrototypeSeries;
  onOpen: () => void;
}) {
  const favorite = getCommunityFavorite(series);
  const engagement = getEngagementSnapshot(series);

  return (
    <button type="button" onClick={onOpen} className="h-full w-full text-left transition active:scale-[0.99]">
      <div
        className="relative flex h-full flex-col justify-between overflow-hidden rounded-[18px] border px-2.5 py-2"
        style={getNodeStyle(series)}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.1),transparent_40%)]" />
        <div className="relative space-y-1">
          <TeamRow slot={series.teamA} compact />
          <TeamRow slot={series.teamB} compact />
        </div>
        <div className="relative mt-1 space-y-1">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-300">
            {getSeriesSummary(series)}
          </p>
          <p className="truncate text-[10px] text-slate-100">{favorite.percent}% picked {favorite.label}</p>
          <div className="flex items-center justify-between gap-2">
            <HeatMetric icon="🔥" value={engagement.discussionLabel} />
            <HeatMetric icon="📊" value={engagement.predictionsLabel} />
            <HeatMetric icon="💰" value={engagement.wagersLabel} />
          </div>
        </div>
      </div>
    </button>
  );
}

function BracketConnector({ accent }: { accent: string }) {
  return (
    <div className="relative h-full w-full">
      <div className="absolute left-0 top-1/4 w-[52%] border-t" style={{ borderColor: hexToRgba(accent, 0.34) }} />
      <div className="absolute left-0 top-3/4 w-[52%] border-t" style={{ borderColor: hexToRgba(accent, 0.34) }} />
      <div
        className="absolute left-[52%] top-1/4 border-l"
        style={{
          borderColor: hexToRgba(accent, 0.34),
          height: "50%",
        }}
      />
      <div className="absolute right-0 top-1/2 w-[48%] border-t" style={{ borderColor: hexToRgba(accent, 0.34) }} />
    </div>
  );
}

function ActionButton({
  active,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  icon?: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex min-h-[50px] items-center justify-center gap-2 rounded-[16px] border px-3 py-2.5 text-[13px] font-semibold transition active:scale-[0.98]",
        active
          ? "border-white bg-white text-slate-950"
          : "border-white/12 bg-white/[0.06] text-white",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ConferenceBracket({
  finals,
  label,
  onOpen,
  roundOne,
  semifinals,
}: {
  finals: string;
  label: string;
  onOpen: (seriesId: string) => void;
  roundOne: readonly string[];
  semifinals: readonly string[];
}) {
  const accent = getSlotColors(seriesById[roundOne[0]].teamA).secondary;

  return (
    <SurfaceCard className="overflow-hidden p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white">{label}</h2>
          <p className="mt-1 text-[11px] leading-4 text-slate-400">
            Trace the path, then tap into picks, wagers, and thread heat.
          </p>
        </div>
        <span
          className="shrink-0 rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-100"
          style={{
            borderColor: hexToRgba(accent, 0.36),
            backgroundColor: hexToRgba(accent, 0.14),
          }}
        >
          Live map
        </span>
      </div>

      <div
        className="mt-3 grid gap-x-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500"
        style={{ gridTemplateColumns: bracketGridTemplateColumns }}
      >
        <p style={{ gridColumn: 1 }}>Round 1</p>
        <p style={{ gridColumn: 3 }}>Semis</p>
        <p style={{ gridColumn: 5 }}>Conf Finals</p>
      </div>

      <div
        className="mt-2 grid gap-x-1.5 gap-y-1.5"
        style={{
          gridTemplateColumns: bracketGridTemplateColumns,
          gridTemplateRows: bracketGridTemplateRows,
        }}
      >
        {roundOne.map((seriesId, index) => (
          <div key={seriesId} className="min-w-0" style={{ gridColumn: 1, gridRow: roundOneRows[index] }}>
            <MatchupNode series={seriesById[seriesId]} onOpen={() => onOpen(seriesId)} />
          </div>
        ))}

        <div style={{ gridColumn: 2, gridRow: "1 / 4" }}>
          <BracketConnector accent={accent} />
        </div>
        <div style={{ gridColumn: 2, gridRow: "5 / 8" }}>
          <BracketConnector accent={accent} />
        </div>

        <div className="min-w-0 self-center" style={{ gridColumn: 3, gridRow: "1 / 4" }}>
          <MatchupNode series={seriesById[semifinals[0]]} onOpen={() => onOpen(semifinals[0])} />
        </div>
        <div className="min-w-0 self-center" style={{ gridColumn: 3, gridRow: "5 / 8" }}>
          <MatchupNode series={seriesById[semifinals[1]]} onOpen={() => onOpen(semifinals[1])} />
        </div>

        <div style={{ gridColumn: 4, gridRow: "1 / 8" }}>
          <BracketConnector accent={accent} />
        </div>

        <div className="min-w-0 self-center" style={{ gridColumn: 5, gridRow: "1 / 8" }}>
          <MatchupNode series={seriesById[finals]} onOpen={() => onOpen(finals)} />
        </div>
      </div>
    </SurfaceCard>
  );
}

function FinalsBracket({ onOpen }: { onOpen: (seriesId: string) => void }) {
  const finalsSeries = seriesById["nba-finals"];

  return (
    <SurfaceCard className="overflow-hidden p-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">NBA Finals</p>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="mt-3 flex flex-col items-center">
        <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] text-slate-400">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1">
            {getSlotLabel(finalsSeries.teamA)}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1">
            {getSlotLabel(finalsSeries.teamB)}
          </span>
        </div>
        <div className="mt-2 h-4 w-px bg-white/10" />
        <div className="w-full max-w-[260px]">
          <MatchupNode series={finalsSeries} onOpen={() => onOpen(finalsSeries.id)} />
        </div>
      </div>
    </SurfaceCard>
  );
}

function PlayoffsPrototypeApp() {
  const [coins, setCoins] = useState(prototypeData.user.coins);
  const [toast, setToast] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [draftWinner, setDraftWinner] = useState<SlotSide | null>(null);
  const [draftWager, setDraftWager] = useState<number>(120);
  const [predictions, setPredictions] = useState<Record<string, PredictionRecord>>({});
  const [wagers, setWagers] = useState<Record<string, WagerRecord>>({});

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 2200);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  const selectedSeries = sheet ? seriesById[sheet.seriesId] : null;
  const sheetMode = sheet?.mode ?? "overview";
  const prediction = selectedSeries ? predictions[selectedSeries.id] : null;
  const wager = selectedSeries ? wagers[selectedSeries.id] : null;
  const friendActivity = selectedSeries ? buildFriendActivity(selectedSeries) : [];

  const openSheet = (seriesId: string, mode: SheetMode = "overview") => {
    const existingPrediction = predictions[seriesId];
    const existingWager = wagers[seriesId];

    setDraftWinner(existingPrediction?.winner ?? existingWager?.winner ?? "teamA");
    setDraftWager(existingWager?.amount ?? 120);
    setSheet({ mode, seriesId });
  };

  const closeSheet = () => setSheet(null);

  const confirmPrediction = () => {
    if (!selectedSeries || !draftWinner) {
      return;
    }

    setPredictions((current) => ({
      ...current,
      [selectedSeries.id]: { winner: draftWinner },
    }));
    setToast(`Prediction saved: ${getWinnerLabel(selectedSeries, draftWinner)}`);
    setSheet({ mode: "overview", seriesId: selectedSeries.id });
  };

  const confirmWager = () => {
    if (!selectedSeries || !draftWinner) {
      return;
    }

    const previousAmount = wagers[selectedSeries.id]?.amount ?? 0;
    const delta = draftWager - previousAmount;

    if (delta > coins) {
      setToast("Not enough Coins for that wager.");
      return;
    }

    setCoins((current) => current - delta);
    setWagers((current) => ({
      ...current,
      [selectedSeries.id]: {
        amount: draftWager,
        winner: draftWinner,
      },
    }));
    setToast(`Wagered ${draftWager} Coins on ${getWinnerLabel(selectedSeries, draftWinner)}`);
    setSheet({ mode: "overview", seriesId: selectedSeries.id });
  };

  const openThread = () => {
    if (!selectedSeries) {
      return;
    }

    setToast(`Opened ${getSlotLabel(selectedSeries.teamA)} vs ${getSlotLabel(selectedSeries.teamB)} in Real.`);
    closeSheet();
  };

  return (
    <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-[430px] items-center justify-center">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_35%),radial-gradient(circle_at_bottom,rgba(249,115,22,0.1),transparent_28%)]" />

      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 top-5 z-[70] flex justify-center px-3">
          <div className="w-full max-w-[430px] rounded-[16px] border border-emerald-400/20 bg-emerald-500/14 px-4 py-3 text-center text-[12px] font-semibold text-emerald-100 shadow-[0_12px_24px_rgba(16,185,129,0.15)]">
            {toast}
          </div>
        </div>
      ) : null}

      <div className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#050912] shadow-[0_28px_120px_rgba(2,6,23,0.72)] sm:min-h-[860px]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]" />
        <div className="relative mx-auto mt-3 h-1.5 w-24 rounded-full bg-white/12" />

        <div className="relative flex-1 overflow-y-auto px-3 pb-6 pt-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-sky-300">Real • Playoff Map</p>
              <h1 className="mt-1 font-display text-[1.85rem] uppercase leading-[0.92] tracking-[0.04em] text-white">
                NBA Playoffs
              </h1>
              <p className="mt-1 text-[12px] leading-5 text-slate-300">{prototypeData.asOfLabel}</p>
            </div>

            <div className="shrink-0 rounded-[18px] border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-right">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-amber-100">
                <CoinsIcon />
                <span>{coins}</span>
              </div>
              <p className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-amber-200/75">Coins</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-300">
              🔥 Thread heat
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-300">
              📊 Picks
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-300">
              💰 Coins
            </span>
            <span className="rounded-full border border-sky-400/18 bg-sky-500/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-sky-100">
              Tap any series
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {conferenceTrees.map((conference) => (
              <ConferenceBracket
                key={conference.id}
                finals={conference.finals}
                label={conference.label}
                onOpen={openSheet}
                roundOne={conference.roundOne}
                semifinals={conference.semifinals}
              />
            ))}

            <FinalsBracket onOpen={openSheet} />
          </div>
        </div>
      </div>

      {selectedSeries ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/72 px-3">
          <button type="button" aria-label="Close series sheet" className="absolute inset-0" onClick={closeSheet} />

          <SurfaceCard className="relative z-10 w-full max-w-[430px] rounded-b-none border-b-0 p-0">
            <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-white/12" />
            <div className="max-h-[78dvh] overflow-y-auto px-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {selectedSeries.conference} • {selectedSeries.round}
                  </p>
                  <h2 className="mt-1 text-[18px] font-semibold leading-[1.05] text-white">
                    {getSlotLabel(selectedSeries.teamA)} vs {getSlotLabel(selectedSeries.teamB)}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-semibold text-slate-200">
                      {getSeriesSummary(selectedSeries)}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-semibold text-slate-200">
                      🔥 {selectedSeries.fansDiscussing} discussing
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeSheet}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-slate-200"
                >
                  <XIcon />
                </button>
              </div>

              <SurfaceCard style={getSeriesGradient(selectedSeries)} className="mt-3 p-3">
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Community
                  </span>
                  <p className="text-[13px] font-semibold text-white">
                    {getCommunityFavorite(selectedSeries).percent}% picked {getCommunityFavorite(selectedSeries).label}
                  </p>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Activity
                  </span>
                  <div className="flex flex-wrap gap-3 text-[11px] text-slate-200">
                    <span>🔥 {selectedSeries.fansDiscussing}</span>
                    <span>📊 {getEngagementSnapshot(selectedSeries).predictionsLabel}</span>
                    <span>💰 {getEngagementSnapshot(selectedSeries).wagersLabel}</span>
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard className="mt-2.5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Friends Activity
                  </p>
                  <span className="text-[10px] text-slate-500">From your Real feed</span>
                </div>
                <div className="mt-2 space-y-2">
                  {friendActivity.map((item) => (
                    <div
                      key={item.id}
                      className={cx("rounded-[16px] border px-3 py-2", activityToneClasses[item.tone])}
                    >
                      <p className="text-[12px] font-semibold text-white">{item.label}</p>
                      <p className="mt-0.5 text-[11px] text-slate-200">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </SurfaceCard>

              <div className="mt-2.5 grid grid-cols-3 gap-2">
                <ActionButton
                  active={sheetMode === "predict"}
                  icon={<span className="text-[13px]">📊</span>}
                  label="Predict"
                  onClick={() => setSheet({ mode: "predict", seriesId: selectedSeries.id })}
                />
                <ActionButton
                  active={sheetMode === "wager"}
                  icon={<CoinsIcon />}
                  label="Wager"
                  onClick={() => setSheet({ mode: "wager", seriesId: selectedSeries.id })}
                />
                <ActionButton icon={<ChatIcon />} label="Open Thread" onClick={openThread} />
              </div>

              {prediction || wager ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {prediction ? (
                    <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-2 py-1 text-[10px] font-semibold text-sky-100">
                      Your pick: {getWinnerLabel(selectedSeries, prediction.winner)}
                    </span>
                  ) : null}
                  {wager ? (
                    <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-100">
                      {wager.amount} Coins on {getWinnerLabel(selectedSeries, wager.winner)}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {sheetMode === "predict" ? (
                <SurfaceCard className="mt-2.5 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Predict next result</p>
                  <div className="mt-2 space-y-2">
                    {(["teamA", "teamB"] as const).map((side) => {
                      const slot = side === "teamA" ? selectedSeries.teamA : selectedSeries.teamB;

                      return (
                        <button
                          key={side}
                          type="button"
                          onClick={() => setDraftWinner(side)}
                          className={cx(
                            "w-full rounded-[16px] border px-3 py-2.5 text-left transition",
                            draftWinner === side
                              ? "border-sky-300/35 bg-sky-500/12"
                              : "border-white/10 bg-black/20",
                          )}
                        >
                          <TeamRow slot={slot} />
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={confirmPrediction}
                    disabled={!draftWinner}
                    className={cx(
                      "mt-3 w-full rounded-[16px] px-4 py-3 text-[13px] font-semibold transition",
                      draftWinner
                        ? "bg-white text-slate-950 active:scale-[0.98]"
                        : "cursor-not-allowed bg-white/10 text-slate-500",
                    )}
                  >
                    {prediction ? "Update Prediction" : "Confirm Prediction"}
                  </button>
                </SurfaceCard>
              ) : null}

              {sheetMode === "wager" ? (
                <SurfaceCard className="mt-2.5 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Wager Coins</p>
                  <div className="mt-2 space-y-2">
                    {(["teamA", "teamB"] as const).map((side) => {
                      const slot = side === "teamA" ? selectedSeries.teamA : selectedSeries.teamB;

                      return (
                        <button
                          key={side}
                          type="button"
                          onClick={() => setDraftWinner(side)}
                          className={cx(
                            "w-full rounded-[16px] border px-3 py-2.5 text-left transition",
                            draftWinner === side
                              ? "border-amber-300/35 bg-amber-500/12"
                              : "border-white/10 bg-black/20",
                          )}
                        >
                          <TeamRow slot={slot} />
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {wagerOptions.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setDraftWager(amount)}
                        className={cx(
                          "rounded-[14px] border px-2 py-2 text-[12px] font-semibold transition",
                          draftWager === amount
                            ? "border-amber-300/35 bg-amber-500/12 text-amber-100"
                            : "border-white/10 bg-black/20 text-slate-200",
                        )}
                      >
                        {amount}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">You have {coins} Coins available.</p>
                  <button
                    type="button"
                    onClick={confirmWager}
                    disabled={!draftWinner}
                    className={cx(
                      "mt-3 w-full rounded-[16px] px-4 py-3 text-[13px] font-semibold transition",
                      draftWinner
                        ? "bg-white text-slate-950 active:scale-[0.98]"
                        : "cursor-not-allowed bg-white/10 text-slate-500",
                    )}
                  >
                    {wager ? "Update Wager" : "Confirm Wager"}
                  </button>
                </SurfaceCard>
              ) : null}
            </div>
          </SurfaceCard>
        </div>
      ) : null}
    </main>
  );
}

export default PlayoffsPrototypeApp;
