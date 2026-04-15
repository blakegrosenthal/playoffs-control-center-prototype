"use client";

import Image from "next/image";
import { playInById, seriesById } from "@/lib/nba-playoffs/data";
import {
  formatPlayInStatus,
  formatSeriesStatus,
  getFinalsChampion,
  getSeriesWins,
  getSlotLabel,
  getSlotSeedLabel,
  getTeam,
  isSeriesLengthCorrect,
  resolveSeriesParticipants,
  resolveSlotTeamId,
} from "@/lib/nba-playoffs/engine";
import { BracketEntry, ResultsState, SeriesLength, Team } from "@/lib/nba-playoffs/types";

type ViewMode = "my-bracket" | "official-bracket";
type ConnectorDirection = "right" | "left";

interface BracketBoardProps {
  entry: BracketEntry;
  results: ResultsState;
  viewMode: ViewMode;
  isLocked: boolean;
  onPickWinner: (matchupId: string, teamId: string) => void;
  onPickGames: (seriesId: string, games: SeriesLength) => void;
}

interface CardLayout {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  kind: "play-in" | "series" | "finals";
}

interface Connector {
  from: string;
  to: string;
  direction: ConnectorDirection;
  tone: "east" | "west" | "finals";
}

interface StageHeader {
  left: number;
  width: number;
  label: string;
  conference?: string;
  featured?: boolean;
}

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const lengthOptions: SeriesLength[] = [4, 5, 6, 7];

const CANVAS_WIDTH = 3040;
const CANVAS_HEIGHT = 1440;
const PLAY_IN_WIDTH = 200;
const SERIES_WIDTH = 250;
const FINALS_WIDTH = 280;
const PLAY_IN_HEIGHT = 156;
const SERIES_HEIGHT = 196;
const FINALS_HEIGHT = 208;

const cardLayouts: CardLayout[] = [
  { id: "east-playin-78", left: 40, top: 930, width: PLAY_IN_WIDTH, height: PLAY_IN_HEIGHT, kind: "play-in" },
  { id: "east-playin-910", left: 40, top: 1188, width: PLAY_IN_WIDTH, height: PLAY_IN_HEIGHT, kind: "play-in" },
  { id: "east-playin-8", left: 250, top: 1059, width: PLAY_IN_WIDTH, height: PLAY_IN_HEIGHT, kind: "play-in" },
  { id: "east-r1-1", left: 490, top: 70, width: SERIES_WIDTH, height: SERIES_HEIGHT, kind: "series" },
  { id: "east-r1-4", left: 490, top: 350, width: SERIES_WIDTH, height: SERIES_HEIGHT, kind: "series" },
  { id: "east-r1-3", left: 490, top: 630, width: SERIES_WIDTH, height: SERIES_HEIGHT, kind: "series" },
  { id: "east-r1-2", left: 490, top: 910, width: SERIES_WIDTH, height: SERIES_HEIGHT, kind: "series" },
  { id: "east-sf-1", left: 810, top: 210, width: SERIES_WIDTH, height: SERIES_HEIGHT, kind: "series" },
  { id: "east-sf-2", left: 810, top: 770, width: SERIES_WIDTH, height: SERIES_HEIGHT, kind: "series" },
  { id: "east-cf", left: 1120, top: 490, width: SERIES_WIDTH, height: SERIES_HEIGHT, kind: "series" },
  { id: "nba-finals", left: 1380, top: 484, width: FINALS_WIDTH, height: FINALS_HEIGHT, kind: "finals" },
  { id: "west-cf", left: 1670, top: 490, width: SERIES_WIDTH, height: SERIES_HEIGHT, kind: "series" },
  { id: "west-sf-1", left: 1980, top: 210, width: SERIES_WIDTH, height: SERIES_HEIGHT, kind: "series" },
  { id: "west-sf-2", left: 1980, top: 770, width: SERIES_WIDTH, height: SERIES_HEIGHT, kind: "series" },
  { id: "west-r1-1", left: 2290, top: 70, width: SERIES_WIDTH, height: SERIES_HEIGHT, kind: "series" },
  { id: "west-r1-4", left: 2290, top: 350, width: SERIES_WIDTH, height: SERIES_HEIGHT, kind: "series" },
  { id: "west-r1-3", left: 2290, top: 630, width: SERIES_WIDTH, height: SERIES_HEIGHT, kind: "series" },
  { id: "west-r1-2", left: 2290, top: 910, width: SERIES_WIDTH, height: SERIES_HEIGHT, kind: "series" },
  { id: "west-playin-8", left: 2580, top: 1059, width: PLAY_IN_WIDTH, height: PLAY_IN_HEIGHT, kind: "play-in" },
  { id: "west-playin-78", left: 2800, top: 930, width: PLAY_IN_WIDTH, height: PLAY_IN_HEIGHT, kind: "play-in" },
  { id: "west-playin-910", left: 2800, top: 1188, width: PLAY_IN_WIDTH, height: PLAY_IN_HEIGHT, kind: "play-in" },
];

