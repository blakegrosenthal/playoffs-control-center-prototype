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
type SheetMode = "overview" | "predict" | "wager" | "thread";
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

const conferenceColumns = {
  west: {
    label: "Western Conference",
    rounds: [
      { label: "Round 1", seriesIds: ["west-r1-1", "west-r1-2", "west-r1-3", "west-r1-4"] },
      { label: "Conference Semifinals", seriesIds: ["west-sf-1", "west-sf-2"] },
      { label: "Conference Finals", seriesIds: ["west-finals"] },
    ],
  },
  east: {
    label: "Eastern Conference",
    rounds: [
      { label: "Round 1", seriesIds: ["east-r1-1", "east-r1-2", "east-r1-3", "east-r1-4"] },
      { label: "Conference Semifinals", seriesIds: ["east-sf-1", "east-sf-2"] },
      { label: "Conference Finals", seriesIds: ["east-finals"] },
    ],
  },
} as const;

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const toneClasses: Record<PrototypeSeries["statusTone"], string> = {
  hot: "border-rose-400/30 bg-rose-500/12 text-rose-100",
  locked: "border-emerald-400/30 bg-emerald-500/12 text-emerald-100",
  pending: "border-white/10 bg-white/[0.06] text-slate-200",
  watch: "border-sky-400/30 bg-sky-500/12 text-sky-100",
};

const activityToneClasses: Record<FriendActivity["tone"], string> = {
  comment: "border-violet-400/20 bg-violet-500/10 text-violet-100",
  pick: "border-sky-400/20 bg-sky-500/10 text-sky-100",
  wager: "border-amber-400/20 bg-amber-500/10 text-amber-100",
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
      linear-gradient(150deg, ${hexToRgba(left.primary, 0.18)}, rgba(7, 11, 22, 0.96) 52%, ${hexToRgba(right.primary, 0.18)}),
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
    return `${series.community.teamA}% picked ${getSlotLabel(series.teamA)}`;
  }

  return `${series.community.teamB}% picked ${getSlotLabel(series.teamB)}`;
}

function getSeriesSummary(series: PrototypeSeries) {
  return series.score.includes("-") ? `Series ${series.score}` : series.score;
}