const layoutById = Object.fromEntries(
  cardLayouts.map((layout) => [layout.id, layout]),
) as Record<string, CardLayout>;

const stageHeaders: StageHeader[] = [
  { left: 40, width: 410, label: "Play-In", conference: "Eastern Conference" },
  { left: 490, width: SERIES_WIDTH, label: "Round 1" },
  { left: 810, width: SERIES_WIDTH, label: "Conference Semifinals" },
  { left: 1120, width: SERIES_WIDTH, label: "Conference Finals" },
  { left: 1380, width: FINALS_WIDTH, label: "NBA Finals", featured: true },
  { left: 1670, width: SERIES_WIDTH, label: "Conference Finals" },
  { left: 1980, width: SERIES_WIDTH, label: "Conference Semifinals" },
  { left: 2290, width: SERIES_WIDTH, label: "Round 1" },
  { left: 2580, width: 420, label: "Play-In", conference: "Western Conference" },
];

const connectors: Connector[] = [
  { from: "east-playin-78", to: "east-r1-2", direction: "right", tone: "east" },
  { from: "east-playin-78", to: "east-playin-8", direction: "right", tone: "east" },
  { from: "east-playin-910", to: "east-playin-8", direction: "right", tone: "east" },
  { from: "east-playin-8", to: "east-r1-1", direction: "right", tone: "east" },
  { from: "east-r1-1", to: "east-sf-1", direction: "right", tone: "east" },
  { from: "east-r1-4", to: "east-sf-1", direction: "right", tone: "east" },
  { from: "east-r1-3", to: "east-sf-2", direction: "right", tone: "east" },
  { from: "east-r1-2", to: "east-sf-2", direction: "right", tone: "east" },
  { from: "east-sf-1", to: "east-cf", direction: "right", tone: "east" },
  { from: "east-sf-2", to: "east-cf", direction: "right", tone: "east" },
  { from: "east-cf", to: "nba-finals", direction: "right", tone: "finals" },
  { from: "west-playin-78", to: "west-r1-2", direction: "left", tone: "west" },
  { from: "west-playin-78", to: "west-playin-8", direction: "left", tone: "west" },
  { from: "west-playin-910", to: "west-playin-8", direction: "left", tone: "west" },
  { from: "west-playin-8", to: "west-r1-1", direction: "left", tone: "west" },
  { from: "west-r1-1", to: "west-sf-1", direction: "left", tone: "west" },
  { from: "west-r1-4", to: "west-sf-1", direction: "left", tone: "west" },
  { from: "west-r1-3", to: "west-sf-2", direction: "left", tone: "west" },
  { from: "west-r1-2", to: "west-sf-2", direction: "left", tone: "west" },
  { from: "west-sf-1", to: "west-cf", direction: "left", tone: "west" },
  { from: "west-sf-2", to: "west-cf", direction: "left", tone: "west" },
  { from: "west-cf", to: "nba-finals", direction: "left", tone: "finals" },
];

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const roundLabelByRound = {
  "round-1": "Round 1",
  semifinals: "Conference Semifinals",
  "conference-finals": "Conference Finals",
  finals: "NBA Finals",
} as const;

function TeamLogo({ team }: { team: Team }) {
  return (
    <Image
      src={team.logo}
      alt={`${team.displayName} logo`}
      width={26}
      height={26}
      unoptimized
      className="h-6 w-6 rounded-full bg-white p-0.5"
    />
  );
}

function EmptyTeamRow({
  label,
  seedLabel,
}: {
  label: string;
  seedLabel?: string;
}) {
  return (
    <div className="flex min-h-[48px] items-center justify-between rounded-xl border border-dashed border-white/12 bg-white/[0.03] px-3 py-2">
      <div className="flex items-center gap-2">
        {seedLabel ? (
          <span className="rounded-full border border-white/10 bg-slate-950 px-2 py-0.5 text-[10px] font-semibold text-slate-200">
            #{seedLabel}
          </span>
        ) : null}
        <span className="text-sm text-slate-300/80">{label}</span>
      </div>
      <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
        TBD
      </span>
    </div>
  );
}

function PickMarker({
  selected,
  actual,
  resolved,
}: {
  selected: boolean;
  actual: boolean;
  resolved: boolean;
}) {
  if (selected && actual) {
    return <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />;
  }

  if (selected && resolved && !actual) {
    return <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />;
  }

  if (selected && !actual) {
    return <span className="h-2.5 w-2.5 rounded-full bg-sky-300" />;
  }

  if (!selected && actual) {
    return <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />;
  }

  return <span className="h-2.5 w-2.5 rounded-full bg-white/10" />;
}

function TeamRow({
  team,
  fallbackLabel,
  seedLabel,
  selected,
  actualWinnerId,
  wins,
  interactive,
  onSelect,
}: {
  team: Team | null;
  fallbackLabel: string;
  seedLabel?: string;
  selected: boolean;
  actualWinnerId?: string;
  wins?: number;
  interactive: boolean;
  onSelect: () => void;
}) {
  if (!team) {
    return <EmptyTeamRow label={fallbackLabel} seedLabel={seedLabel} />;
  }

  const actual = actualWinnerId === team.id;
  const active = selected || actual;
  const missedPick = Boolean(actualWinnerId) && selected && !actual;

  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={onSelect}
      className={cx(
        "flex min-h-[48px] w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition",
        active
          ? "border-white/35 bg-white/[0.09]"
          : "border-white/10 bg-white/[0.03]",
        missedPick && "border-rose-300/30 bg-rose-500/[0.08]",
        interactive && "hover:border-white/25 hover:bg-white/[0.06]",
        !interactive && "cursor-default",
      )}
      style={
        active
          ? {
              boxShadow: `inset 0 0 0 1px ${team.colors.secondary}66`,
            }
          : undefined
      }
    >
      <div className="flex min-w-0 items-center gap-2">
        {seedLabel ? (
          <span className="rounded-full border border-white/10 bg-slate-950 px-2 py-0.5 text-[10px] font-semibold text-slate-100">
            #{seedLabel}
          </span>
        ) : null}
        <TeamLogo team={team} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">
            {team.displayName}
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            {team.tricode}
          </div>
        </div>
      </div>
      <div className="ml-3 flex items-center gap-2">
        {typeof wins === "number" && wins > 0 ? (
          <span className="min-w-5 text-right text-base font-black text-white">
            {wins}
          </span>
        ) : null}
        <PickMarker selected={selected} actual={actual} resolved={Boolean(actualWinnerId)} />
      </div>
    </button>
  );
}