function buildFriendActivity(series: PrototypeSeries) {
  const items: FriendActivity[] = [];

  for (const item of communityActivity.filter((entry) => entry.seriesId === series.id).slice(0, 2)) {
    items.push({
      id: item.id,
      detail:
        item.tone === "comment"
          ? item.detail
          : item.tone === "wager"
            ? "Coins are live on this matchup."
            : "Locked from your Real feed.",
      label:
        item.tone === "comment"
          ? `${item.user} commented on this series`
          : `${item.user} ${item.action} ${item.detail}`,
      tone:
        item.tone === "wager"
          ? "wager"
          : item.tone === "comment"
            ? "comment"
            : "pick",
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
        "rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.035))] shadow-[0_14px_30px_rgba(2,6,23,0.28)] backdrop-blur",
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

function SlotBadge({ slot }: { slot: PrototypeSlot }) {
  const teams = getSlotTeams(slot);

  if (slot.type === "team" && slot.teamId) {
    return (
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-2xl border border-white/12 bg-white/[0.08]">
        <Image
          src={teamMap[slot.teamId].logo}
          alt={`${slot.label} logo`}
          width={22}
          height={22}
          unoptimized
          className="h-auto w-auto"
        />
      </div>
    );
  }

  const colors = getSlotColors(slot);

  return (
    <div
      className="relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/12"
      style={{
        backgroundImage: `linear-gradient(145deg, ${hexToRgba(colors.primary, 0.9)}, ${hexToRgba(
          colors.secondary,
          0.9,
        )})`,
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.2),transparent_45%)]" />
      <div className="relative flex items-center">
        {teams.slice(0, 2).map((team, index) => (
          <div
            key={team.id}
            className={cx(
              "grid place-items-center rounded-full border border-white/25 bg-slate-950/70 p-0.5",
              index > 0 && "-ml-1.5",
            )}
          >
            <Image
              src={team.logo}
              alt={`${team.shortName} logo`}
              width={12}
              height={12}
              unoptimized
              className="h-auto w-auto"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamLine({ slot }: { slot: PrototypeSlot }) {
  return (
    <div className="flex items-center gap-2">
      <SlotBadge slot={slot} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold text-white">{getSlotLabel(slot)}</p>
      </div>
      {slot.seed ? (
        <span className="rounded-full border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-slate-200">
          ({slot.seed})
        </span>
      ) : null}
    </div>
  );
}

function SeriesCard({
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
        <div className="space-y-1.5">
          <TeamLine slot={series.teamA} />
          <TeamLine slot={series.teamB} />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold text-slate-200">{getSeriesSummary(series)}</span>
          <span
            className={cx(
              "rounded-full border px-1.5 py-0.5 text-[9px] font-semibold",
              toneClasses[series.statusTone],
            )}
          >
            {series.status}
          </span>
        </div>
        <p className="mt-1 text-[10px] text-slate-400">{getCommunityFavorite(series)}</p>
      </SurfaceCard>
    </button>
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
        "flex min-h-[48px] items-center justify-center gap-2 rounded-[16px] border px-3 py-2.5 text-[13px] font-semibold transition active:scale-[0.98]",
        active
          ? "border-white bg-white text-slate-950"
          : "border-white/12 bg-white/[0.05] text-white",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
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
  const prediction = selectedSeries ? predictions[selectedSeries.id] : null;
  const wager = selectedSeries ? wagers[selectedSeries.id] : null;

  const openSheet = (seriesId: string, mode: SheetMode = "overview") => {
    const nextSeries = seriesById[seriesId];
    const existingPrediction = predictions[seriesId];
    const existingWager = wagers[seriesId];

    setDraftWinner(existingPrediction?.winner ?? existingWager?.winner ?? "teamA");
    setDraftWager(existingWager?.amount ?? 120);
    setSheet({ mode, seriesId: nextSeries.id });
  };

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

  return (
    <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-[430px] items-center justify-center">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_35%),radial-gradient(circle_at_bottom,rgba(249,115,22,0.1),transparent_28%)]" />
      <div className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#050912] shadow-[0_28px_120px_rgba(2,6,23,0.72)] sm:min-h-[860px]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]" />
        <div className="relative mx-auto mt-3 h-1.5 w-24 rounded-full bg-white/12" />

        <div className="relative flex-1 overflow-y-auto px-3 pb-6 pt-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-sky-300">
                Real Sports Feature
              </p>
              <h1 className="mt-1 font-display text-[1.9rem] uppercase leading-[0.92] tracking-[0.04em] text-white">
                NBA Playoffs
              </h1>
              <p className="mt-1 max-w-[18rem] text-[12px] leading-5 text-slate-300">
                Tap a series to predict, wager Coins, or jump into the Real thread.
              </p>
            </div>
            <div className="shrink-0 rounded-[18px] border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-right">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-amber-100">
                <CoinsIcon />
                <span>{coins}</span>
              </div>
              <p className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-amber-200/75">
                Coins
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-[24px] border border-white/10 bg-white/[0.03] p-2.5">
            <div className="grid grid-cols-2 gap-2">
              {Object.values(conferenceColumns).map((conference) => (
                <div key={conference.label} className="space-y-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {conference.label}
                    </p>
                  </div>

                  {conference.rounds.map((round) => (
                    <div key={round.label} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <p className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          {round.label}
                        </p>
                        <div className="h-px flex-1 bg-white/8" />
                      </div>
                      <div className="space-y-1.5">
                        {round.seriesIds.map((seriesId) => (
                          <SeriesCard
                            key={seriesId}
                            series={seriesById[seriesId]}
                            onOpen={() => openSheet(seriesId)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="mx-auto mt-3 max-w-[220px] space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-white/8" />
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  NBA Finals
                </p>
                <div className="h-px flex-1 bg-white/8" />
              </div>
              <SeriesCard series={seriesById["nba-finals"]} onOpen={() => openSheet("nba-finals")} />
            </div>
          </div>
        </div>

        {toast ? (
          <div className="pointer-events-none absolute inset-x-0 top-[5.4rem] z-30 px-3">
            <div className="rounded-[16px] border border-emerald-400/20 bg-emerald-500/14 px-4 py-3 text-center text-[12px] font-semibold text-emerald-100 shadow-[0_12px_24px_rgba(16,185,129,0.15)]">
              {toast}
            </div>
          </div>
        ) : null}

        {selectedSeries ? (
          <div className="absolute inset-0 z-40 flex items-end bg-slate-950/70">
            <button
              type="button"
              aria-label="Close series sheet"
              className="absolute inset-0"
              onClick={() => setSheet(null)}
            />

            <SurfaceCard className="relative z-10 max-h-[82dvh] w-full rounded-b-none border-b-0 p-0">
              <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-white/12" />
              <div className="max-h-[80dvh] overflow-y-auto px-3 pb-5 pt-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {selectedSeries.conference} • {selectedSeries.round}
                    </p>
                    <h2 className="mt-1 text-[18px] font-semibold text-white">
                      {getSlotLabel(selectedSeries.teamA)} vs {getSlotLabel(selectedSeries.teamB)}
                    </h2>
                    <p className="mt-1 text-[12px] text-slate-300">
                      {getSeriesSummary(selectedSeries)} • {selectedSeries.fansDiscussing} discussing
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSheet(null)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-slate-200"
                  >
                    <XIcon />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <SurfaceCard style={getSeriesGradient(selectedSeries)} className="p-2.5">
                    <p className="text-[9px] uppercase tracking-[0.14em] text-slate-400">
                      Community Pick
                    </p>
                    <p className="mt-1 text-[14px] font-semibold text-white">
                      {selectedSeries.community.teamA >= selectedSeries.community.teamB
                        ? getSlotLabel(selectedSeries.teamA)
                        : getSlotLabel(selectedSeries.teamB)}
                    </p>
                    <p className="text-[11px] text-slate-300">
                      {selectedSeries.community.teamA >= selectedSeries.community.teamB
                        ? `${selectedSeries.community.teamA}% of picks`
                        : `${selectedSeries.community.teamB}% of picks`}
                    </p>
                  </SurfaceCard>

                  <SurfaceCard className="p-2.5">
                    <p className="text-[9px] uppercase tracking-[0.14em] text-slate-400">
                      Your Activity
                    </p>
                    <p className="mt-1 text-[12px] font-semibold text-white">
                      {prediction ? getWinnerLabel(selectedSeries, prediction.winner) : "No prediction yet"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {wager
                        ? `${wager.amount} Coins on ${getWinnerLabel(selectedSeries, wager.winner)}`
                        : "No wager yet"}
                    </p>
                  </SurfaceCard>
                </div>

                <div className="mt-3">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Friends Activity
                  </p>
                  <div className="mt-2 space-y-2">
                    {buildFriendActivity(selectedSeries).map((item) => (
                      <div
                        key={item.id}
                        className={cx(
                          "rounded-[16px] border px-3 py-2.5",
                          activityToneClasses[item.tone],
                        )}
                      >
                        <p className="text-[12px] font-semibold text-white">{item.label}</p>
                        <p className="mt-0.5 text-[11px] text-slate-200">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <ActionButton
                    active={sheet?.mode === "predict"}
                    label="Predict"
                    onClick={() => setSheet({ mode: "predict", seriesId: selectedSeries.id })}
                  />
                  <ActionButton
                    active={sheet?.mode === "wager"}
                    icon={<CoinsIcon />}
                    label="Wager"
                    onClick={() => setSheet({ mode: "wager", seriesId: selectedSeries.id })}
                  />
                  <ActionButton
                    active={sheet?.mode === "thread"}
                    icon={<ChatIcon />}
                    label="Open Thread"
                    onClick={() => setSheet({ mode: "thread", seriesId: selectedSeries.id })}
                  />
                </div>

                {sheet?.mode === "predict" ? (
                  <SurfaceCard className="mt-3 p-3">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Predict
                    </p>
                    <p className="mt-1 text-[12px] text-slate-300">
                      Lock the team you think wins the next game.
                    </p>
                    <div className="mt-3 space-y-2">
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
                            <TeamLine slot={slot} />
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
                      Save Prediction
                    </button>
                  </SurfaceCard>
                ) : null}

                {sheet?.mode === "wager" ? (
                  <SurfaceCard className="mt-3 p-3">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Wager Coins
                    </p>
                    <p className="mt-1 text-[12px] text-slate-300">
                      Pick a team and set your Coins for the next result.
                    </p>
                    <div className="mt-3 space-y-2">
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
                            <TeamLine slot={slot} />
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
                    <p className="mt-2 text-[11px] text-slate-400">
                      You have {coins} Coins available.
                    </p>
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
                      Confirm Wager
                    </button>
                  </SurfaceCard>
                ) : null}

                {sheet?.mode === "thread" ? (
                  <SurfaceCard className="mt-3 p-3">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Real Thread
                    </p>
                    <div className="mt-2 space-y-2">
                      {selectedSeries.comments.slice(0, 2).map((comment) => (
                        <div
                          key={comment.id}
                          className="rounded-[16px] border border-white/10 bg-black/20 px-3 py-2.5"
                        >
                          <p className="text-[12px] font-semibold text-white">{comment.user}</p>
                          <p className="mt-1 text-[12px] leading-5 text-slate-200">{comment.text}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setToast(`Opened ${getSlotLabel(selectedSeries.teamA)} vs ${getSlotLabel(selectedSeries.teamB)} thread in Real.`)}
                      className="mt-3 w-full rounded-[16px] border border-white/12 bg-white/[0.05] px-4 py-3 text-[13px] font-semibold text-white transition active:scale-[0.98]"
                    >
                      Jump Into Thread
                    </button>
                  </SurfaceCard>
                ) : null}
              </div>
            </SurfaceCard>
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default PlayoffsPrototypeApp;