function LengthPicker({
  value,
  disabled,
  correctness,
  onPick,
}: {
  value?: SeriesLength;
  disabled: boolean;
  correctness: boolean | undefined;
  onPick: (games: SeriesLength) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex gap-1.5">
        {lengthOptions.map((games) => (
          <button
            key={games}
            type="button"
            disabled={disabled}
            onClick={() => onPick(games)}
            className={cx(
              "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
              value === games
                ? "border-sky-300/55 bg-sky-400/14 text-sky-100"
                : "border-white/10 bg-white/[0.03] text-slate-300",
              !disabled && "hover:border-white/25 hover:bg-white/[0.07]",
              disabled && "opacity-45",
            )}
          >
            {games}
          </button>
        ))}
      </div>
      {value ? (
        <span
          className={cx(
            "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]",
            correctness === true && "bg-emerald-400/15 text-emerald-200",
            correctness === false && "bg-rose-400/15 text-rose-200",
            correctness === undefined && "bg-white/[0.06] text-slate-300",
          )}
        >
          {correctness === true
            ? "Exact"
            : correctness === false
              ? "Miss"
              : `In ${value}`}
        </span>
      ) : null}
    </div>
  );
}

function ConnectorsSvg() {
  const toneByConnector = {
    east: "#60a5fa",
    west: "#f59e0b",
    finals: "#e2e8f0",
  } as const;

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
      fill="none"
      aria-hidden="true"
    >
      {connectors.map((connector) => {
        const from = layoutById[connector.from];
        const to = layoutById[connector.to];
        const sourceX =
          connector.direction === "right" ? from.left + from.width : from.left;
        const targetX =
          connector.direction === "right" ? to.left : to.left + to.width;
        const sourceY = from.top + from.height / 2;
        const targetY = to.top + to.height / 2;
        const midX = (sourceX + targetX) / 2;
        const stroke = toneByConnector[connector.tone];
        const path = `M ${sourceX} ${sourceY} H ${midX} V ${targetY} H ${targetX}`;

        return (
          <path
            key={`${connector.from}-${connector.to}`}
            d={path}
            stroke={stroke}
            strokeOpacity="0.42"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}

export default function BracketBoard({
  entry,
  results,
  viewMode,
  isLocked,
  onPickWinner,
  onPickGames,
}: BracketBoardProps) {
  const source = viewMode === "my-bracket" ? "prediction" : "official";
  const champion = getFinalsChampion(source, entry, results);

  const renderPlayInCard = (matchupId: string) => {
    const layout = layoutById[matchupId];
    const game = playInById[matchupId];
    const homeTeamId = resolveSlotTeamId(game.homeSlot, source, entry, results);
    const awayTeamId = resolveSlotTeamId(game.awaySlot, source, entry, results);
    const homeTeam = getTeam(homeTeamId);
    const awayTeam = getTeam(awayTeamId);
    const selectedWinnerId = entry.picks[matchupId]?.winnerTeamId;
    const actualWinnerId = results.playIn[matchupId]?.winnerTeamId;
    const latestGame = results.playIn[matchupId]?.games.at(-1);

    const footerText =
      viewMode === "my-bracket"
        ? selectedWinnerId
          ? `${getTeam(selectedWinnerId)?.shortName ?? "Team"} claimed this play-in slot`
          : "Pick the winner of this single-elimination game"
        : formatPlayInStatus(matchupId, results);

    return (
      <article
        key={matchupId}
        className="absolute rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,33,0.96),rgba(2,6,23,0.98))] p-3 shadow-[0_20px_45px_rgba(2,6,23,0.32)]"
        style={{
          left: layout.left,
          top: layout.top,
          width: layout.width,
          minHeight: layout.height,
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Play-In
          </div>
          <div className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
            {game.seedOutcome ? `No. ${game.seedOutcome}` : "Elim"}
          </div>
        </div>

        <div className="mt-2 text-sm font-semibold text-white">{game.label}</div>
        <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
          Single-elimination
        </div>

        <div className="mt-3 space-y-2">
          <TeamRow
            team={homeTeam}
            fallbackLabel={getSlotLabel(game.homeSlot)}
            seedLabel={getSlotSeedLabel(game.homeSlot)}
            selected={viewMode === "my-bracket" && selectedWinnerId === homeTeam?.id}
            actualWinnerId={actualWinnerId}
            interactive={viewMode === "my-bracket" && !!homeTeam && !isLocked}
            onSelect={() => homeTeam && onPickWinner(matchupId, homeTeam.id)}
          />
          <TeamRow
            team={awayTeam}
            fallbackLabel={getSlotLabel(game.awaySlot)}
            seedLabel={getSlotSeedLabel(game.awaySlot)}
            selected={viewMode === "my-bracket" && selectedWinnerId === awayTeam?.id}
            actualWinnerId={actualWinnerId}
            interactive={viewMode === "my-bracket" && !!awayTeam && !isLocked}
            onSelect={() => awayTeam && onPickWinner(matchupId, awayTeam.id)}
          />
        </div>

        <div className="mt-3 border-t border-white/10 pt-3">
          <div className="text-xs text-slate-300">{footerText}</div>
          {latestGame ? (
            <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
              {timeFormatter.format(new Date(latestGame.playedAt))} final
            </div>
          ) : null}
        </div>
      </article>
    );
  };

  const renderSeriesCard = (seriesId: string) => {
    const layout = layoutById[seriesId];
    const series = seriesById[seriesId];
    const [homeTeamId, awayTeamId] = resolveSeriesParticipants(
      series,
      source,
      entry,
      results,
    );
    const [officialHomeId, officialAwayId] = resolveSeriesParticipants(
      series,
      "official",
      entry,
      results,
    );
    const homeTeam = getTeam(homeTeamId);
    const awayTeam = getTeam(awayTeamId);
    const officialHome = getTeam(officialHomeId);
    const officialAway = getTeam(officialAwayId);
    const selectedWinnerId = entry.picks[seriesId]?.winnerTeamId;
    const selectedGames = entry.picks[seriesId]?.games;
    const actualWinnerId = results.series[seriesId]?.winnerTeamId;

    const footerText =
      viewMode === "my-bracket"
        ? selectedWinnerId
          ? selectedGames
            ? `${getTeam(selectedWinnerId)?.shortName ?? "Team"} in ${selectedGames}`
            : "Choose the series length"
          : "Pick a team to advance"
        : formatSeriesStatus(seriesId, results, [officialHome, officialAway]);

    const headerLabel =
      seriesId === "nba-finals"
        ? "NBA Finals"
        : roundLabelByRound[series.round];
    const subtitle =
      seriesId === "nba-finals"
        ? "Best-of-seven championship"
        : series.conference === "East"
          ? "East side"
          : "West side";
    const lengthCorrectness =
      viewMode === "my-bracket"
        ? isSeriesLengthCorrect(seriesId, entry, results)
        : undefined;

    return (
      <article
        key={seriesId}
        className={cx(
          "absolute rounded-[24px] border p-4 shadow-[0_22px_50px_rgba(2,6,23,0.32)]",
          seriesId === "nba-finals"
            ? "border-white/15 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.16),transparent_35%),linear-gradient(180deg,rgba(16,24,39,0.98),rgba(2,6,23,0.98))]"
            : "border-white/10 bg-[linear-gradient(180deg,rgba(12,18,33,0.96),rgba(2,6,23,0.98))]",
        )}
        style={{
          left: layout.left,
          top: layout.top,
          width: layout.width,
          minHeight: layout.height,
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              {headerLabel}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
              {subtitle}
            </div>
          </div>
          <div className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
            Best of 7
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <TeamRow
            team={homeTeam}
            fallbackLabel={getSlotLabel(series.homeSlot)}
            seedLabel={getSlotSeedLabel(series.homeSlot)}
            selected={viewMode === "my-bracket" && selectedWinnerId === homeTeam?.id}
            actualWinnerId={actualWinnerId}
            wins={
              viewMode === "official-bracket" || actualWinnerId
                ? officialHome?.id === homeTeam?.id
                  ? getSeriesWins(results, seriesId, homeTeam?.id)
                  : undefined
                : undefined
            }
            interactive={viewMode === "my-bracket" && !!homeTeam && !isLocked}
            onSelect={() => homeTeam && onPickWinner(seriesId, homeTeam.id)}
          />
          <TeamRow
            team={awayTeam}
            fallbackLabel={getSlotLabel(series.awaySlot)}
            seedLabel={getSlotSeedLabel(series.awaySlot)}
            selected={viewMode === "my-bracket" && selectedWinnerId === awayTeam?.id}
            actualWinnerId={actualWinnerId}
            wins={
              viewMode === "official-bracket" || actualWinnerId
                ? officialAway?.id === awayTeam?.id
                  ? getSeriesWins(results, seriesId, awayTeam?.id)
                  : undefined
                : undefined
            }
            interactive={viewMode === "my-bracket" && !!awayTeam && !isLocked}
            onSelect={() => awayTeam && onPickWinner(seriesId, awayTeam.id)}
          />
        </div>

        {viewMode === "my-bracket" ? (
          <div className="mt-3 border-t border-white/10 pt-3">
            <LengthPicker
              value={selectedGames}
              disabled={!selectedWinnerId || isLocked}
              correctness={lengthCorrectness}
              onPick={(games) => onPickGames(seriesId, games)}
            />
          </div>
        ) : null}

        <div className="mt-3 border-t border-white/10 pt-3">
          <div className="text-xs text-slate-300">{footerText}</div>
        </div>
      </article>
    );
  };

  return (
    <section className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,6,23,0.98))] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">
            Bracket view
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {viewMode === "my-bracket" ? "Your playoff bracket" : "Official playoff bracket"}
          </h2>
          <p className="mt-1 text-sm text-slate-300/80">
            Click a team to advance it, then choose the series length. Play-in games are single-elimination, every playoff round is best-of-seven, and the bracket flows left and right into the Finals exactly like a tournament board.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
            East left
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
            Finals center
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
            West right
          </span>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto pb-3">
        <div
          className="relative"
          style={{
            width: CANVAS_WIDTH,
            minWidth: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
          }}
        >
          <div className="absolute inset-0 rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.015),transparent_16%),radial-gradient(circle_at_center,rgba(59,130,246,0.07),transparent_26%),linear-gradient(90deg,transparent_0,rgba(255,255,255,0.02)_50%,transparent_100%)]" />
          <div className="absolute inset-x-0 top-0 h-[120px] bg-[linear-gradient(180deg,rgba(2,6,23,0.65),transparent)]" />

          {stageHeaders.map((header) => (
            <div
              key={`${header.label}-${header.left}`}
              className="absolute text-center"
              style={{ left: header.left, top: 14, width: header.width }}
            >
              {header.conference ? (
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                  {header.conference}
                </div>
              ) : null}
              <div
                className={cx(
                  "text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-300",
                  header.featured && "text-amber-100",
                )}
              >
                {header.label}
              </div>
              <div className="mx-auto mt-2 h-px w-full bg-white/10" />
            </div>
          ))}

          <div className="absolute left-[1380px] top-[716px] w-[280px] rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              {viewMode === "my-bracket" ? "Projected champion" : "Champion tracker"}
            </div>
            <div className="mt-2 text-lg font-semibold text-white">
              {champion?.displayName ?? "Champion pending"}
            </div>
          </div>

          <ConnectorsSvg />

          {renderPlayInCard("east-playin-78")}
          {renderPlayInCard("east-playin-910")}
          {renderPlayInCard("east-playin-8")}

          {renderSeriesCard("east-r1-1")}
          {renderSeriesCard("east-r1-4")}
          {renderSeriesCard("east-r1-3")}
          {renderSeriesCard("east-r1-2")}
          {renderSeriesCard("east-sf-1")}
          {renderSeriesCard("east-sf-2")}
          {renderSeriesCard("east-cf")}
          {renderSeriesCard("nba-finals")}
          {renderSeriesCard("west-cf")}
          {renderSeriesCard("west-sf-1")}
          {renderSeriesCard("west-sf-2")}
          {renderSeriesCard("west-r1-1")}
          {renderSeriesCard("west-r1-4")}
          {renderSeriesCard("west-r1-3")}
          {renderSeriesCard("west-r1-2")}

          {renderPlayInCard("west-playin-8")}
          {renderPlayInCard("west-playin-78")}
          {renderPlayInCard("west-playin-910")}
        </div>
      </div>
    </section>
  );
}
