"use client";

import { useEffect, useRef, useState } from "react";
import BracketBoard from "@/components/BracketBoard";
import {
  DEFAULT_TIEBREAKER_QUESTION,
  DEFAULT_POOL_LOCK_AT,
  PLAYOFF_SEASON_LABEL,
  SCORING_RULES,
  TOTAL_PICKABLE_MATCHUPS,
  createSeededResultsState,
  playInGames,
  seriesById,
  seriesDefinitions,
} from "@/lib/nba-playoffs/data";
import {
  formatPlayInStatus,
  formatSeriesStatus,
  getCompletedPickCount,
  getSeriesLengthPickCount,
  getTeam,
  getWinnerPickPopularity,
  isPickCorrect,
  isSeriesLengthCorrect,
  rankEntries,
  resolveSeriesParticipants,
  sanitizeEntryPicks,
  scoreEntry,
} from "@/lib/nba-playoffs/engine";
import {
  createEntryRequest,
  createPoolRequest,
  fetchAppBootstrap,
  joinPoolRequest,
  syncResultsRequest,
  updateEntryRequest,
} from "@/lib/nba-playoffs/api";
import {
  buildEntryShareLink,
  buildPoolInviteLink,
  loadClientPreferences,
  saveClientPreferences,
} from "@/lib/nba-playoffs/storage";
import {
  AppBootstrapResponse,
  BracketEntry,
  ClientPreferences,
  Pool,
  SeriesLength,
} from "@/lib/nba-playoffs/types";

type JoinMethod = "link" | "code";
type PickStatusTone = "correct" | "incorrect" | "pending" | "none";

const pickStatusToneClasses: Record<PickStatusTone, string> = {
  correct: "border-emerald-300/20 bg-emerald-500/10 text-emerald-100",
  incorrect: "border-rose-300/20 bg-rose-500/10 text-rose-100",
  pending: "border-amber-300/20 bg-amber-500/10 text-amber-100",
  none: "border-white/10 bg-white/[0.04] text-slate-300",
};

const POLL_INTERVAL_MS = 15000;
const scoringRows = [
  {
    label: "Play-In",
    detail: "Single-elimination",
    winnerPoints: SCORING_RULES.playInWinner,
    exactLengthPoints: 0,
  },
  {
    label: "Round 1",
    detail: "Best-of-seven",
    winnerPoints: SCORING_RULES.seriesByRound["round-1"].winner,
    exactLengthPoints: SCORING_RULES.seriesByRound["round-1"].exactLength,
  },
  {
    label: "Conference Semifinals",
    detail: "Best-of-seven",
    winnerPoints: SCORING_RULES.seriesByRound.semifinals.winner,
    exactLengthPoints: SCORING_RULES.seriesByRound.semifinals.exactLength,
  },
  {
    label: "Conference Finals",
    detail: "Best-of-seven",
    winnerPoints: SCORING_RULES.seriesByRound["conference-finals"].winner,
    exactLengthPoints: SCORING_RULES.seriesByRound["conference-finals"].exactLength,
  },
  {
    label: "NBA Finals",
    detail: "Best-of-seven",
    winnerPoints: SCORING_RULES.seriesByRound.finals.winner,
    exactLengthPoints: SCORING_RULES.seriesByRound.finals.exactLength,
  },
] as const;
const MAX_BRACKET_POINTS =
  playInGames.length * SCORING_RULES.playInWinner +
  seriesDefinitions.reduce((total, series) => {
    const roundScoring = SCORING_RULES.seriesByRound[series.round];
    return total + roundScoring.winner + roundScoring.exactLength;
  }, 0);

const formatAbsolute = (value?: string) => {
  if (!value) {
    return "No lock set";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
};

const toLocalInputValue = (value?: string) => {
  const date = value ? new Date(value) : new Date(DEFAULT_POOL_LOCK_AT);
  const pad = (segment: number) => segment.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const normalizeInviteCode = (value?: string | null) =>
  value
    ?.toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

const parseOptionalWholeNumber = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return {
      value: undefined,
      valid: true,
    };
  }

  if (!/^\d+$/.test(trimmed)) {
    return {
      value: undefined,
      valid: false,
    };
  }

  return {
    value: Number(trimmed),
    valid: true,
  };
};

function TiebreakerHelperText({ text }: { text: string }) {
  return <p className="mt-2 text-xs text-slate-400">{text}</p>;
}

const getPickStatusMeta = (value: boolean | undefined, hasPick: boolean) => {
  if (!hasPick) {
    return {
      label: "No pick",
      tone: "none" as const,
    };
  }

  if (value === true) {
    return {
      label: "Correct",
      tone: "correct" as const,
    };
  }

  if (value === false) {
    return {
      label: "Incorrect",
      tone: "incorrect" as const,
    };
  }

  return {
    label: "Pending",
    tone: "pending" as const,
  };
};

const createPreviewEntry = (displayName?: string): BracketEntry => ({
  id: "preview-entry",
  displayName: displayName?.trim() || "Bracket preview",
  name: "Join a pool to start picking",
  picks: {},
});

const updatePoolsWithEntry = (
  pools: Pool[],
  entryId: string,
  updater: (entry: BracketEntry) => BracketEntry,
) =>
  pools.map((pool) =>
    pool.entries.some((entry) => entry.id === entryId)
      ? {
          ...pool,
          entries: pool.entries.map((entry) =>
            entry.id === entryId ? updater(entry) : entry,
          ),
        }
      : pool,
  );

const resolveSelection = (
  payload: AppBootstrapResponse,
  preferences: ClientPreferences,
  inviteCode?: string,
  sharedEntryId?: string,
  overrides?: {
    poolId?: string;
    entryId?: string;
  },
) => {
  const explicitEntryId = overrides?.entryId ?? sharedEntryId ?? preferences.currentEntryId;
  const poolFromOverride = overrides?.poolId
    ? payload.pools.find((pool) => pool.id === overrides.poolId)
    : undefined;
  const poolFromExplicitEntry = explicitEntryId
    ? payload.pools.find((pool) =>
        pool.entries.some((entry) => entry.id === explicitEntryId),
      )
    : undefined;
  const poolFromInvite = inviteCode
    ? payload.pools.find((pool) => pool.inviteCode === inviteCode)
    : undefined;
  const preferredPool = payload.pools.find(
    (pool) => pool.id === preferences.currentPoolId,
  );
  const currentPool =
    poolFromOverride ??
    poolFromExplicitEntry ??
    poolFromInvite ??
    preferredPool ??
    payload.pools[0];
  const currentEntry =
    currentPool?.entries.find((entry) => entry.id === explicitEntryId) ??
    currentPool?.entries.find((entry) => entry.canEdit) ??
    currentPool?.entries[0];

  return {
    poolId: currentPool?.id,
    entryId: currentEntry?.id,
  };
};

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export default function BracketApp() {
  const [preferences, setPreferences] = useState<ClientPreferences | null>(null);
  const [bootstrap, setBootstrap] = useState<AppBootstrapResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreatingPool, setIsCreatingPool] = useState(false);
  const [isJoiningPool, setIsJoiningPool] = useState(false);
  const [isCreatingEntry, setIsCreatingEntry] = useState(false);
  const [pendingEntryWrites, setPendingEntryWrites] = useState(0);
  const [hasParsedUrl, setHasParsedUrl] = useState(false);
  const [inviteCodeFromUrl, setInviteCodeFromUrl] = useState<string | undefined>();
  const [sharedEntryIdFromUrl, setSharedEntryIdFromUrl] = useState<string | undefined>();

  const [createPoolName, setCreatePoolName] = useState("Playoff Pool");
  const [createPoolDescription, setCreatePoolDescription] = useState("");
  const [createPoolDisplayName, setCreatePoolDisplayName] = useState("");
  const [createPoolEntryName, setCreatePoolEntryName] = useState("My Entry");
  const [createPoolLockAt, setCreatePoolLockAt] = useState(
    toLocalInputValue(DEFAULT_POOL_LOCK_AT),
  );
  const [createPoolInviteCode, setCreatePoolInviteCode] = useState("");
  const [createPoolTiebreaker, setCreatePoolTiebreaker] = useState("");

  const [joinInviteCode, setJoinInviteCode] = useState("");
  const [joinDisplayName, setJoinDisplayName] = useState("");
  const [joinEntryName, setJoinEntryName] = useState("My Entry");
  const [joinTiebreaker, setJoinTiebreaker] = useState("");

  const [newEntryName, setNewEntryName] = useState("Second Entry");
  const [newEntryTiebreaker, setNewEntryTiebreaker] = useState("");
  const [entryNameDraft, setEntryNameDraft] = useState("");
  const [entryTiebreakerDraft, setEntryTiebreakerDraft] = useState("");

  const preferencesRef = useRef<ClientPreferences | null>(null);
  const entryWriteQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const refreshBootstrapRef = useRef<
    (options?: {
      preferredPoolId?: string;
      preferredEntryId?: string;
      silent?: boolean;
      inviteCode?: string;
    }) => Promise<void>
  >(async () => undefined);
  const enqueueEntrySaveRef = useRef<
    (
      entryId: string,
      input: {
        name?: string;
        tiebreakerGuess?: number | null;
        picks?: BracketEntry["picks"];
        submit?: boolean;
      },
      options?: {
        refresh?: boolean;
        successMessage?: string;
      },
    ) => Promise<void>
  >(async () => undefined);

  useEffect(() => {
    const loadedPreferences = loadClientPreferences();
    preferencesRef.current = loadedPreferences;
    setPreferences(loadedPreferences);

    const params = new URLSearchParams(window.location.search);
    const queryInviteCode = normalizeInviteCode(params.get("pool"));
    const queryEntryId = params.get("entry") ?? undefined;

    setInviteCodeFromUrl(queryInviteCode);
    setSharedEntryIdFromUrl(queryEntryId);
    setJoinInviteCode(queryInviteCode ?? "");
    setHasParsedUrl(true);
  }, []);

  useEffect(() => {
    preferencesRef.current = preferences;

    if (preferences) {
      saveClientPreferences(preferences);
    }
  }, [preferences]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setStatusMessage(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [statusMessage]);

  useEffect(() => {
    const resolvedDisplayName =
      bootstrap?.participant.displayName ?? preferences?.displayName ?? "";

    if (!resolvedDisplayName) {
      return;
    }

    setCreatePoolDisplayName((current) => current || resolvedDisplayName);
    setJoinDisplayName((current) => current || resolvedDisplayName);
  }, [bootstrap?.participant.displayName, preferences?.displayName]);

  refreshBootstrapRef.current = async (options) => {
    const currentPreferences = preferencesRef.current;

    if (!currentPreferences) {
      return;
    }

    if (!options?.silent) {
      setIsLoading(true);
    }

    try {
      const payload = await fetchAppBootstrap({
        clientId: currentPreferences.clientId,
        inviteCode: options?.inviteCode ?? inviteCodeFromUrl,
        entryId: sharedEntryIdFromUrl,
      });
      const selection = resolveSelection(
        payload,
        currentPreferences,
        options?.inviteCode ?? inviteCodeFromUrl,
        sharedEntryIdFromUrl,
        {
          poolId: options?.preferredPoolId,
          entryId: options?.preferredEntryId,
        },
      );
      const nextPreferences: ClientPreferences = {
        ...currentPreferences,
        currentPoolId: selection.poolId,
        currentEntryId: selection.entryId,
        displayName:
          payload.participant.displayName ?? currentPreferences.displayName,
      };

      preferencesRef.current = nextPreferences;
      setBootstrap(payload);
      setErrorMessage(null);
      setPreferences(nextPreferences);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load pools right now.",
      );
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  };

  enqueueEntrySaveRef.current = async (entryId, input, options) => {
    const currentPreferences = preferencesRef.current;

    if (!currentPreferences) {
      return;
    }

    setPendingEntryWrites((count) => count + 1);

    entryWriteQueueRef.current = entryWriteQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        try {
          await updateEntryRequest({
            clientId: currentPreferences.clientId,
            entryId,
            name: input.name,
            tiebreakerGuess: input.tiebreakerGuess,
            picks: input.picks,
            submit: input.submit,
          });

          if (options?.refresh) {
            await refreshBootstrapRef.current({
              preferredEntryId: entryId,
              silent: true,
            });
          }

          if (options?.successMessage) {
            setStatusMessage(options.successMessage);
          }
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "The bracket could not be saved.",
          );
          await refreshBootstrapRef.current({ silent: true });
        } finally {
          setPendingEntryWrites((count) => Math.max(0, count - 1));
        }
      });

    await entryWriteQueueRef.current;
  };

  useEffect(() => {
    if (!preferences?.clientId || !hasParsedUrl) {
      return;
    }

    void refreshBootstrapRef.current();
  }, [hasParsedUrl, inviteCodeFromUrl, preferences?.clientId]);

  useEffect(() => {
    if (!preferences?.clientId || !hasParsedUrl) {
      return;
    }

    const interval = window.setInterval(() => {
      void refreshBootstrapRef.current({ silent: true });
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [hasParsedUrl, preferences?.clientId]);

  const displayPool =
    bootstrap?.pools.find((pool) => pool.id === preferences?.currentPoolId) ??
    bootstrap?.pools[0] ??
    bootstrap?.invitePool ??
    null;
  const activePool =
    bootstrap?.pools.find((pool) => pool.id === preferences?.currentPoolId) ??
    bootstrap?.pools[0] ??
    null;
  const selectedEntry =
    (activePool
      ? activePool.entries.find((entry) => entry.id === preferences?.currentEntryId) ??
        activePool.entries.find((entry) => entry.canEdit) ??
        activePool.entries[0]
      : displayPool?.entries.find((entry) => entry.id === sharedEntryIdFromUrl) ??
        displayPool?.entries[0]) ?? null;
  const results = bootstrap?.results ?? createSeededResultsState();
  const previewEntry = createPreviewEntry(
    bootstrap?.participant.displayName ?? preferences?.displayName,
  );
  const bracketEntry = selectedEntry ?? previewEntry;
  const poolLocked = displayPool?.lockAt
    ? Date.now() >= new Date(displayPool.lockAt).getTime()
    : false;
  const interactionLocked =
    !activePool || !selectedEntry?.canEdit || poolLocked;
  const winnerPickCount = getCompletedPickCount(bracketEntry);
  const seriesLengthPickCount = getSeriesLengthPickCount(bracketEntry);
  const activeScore = scoreEntry(bracketEntry, results);
  const poolEntries = displayPool?.entries ?? [];
  const submittedEntries = poolEntries.filter((entry) => entry.submittedAt);
  const rankedEntries = rankEntries(submittedEntries, results);
  const invitePool = bootstrap?.invitePool ?? null;
  const inviteLocked = invitePool?.lockAt
    ? Date.now() >= new Date(invitePool.lockAt).getTime()
    : false;
  const tiebreakerHelperText = DEFAULT_TIEBREAKER_QUESTION;
  const lockStatusTitle = displayPool
    ? poolLocked
      ? "Picks are locked"
      : "Picks are open"
    : "Create or join a pool";
  const lockStatusBody = displayPool
    ? poolLocked
      ? `This pool locked at ${formatAbsolute(displayPool.lockAt)}. Picks and entry creation are closed, and scoring now updates automatically as results change.`
      : `All picks lock at ${formatAbsolute(displayPool.lockAt)}, before the first play-in game begins. Entries can be edited and new brackets can be created until then.`
    : "Create a pool or join by invite link to unlock submissions, standings, and live scoring.";
  const leader = rankedEntries[0];
  const championPickPopularity = getWinnerPickPopularity(submittedEntries, "nba-finals");
  const championPickLeaders = Object.entries(championPickPopularity)
    .map(([teamId, percent]) => ({
      teamId,
      percent,
      team: getTeam(teamId),
    }))
    .sort((left, right) => right.percent - left.percent);
  const mostPickedChampion = championPickLeaders[0];
  const matchupPopularityCards = [...playInGames, ...seriesDefinitions].map((matchup) => {
    const popularity = getWinnerPickPopularity(submittedEntries, matchup.id);
    const picks = Object.entries(popularity)
      .map(([teamId, percent]) => ({
        teamId,
        percent,
        team: getTeam(teamId),
      }))
      .sort((left, right) => right.percent - left.percent);

    return {
      id: matchup.id,
      label: matchup.label,
      note: matchup.note,
      picks,
      roundLabel:
        "seedOutcome" in matchup
          ? "Play-In"
          : matchup.id === "nba-finals"
            ? "Champion pick"
            : matchup.round === "round-1"
              ? "Round 1"
              : matchup.round === "semifinals"
                ? "Conference semifinals"
                : matchup.round === "conference-finals"
                  ? "Conference finals"
                  : "NBA Finals",
    };
  });
  const entryPickStatusRows = selectedEntry
    ? [
        ...playInGames.map((game) => {
          const pick = selectedEntry.picks[game.id];
          const winnerTeam = getTeam(pick?.winnerTeamId);
          const winnerStatus = isPickCorrect(game.id, selectedEntry, results);
          const winnerMeta = getPickStatusMeta(
            winnerStatus,
            Boolean(pick?.winnerTeamId),
          );

          return {
            id: game.id,
            stage: "Play-In",
            label: game.label,
            pickText: winnerTeam?.displayName ?? "No pick yet",
            detail: formatPlayInStatus(game.id, results),
            winnerStatusLabel: winnerMeta.label,
            winnerTone: winnerMeta.tone,
            lengthStatusLabel: "Single-elimination",
            lengthTone: "none" as const,
          };
        }),
        ...seriesDefinitions.map((series) => {
          const pick = selectedEntry.picks[series.id];
          const winnerTeam = getTeam(pick?.winnerTeamId);
          const winnerStatus = isPickCorrect(series.id, selectedEntry, results);
          const lengthStatus = isSeriesLengthCorrect(series.id, selectedEntry, results);
          const winnerMeta = getPickStatusMeta(
            winnerStatus,
            Boolean(pick?.winnerTeamId),
          );
          const lengthMeta = getPickStatusMeta(
            lengthStatus,
            Boolean(pick?.games),
          );

          return {
            id: series.id,
            stage:
              series.id === "nba-finals"
                ? "NBA Finals"
                : series.round === "round-1"
                  ? "Round 1"
                  : series.round === "semifinals"
                    ? "Conference semifinals"
                    : "Conference finals",
            label: series.label,
            pickText: winnerTeam
              ? pick?.games
                ? `${winnerTeam.displayName} in ${pick.games}`
                : winnerTeam.displayName
              : "No pick yet",
            detail: formatSeriesStatus(
              series.id,
              results,
              resolveSeriesParticipants(series, "official", undefined, results).map(
                (teamId) => getTeam(teamId),
              ) as [ReturnType<typeof getTeam>, ReturnType<typeof getTeam>],
            ),
            winnerStatusLabel: winnerMeta.label,
            winnerTone: winnerMeta.tone,
            lengthStatusLabel: pick?.games ? lengthMeta.label : "No length pick",
            lengthTone: pick?.games ? lengthMeta.tone : ("none" as const),
          };
        }),
      ]
    : [];

  useEffect(() => {
    if (!selectedEntry) {
      setEntryNameDraft("");
      setEntryTiebreakerDraft("");
      return;
    }

    setEntryNameDraft(selectedEntry.name);
    setEntryTiebreakerDraft(
      selectedEntry.tiebreakerGuess?.toString() ?? "",
    );
  }, [selectedEntry, selectedEntry?.id, selectedEntry?.name, selectedEntry?.tiebreakerGuess]);

  if (!hasParsedUrl || !preferences || (isLoading && !bootstrap)) {
    return (
      <div className="rounded-[32px] border border-white/10 bg-slate-950/70 p-8 text-slate-200">
        Loading the playoff board…
      </div>
    );
  }

  const commitPreferences = (next: ClientPreferences) => {
    preferencesRef.current = next;
    setPreferences(next);
  };

  const updateSelection = (patch: Partial<ClientPreferences>) => {
    if (!preferencesRef.current) {
      return;
    }

    commitPreferences({
      ...preferencesRef.current,
      ...patch,
    });
  };

  const mutateLocalEntry = (
    entryId: string,
    updater: (entry: BracketEntry) => BracketEntry,
  ) => {
    setBootstrap((previous) =>
      previous
        ? {
            ...previous,
            pools: updatePoolsWithEntry(previous.pools, entryId, updater),
          }
        : previous,
    );
  };

  const handlePickWinner = (matchupId: string, teamId: string) => {
    if (!selectedEntry || interactionLocked) {
      return;
    }

    const nextEntry = sanitizeEntryPicks(
      {
        ...selectedEntry,
        picks: {
          ...selectedEntry.picks,
          [matchupId]: {
            ...selectedEntry.picks[matchupId],
            winnerTeamId: teamId,
            games:
              seriesById[matchupId] && !selectedEntry.picks[matchupId]?.games
                ? 6
                : selectedEntry.picks[matchupId]?.games,
          },
        },
      },
      results,
    );

    mutateLocalEntry(selectedEntry.id, () => nextEntry);
    void enqueueEntrySaveRef.current(
      selectedEntry.id,
      {
        picks: nextEntry.picks,
      },
      {
        refresh: false,
      },
    );
  };

  const handlePickGames = (seriesId: string, games: SeriesLength) => {
    if (!selectedEntry || interactionLocked) {
      return;
    }

    const nextEntry = sanitizeEntryPicks(
      {
        ...selectedEntry,
        picks: {
          ...selectedEntry.picks,
          [seriesId]: {
            ...selectedEntry.picks[seriesId],
            games,
          },
        },
      },
      results,
    );

    mutateLocalEntry(selectedEntry.id, () => nextEntry);
    void enqueueEntrySaveRef.current(
      selectedEntry.id,
      {
        picks: nextEntry.picks,
      },
      {
        refresh: false,
      },
    );
  };

  const handleSaveEntryDetails = () => {
    if (!selectedEntry || interactionLocked) {
      return;
    }

    const trimmedName = entryNameDraft.trim();
    const parsedTiebreaker = parseOptionalWholeNumber(entryTiebreakerDraft);

    if (!trimmedName) {
      setErrorMessage("Add an entry name before saving.");
      return;
    }

    if (!parsedTiebreaker.valid) {
      setErrorMessage("Enter a valid Finals tiebreaker guess.");
      return;
    }

    const nextEntry: BracketEntry = {
      ...selectedEntry,
      name: trimmedName,
      tiebreakerGuess: parsedTiebreaker.value,
    };

    mutateLocalEntry(selectedEntry.id, () => nextEntry);
    setErrorMessage(null);
    void enqueueEntrySaveRef.current(
      selectedEntry.id,
      {
        name: trimmedName,
        tiebreakerGuess: parsedTiebreaker.value ?? null,
      },
      {
        refresh: true,
        successMessage: `${trimmedName} was saved.`,
      },
    );
  };

  const handleSubmitEntry = () => {
    if (!selectedEntry || !activePool || interactionLocked) {
      return;
    }

    const trimmedName = entryNameDraft.trim();
    const parsedTiebreaker = parseOptionalWholeNumber(entryTiebreakerDraft);

    if (!trimmedName) {
      setErrorMessage("Add an entry name before submitting.");
      return;
    }

    if (!parsedTiebreaker.valid) {
      setErrorMessage("Enter a valid Finals tiebreaker guess.");
      return;
    }

    const nextEntry: BracketEntry = {
      ...selectedEntry,
      name: trimmedName,
      tiebreakerGuess: parsedTiebreaker.value,
      submittedAt: new Date().toISOString(),
    };

    mutateLocalEntry(selectedEntry.id, () => nextEntry);
    setErrorMessage(null);
    void enqueueEntrySaveRef.current(
      selectedEntry.id,
      {
        name: trimmedName,
        tiebreakerGuess: parsedTiebreaker.value ?? null,
        picks: nextEntry.picks,
        submit: true,
      },
      {
        refresh: true,
        successMessage: `${trimmedName} has been submitted to ${activePool.name}.`,
      },
    );
  };

  const handleCreatePool = async () => {
    const trimmedPoolName = createPoolName.trim();
    const trimmedDisplayName = createPoolDisplayName.trim();
    const trimmedEntryName = createPoolEntryName.trim();
    const parsedTiebreaker = parseOptionalWholeNumber(createPoolTiebreaker);

    if (!trimmedPoolName || !trimmedDisplayName || !trimmedEntryName) {
      setErrorMessage(
        "Add a pool name, your display name, and your first entry name.",
      );
      return;
    }

    if (!parsedTiebreaker.valid) {
      setErrorMessage("Enter a valid Finals tiebreaker guess.");
      return;
    }

    const lockAt = new Date(createPoolLockAt);

    if (Number.isNaN(lockAt.getTime())) {
      setErrorMessage("Choose a valid lock time.");
      return;
    }

    setIsCreatingPool(true);

    try {
      const created = await createPoolRequest({
        clientId: preferences.clientId,
        displayName: trimmedDisplayName,
        poolName: trimmedPoolName,
        description: createPoolDescription.trim() || undefined,
        lockAt: lockAt.toISOString(),
        inviteCode: normalizeInviteCode(createPoolInviteCode) || undefined,
        initialEntryName: trimmedEntryName,
        finalsTiebreaker: parsedTiebreaker.value,
      });

      commitPreferences({
        ...preferences,
        displayName: trimmedDisplayName,
      });
      setErrorMessage(null);
      await refreshBootstrapRef.current({
        preferredPoolId: created.poolId,
        preferredEntryId: created.entryId,
        silent: true,
      });
      setStatusMessage(`${trimmedPoolName} is live and ready to share.`);
      setJoinDisplayName(trimmedDisplayName);
      setCreatePoolInviteCode("");
      setCreatePoolDescription("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "The pool could not be created.",
      );
    } finally {
      setIsCreatingPool(false);
    }
  };

  const handleJoinPool = async (options?: {
    inviteCode?: string;
    joinMethod?: JoinMethod;
  }) => {
    const joinMethod = options?.joinMethod ?? "code";
    const inviteCode = normalizeInviteCode(options?.inviteCode ?? joinInviteCode);
    const trimmedDisplayName = joinDisplayName.trim();
    const trimmedEntryName = joinEntryName.trim();
    const parsedTiebreaker = parseOptionalWholeNumber(joinTiebreaker);

    if (!trimmedDisplayName) {
      setErrorMessage("Add your display name before joining the pool.");
      return;
    }

    if (!inviteCode) {
      setErrorMessage(
        joinMethod === "link"
          ? "This invite link is missing its private join token."
          : "Add a manual join code and display name to join the pool.",
      );
      return;
    }

    if (!parsedTiebreaker.valid) {
      setErrorMessage("Enter a valid Finals tiebreaker guess.");
      return;
    }

    setIsJoiningPool(true);

    try {
      const joined = await joinPoolRequest({
        clientId: preferences.clientId,
        displayName: trimmedDisplayName,
        inviteCode,
        joinMethod,
        initialEntryName: trimmedEntryName || undefined,
        finalsTiebreaker: parsedTiebreaker.value,
      });

      commitPreferences({
        ...preferences,
        displayName: trimmedDisplayName,
      });
      setErrorMessage(null);
      await refreshBootstrapRef.current({
        preferredPoolId: joined.poolId,
        preferredEntryId: joined.entryId,
        silent: true,
      });
      setStatusMessage(
        joined.entryId
          ? joinMethod === "link"
            ? "You joined from the private invite link and your bracket entry is ready."
            : "You joined the pool and your bracket entry is ready."
          : joined.locked
            ? "You joined the pool. Picks are locked, so standings are view-only now."
            : "You joined the pool.",
      );
      setCreatePoolDisplayName(trimmedDisplayName);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "The pool could not be joined.",
      );
    } finally {
      setIsJoiningPool(false);
    }
  };

  const handleCreateEntry = async () => {
    if (!activePool) {
      return;
    }

    const trimmedEntryName = newEntryName.trim();
    const parsedTiebreaker = parseOptionalWholeNumber(newEntryTiebreaker);

    if (!trimmedEntryName) {
      setErrorMessage("Add an entry name before creating another bracket.");
      return;
    }

    if (!parsedTiebreaker.valid) {
      setErrorMessage("Enter a valid Finals tiebreaker guess.");
      return;
    }

    setIsCreatingEntry(true);

    try {
      const created = await createEntryRequest({
        clientId: preferences.clientId,
        poolId: activePool.id,
        entryName: trimmedEntryName,
        finalsTiebreaker: parsedTiebreaker.value,
      });

      setErrorMessage(null);
      await refreshBootstrapRef.current({
        preferredPoolId: created.poolId,
        preferredEntryId: created.entryId,
        silent: true,
      });
      setStatusMessage(`${trimmedEntryName} was added to ${activePool.name}.`);
      setNewEntryName("Second Entry");
      setNewEntryTiebreaker("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "The entry could not be created.",
      );
    } finally {
      setIsCreatingEntry(false);
    }
  };

  const handleSyncResults = async () => {
    setIsSyncing(true);

    try {
      const syncedResults = await syncResultsRequest();
      setErrorMessage(null);
      setBootstrap((previous) =>
        previous
          ? {
              ...previous,
              results: syncedResults,
            }
          : previous,
      );
      await refreshBootstrapRef.current({ silent: true });
      setStatusMessage(syncedResults.liveSyncNote ?? "Official results synced.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The live NBA feed could not be reached right now.",
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!activePool) {
      return;
    }

    try {
      await copyText(buildPoolInviteLink(window.location.origin, activePool.inviteCode));
      setStatusMessage(`Invite link copied for ${activePool.name}.`);
    } catch {
      setErrorMessage("The invite link could not be copied.");
    }
  };

  const handleCopyBracketLink = async () => {
    if (!activePool || !selectedEntry?.submittedAt) {
      setErrorMessage("Submit the entry before sharing its direct bracket link.");
      return;
    }

    try {
      await copyText(
        buildEntryShareLink(
          window.location.origin,
          activePool.inviteCode,
          selectedEntry.id,
        ),
      );
      setStatusMessage(`Direct bracket link copied for ${selectedEntry.name}.`);
    } catch {
      setErrorMessage("The bracket link could not be copied.");
    }
  };

  const resultsFeed = [
    ...playInGames.map((game) => ({
      id: game.id,
      label: game.label,
      detail: formatPlayInStatus(game.id, results),
      hasActivity:
        Boolean(results.playIn[game.id]?.winnerTeamId) ||
        Boolean(results.playIn[game.id]?.games.length),
    })),
    ...seriesDefinitions.map((series) => {
      const [homeTeamId, awayTeamId] = resolveSeriesParticipants(
        series,
        "official",
        undefined,
        results,
      );

      return {
        id: series.id,
        label: series.label,
        detail: formatSeriesStatus(series.id, results, [
          getTeam(homeTeamId),
          getTeam(awayTeamId),
        ]),
        hasActivity:
          Boolean(results.series[series.id]?.winnerTeamId) ||
          Boolean(results.series[series.id]?.games.length),
      };
    }),
  ];
  const visibleResults = resultsFeed.some((item) => item.hasActivity)
    ? resultsFeed.filter((item) => item.hasActivity).slice(0, 6)
    : resultsFeed.slice(0, 6);

  return (
    <div className="space-y-5">
      <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.14),transparent_26%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.36em] text-slate-400">
              Real pools, real standings
            </div>
            <h1 className="mt-3 font-display text-5xl uppercase leading-none text-white sm:text-6xl">
              Run the {PLAYOFF_SEASON_LABEL}
            </h1>
            <p className="mt-3 max-w-2xl text-base text-slate-200/82">
              Create a pool, invite friends with a real link or code, submit live bracket entries, and watch the leaderboard update as results land.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                updateSelection({
                  currentView: "my-bracket",
                })
              }
              className={cx(
                "rounded-full border px-4 py-2 text-sm font-semibold transition",
                preferences.currentView === "my-bracket"
                  ? "border-sky-300/55 bg-sky-400/14 text-sky-100"
                  : "border-white/12 bg-white/6 text-slate-100 hover:border-white/22 hover:bg-white/10",
              )}
            >
              Entry View
            </button>
            <button
              type="button"
              onClick={() =>
                updateSelection({
                  currentView: "official-bracket",
                })
              }
              className={cx(
                "rounded-full border px-4 py-2 text-sm font-semibold transition",
                preferences.currentView === "official-bracket"
                  ? "border-sky-300/55 bg-sky-400/14 text-sky-100"
                  : "border-white/12 bg-white/6 text-slate-100 hover:border-white/22 hover:bg-white/10",
              )}
            >
              Official Bracket
            </button>
            <button
              type="button"
              onClick={handleSubmitEntry}
              disabled={interactionLocked || pendingEntryWrites > 0 || !selectedEntry}
              className="rounded-full border border-sky-300/25 bg-sky-500/12 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:border-sky-300/45 hover:bg-sky-500/18 disabled:opacity-50"
            >
              {selectedEntry?.submittedAt ? "Update submission" : "Submit entry"}
            </button>
            <button
              type="button"
              onClick={handleSyncResults}
              disabled={isSyncing}
              className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/22 hover:bg-white/10 disabled:opacity-50"
            >
              {isSyncing ? "Syncing official feed…" : "Sync official feed"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-[22px] border border-white/10 bg-white/[0.05] px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
              Pool
            </div>
            <div className="mt-2 text-base font-semibold text-white">
              {displayPool?.name ?? "No pool joined yet"}
            </div>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/[0.05] px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
              Entry
            </div>
            <div className="mt-2 text-base font-semibold text-white">
              {selectedEntry?.name ?? "No entry selected"}
            </div>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/[0.05] px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
              Lock
            </div>
            <div className="mt-2 text-sm font-semibold text-white">
              {formatAbsolute(displayPool?.lockAt)}
            </div>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/[0.05] px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
              Members
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {displayPool?.participantCount ?? 0}
            </div>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/[0.05] px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
              Winner picks
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {winnerPickCount}/{TOTAL_PICKABLE_MATCHUPS}
            </div>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/[0.05] px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
              Live points
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {activeScore.totalPoints}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Max possible {activeScore.maxPossiblePoints}
            </div>
          </div>
        </div>

        <div
          className={cx(
            "mt-4 rounded-2xl border px-4 py-3 text-sm",
            displayPool
              ? poolLocked
                ? "border-rose-300/20 bg-rose-500/10 text-rose-100"
                : "border-emerald-300/20 bg-emerald-500/10 text-emerald-100"
              : "border-white/10 bg-white/[0.04] text-slate-200",
          )}
        >
          <div className="font-semibold">{lockStatusTitle}</div>
          <div className="mt-1">{lockStatusBody}</div>
        </div>

        {pendingEntryWrites > 0 ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
            Saving bracket changes…
          </div>
        ) : null}

        {statusMessage ? (
          <div className="mt-4 rounded-2xl border border-sky-300/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
            {statusMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {errorMessage}
          </div>
        ) : null}
      </section>

      {invitePool ? (
        <section className="rounded-[28px] border border-amber-300/20 bg-[linear-gradient(180deg,rgba(36,24,6,0.88),rgba(15,23,42,0.96))] p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-2xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-200/70">
                Invite link detected
              </div>
              <h2 className="mt-2 text-3xl font-semibold text-white">
                Join {invitePool.name}
              </h2>
              {invitePool.description ? (
                <p className="mt-2 text-sm text-slate-200/82">
                  {invitePool.description}
                </p>
              ) : null}
              <p className="mt-3 text-sm text-slate-300/78">
                This private invite link is enough to join. A manual join code is only needed if someone is joining from the separate Join Pool screen.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                    Join method
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    Private invite link
                  </div>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                    Lock time
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    {formatAbsolute(invitePool.lockAt)}
                  </div>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                    Current members
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {invitePool.participantCount ?? 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full max-w-xl rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Join pool
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-200">
                  Display name
                  <input
                    value={joinDisplayName}
                    onChange={(event) => setJoinDisplayName(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none"
                    placeholder="Your name"
                  />
                </label>
                <label className="text-sm font-medium text-slate-200">
                  Entry name
                  <input
                    value={joinEntryName}
                    onChange={(event) => setJoinEntryName(event.target.value)}
                    disabled={inviteLocked}
                    className="mt-2 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none disabled:opacity-50"
                    placeholder={inviteLocked ? "Pool is locked" : "Bracket name"}
                  />
                </label>
                <label className="text-sm font-medium text-slate-200">
                  Finals tiebreaker
                  <input
                    value={joinTiebreaker}
                    onChange={(event) => setJoinTiebreaker(event.target.value)}
                    disabled={inviteLocked}
                    className="mt-2 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none disabled:opacity-50"
                    placeholder="Combined points in Finals clincher"
                    inputMode="numeric"
                  />
                  <TiebreakerHelperText text={tiebreakerHelperText} />
                </label>
                <label className="text-sm font-medium text-slate-200">
                  Status
                  <div className="mt-2 rounded-2xl border border-white/12 bg-slate-950/70 px-3 py-[14px] text-sm text-slate-200">
                    {inviteLocked
                      ? "Picks are locked. You can still join to follow the standings."
                      : "You already have the private invite link, so no manual join code is required here."}
                  </div>
                </label>
              </div>
              <button
                type="button"
                onClick={() =>
                  void handleJoinPool({
                    inviteCode: invitePool.inviteCode,
                    joinMethod: "link",
                  })
                }
                disabled={isJoiningPool}
                className="mt-4 rounded-full border border-amber-300/30 bg-amber-400/12 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-300/50 hover:bg-amber-400/18 disabled:opacity-50"
              >
                {isJoiningPool ? "Joining pool…" : "Join from invite link"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <BracketBoard
        entry={bracketEntry}
        results={results}
        viewMode={preferences.currentView}
        isLocked={interactionLocked}
        onPickWinner={handlePickWinner}
        onPickGames={handlePickGames}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(2,6,23,0.92))] p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">
            Pool center
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {activePool?.name ?? "Create or join a pool"}
          </h2>
          <p className="mt-2 text-sm text-slate-300/80">
            {activePool
              ? activePool.description || "Share the invite link, manage your entries, and submit picks before the lock."
              : "Real pools persist after refresh and work across multiple browser sessions."}
          </p>

          {activePool ? (
            <div className="mt-4 space-y-4">
              <label className="text-sm font-medium text-slate-200">
                Active pool
                <select
                  value={activePool.id}
                  onChange={(event) => {
                    const nextPool =
                      bootstrap?.pools.find((pool) => pool.id === event.target.value) ??
                      bootstrap?.pools[0];

                    if (!nextPool) {
                      return;
                    }

                    updateSelection({
                      currentPoolId: nextPool.id,
                      currentEntryId:
                        nextPool.entries.find((entry) => entry.canEdit)?.id ??
                        nextPool.entries[0]?.id,
                    });
                  }}
                  className="mt-2 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none"
                >
                  {bootstrap?.pools.map((pool) => (
                    <option key={pool.id} value={pool.id}>
                      {pool.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleCopyInviteLink}
                  className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/22 hover:bg-white/10"
                >
                  Copy private invite link
                </button>
                <button
                  type="button"
                  onClick={() => void copyText(activePool.inviteCode)}
                  className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/22 hover:bg-white/10"
                >
                  Copy manual join code
                </button>
                <button
                  type="button"
                  onClick={handleCopyBracketLink}
                  className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/22 hover:bg-white/10"
                >
                  Copy bracket link
                </button>
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300">
                  Manual join code{" "}
                  <span className="font-semibold text-white">{activePool.inviteCode}</span>
                </div>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                Anyone with the private invite link can join directly. The manual join code is a fallback for people using the Join Pool screen.
              </div>

              <label className="text-sm font-medium text-slate-200">
                Selected entry
                <select
                  value={selectedEntry?.id ?? ""}
                  onChange={(event) =>
                    updateSelection({
                      currentEntryId: event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none"
                >
                  {activePool.entries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.displayName} - {entry.name}
                      {entry.canEdit ? " (you)" : ""}
                    </option>
                  ))}
                </select>
              </label>

              {selectedEntry ? (
                <div className="space-y-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {selectedEntry.displayName}
                      </div>
                      <div className="text-xs text-slate-400">
                        {selectedEntry.canEdit
                          ? selectedEntry.submittedAt
                            ? "Submitted and editable until the pool lock time."
                            : "Draft entry"
                          : "Read-only entry"}
                      </div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200">
                      {selectedEntry.submittedAt ? "Submitted" : "Draft"}
                    </div>
                  </div>

                  <label className="text-sm font-medium text-slate-200">
                    Entry name
                    <input
                      value={entryNameDraft}
                      onChange={(event) => setEntryNameDraft(event.target.value)}
                      disabled={interactionLocked}
                      className="mt-2 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none disabled:opacity-50"
                    />
                  </label>

                  <label className="text-sm font-medium text-slate-200">
                    Finals tiebreaker
                    <input
                      value={entryTiebreakerDraft}
                      onChange={(event) => setEntryTiebreakerDraft(event.target.value)}
                      disabled={interactionLocked}
                      className="mt-2 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none disabled:opacity-50"
                      placeholder="Combined points in Finals clincher"
                      inputMode="numeric"
                    />
                    <TiebreakerHelperText text={tiebreakerHelperText} />
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleSaveEntryDetails}
                      disabled={interactionLocked || pendingEntryWrites > 0}
                      className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/22 hover:bg-white/10 disabled:opacity-50"
                    >
                      Save entry details
                    </button>
                    <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300">
                      {selectedEntry.submittedAt
                        ? `Submitted ${new Date(selectedEntry.submittedAt).toLocaleString()}`
                        : "Submit before lock to enter the leaderboard"}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                        Total points
                      </div>
                      <div className="mt-1 text-lg font-semibold text-white">
                        {activeScore.totalPoints}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                        Max possible
                      </div>
                      <div className="mt-1 text-lg font-semibold text-white">
                        {activeScore.maxPossiblePoints}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                        Correct winners
                      </div>
                      <div className="mt-1 text-lg font-semibold text-white">
                        {activeScore.correctWinners}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                        Exact lengths
                      </div>
                      <div className="mt-1 text-lg font-semibold text-white">
                        {activeScore.exactLengths}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {!poolLocked ? (
                <div className="space-y-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-sm font-semibold text-white">Add another entry</div>
                  <label className="text-sm font-medium text-slate-200">
                    Entry name
                    <input
                      value={newEntryName}
                      onChange={(event) => setNewEntryName(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-200">
                    Finals tiebreaker
                    <input
                      value={newEntryTiebreaker}
                      onChange={(event) => setNewEntryTiebreaker(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none"
                      placeholder="Combined points in Finals clincher"
                      inputMode="numeric"
                    />
                    <TiebreakerHelperText text={tiebreakerHelperText} />
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleCreateEntry()}
                    disabled={isCreatingEntry}
                    className="rounded-full border border-sky-300/25 bg-sky-500/12 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:border-sky-300/45 hover:bg-sky-500/18 disabled:opacity-50"
                  >
                    {isCreatingEntry ? "Creating entry…" : "Create entry"}
                  </button>
                </div>
              ) : (
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-slate-300">
                  This pool is locked, so no new entries can be added.
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-[24px] border border-dashed border-white/12 bg-white/[0.03] px-4 py-6 text-sm text-slate-300">
              No joined pools yet. Create a new pool or use an invite link or code to jump into one.
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(2,6,23,0.92))] p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">
            Create or join
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-white">Pool setup</h2>
          <p className="mt-2 text-sm text-slate-300/80">
            Pools persist in the database and can be joined either from a private invite link or from the separate manual-code join screen.
          </p>

          <div className="mt-4 space-y-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
            <div className="text-sm font-semibold text-white">Create a new pool</div>
            <label className="text-sm font-medium text-slate-200">
              Your display name
              <input
                value={createPoolDisplayName}
                onChange={(event) => setCreatePoolDisplayName(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none"
                placeholder="Commissioner name"
              />
            </label>
            <label className="text-sm font-medium text-slate-200">
              Pool name
              <input
                value={createPoolName}
                onChange={(event) => setCreatePoolName(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none"
              />
            </label>
            <label className="text-sm font-medium text-slate-200">
              Description
              <textarea
                value={createPoolDescription}
                onChange={(event) => setCreatePoolDescription(event.target.value)}
                className="mt-2 min-h-24 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none"
                placeholder="Optional pool note"
              />
            </label>
            <label className="text-sm font-medium text-slate-200">
              Lock time
              <input
                type="datetime-local"
                value={createPoolLockAt}
                onChange={(event) => setCreatePoolLockAt(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none"
              />
            </label>
            <label className="text-sm font-medium text-slate-200">
              Invite link slug / manual join code
              <input
                value={createPoolInviteCode}
                onChange={(event) => setCreatePoolInviteCode(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none"
                placeholder="Optional custom slug"
              />
              <p className="mt-2 text-xs text-slate-400">
                This becomes the private invite link token and also works as the manual join code from the Join Pool screen.
              </p>
            </label>
            <label className="text-sm font-medium text-slate-200">
              First entry name
              <input
                value={createPoolEntryName}
                onChange={(event) => setCreatePoolEntryName(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none"
              />
            </label>
            <label className="text-sm font-medium text-slate-200">
              Finals tiebreaker
              <input
                value={createPoolTiebreaker}
                onChange={(event) => setCreatePoolTiebreaker(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none"
                placeholder="Combined points in Finals clincher"
                inputMode="numeric"
              />
              <TiebreakerHelperText text={tiebreakerHelperText} />
            </label>
            <button
              type="button"
              onClick={() => void handleCreatePool()}
              disabled={isCreatingPool}
              className="rounded-full border border-sky-300/25 bg-sky-500/12 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:border-sky-300/45 hover:bg-sky-500/18 disabled:opacity-50"
            >
              {isCreatingPool ? "Creating pool…" : "Create pool"}
            </button>
          </div>

          {!invitePool ? (
            <div className="mt-4 space-y-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-sm font-semibold text-white">Join with a manual code</div>
              <p className="text-sm text-slate-300/78">
                Use this only if the commissioner shared the manual join code. If you already have a private invite link, open that link instead.
              </p>
              <label className="text-sm font-medium text-slate-200">
                Manual join code
                <input
                  value={joinInviteCode}
                  onChange={(event) => setJoinInviteCode(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none"
                />
              </label>
              <label className="text-sm font-medium text-slate-200">
                Display name
                <input
                  value={joinDisplayName}
                  onChange={(event) => setJoinDisplayName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none"
                />
              </label>
              <label className="text-sm font-medium text-slate-200">
                Entry name
                <input
                  value={joinEntryName}
                  onChange={(event) => setJoinEntryName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none"
                  placeholder="Create a bracket now"
                />
              </label>
              <label className="text-sm font-medium text-slate-200">
                Finals tiebreaker
                <input
                  value={joinTiebreaker}
                  onChange={(event) => setJoinTiebreaker(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/12 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none"
                  placeholder="Combined points in Finals clincher"
                  inputMode="numeric"
                />
                <TiebreakerHelperText text={tiebreakerHelperText} />
              </label>
              <button
                type="button"
                onClick={() => void handleJoinPool({ joinMethod: "code" })}
                disabled={isJoiningPool}
                className="rounded-full border border-amber-300/30 bg-amber-400/12 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-300/50 hover:bg-amber-400/18 disabled:opacity-50"
              >
                {isJoiningPool ? "Joining pool…" : "Join with manual code"}
              </button>
            </div>
          ) : null}
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(2,6,23,0.92))] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">
                Leaderboard
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {displayPool?.name ?? "Standings"}
              </h2>
              <p className="mt-2 text-sm text-slate-300/80">
                Standings are generated from submitted entries only and scored from the shared official-results state using the live pool rules.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
              {submittedEntries.length} live entries
            </div>
          </div>

          {rankedEntries.length ? (
            <div className="mt-4 space-y-3">
              {rankedEntries.map((ranking, index) => {
                const sourceEntry = ranking.entry;

                return (
                  <button
                    type="button"
                    key={ranking.entry.id}
                    onClick={() =>
                      updateSelection({
                        currentEntryId: ranking.entry.id,
                        currentView: "my-bracket",
                      })
                    }
                    className={cx(
                      "w-full rounded-[22px] border bg-white/[0.04] p-4 text-left transition hover:border-white/22 hover:bg-white/[0.06]",
                      selectedEntry?.id === ranking.entry.id
                        ? "border-sky-300/35 bg-sky-400/10"
                        : "border-white/10",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                          Rank #{index + 1}
                        </div>
                        <div className="mt-2 text-lg font-semibold text-white">
                          {sourceEntry?.displayName}
                        </div>
                        <div className="text-sm text-slate-300">
                          {sourceEntry?.name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-black text-white">
                          {ranking.score.totalPoints}
                        </div>
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                          Total points
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-200">
                          Max {ranking.score.maxPossiblePoints}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                          Winner points
                        </div>
                        <div className="mt-1 text-lg font-semibold text-white">
                          {ranking.score.winnerPoints}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                          Exact bonus
                        </div>
                        <div className="mt-1 text-lg font-semibold text-white">
                          {ranking.score.exactLengthPoints}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                          Correct winners
                        </div>
                        <div className="mt-1 text-lg font-semibold text-white">
                          {ranking.score.correctWinners}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                          Exact lengths
                        </div>
                        <div className="mt-1 text-lg font-semibold text-white">
                          {ranking.score.exactLengths}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                          Pending picks
                        </div>
                        <div className="mt-1 text-lg font-semibold text-white">
                          {ranking.score.pending}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                          Finals tiebreaker
                        </div>
                        <div className="mt-1 text-lg font-semibold text-white">
                          {sourceEntry?.tiebreakerGuess ?? "—"}
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                          {typeof ranking.score.tiebreakerDiff === "number"
                            ? `Off by ${ranking.score.tiebreakerDiff}`
                            : "Clincher pending"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                      <div>
                        Submitted{" "}
                        {sourceEntry?.submittedAt
                          ? new Date(sourceEntry.submittedAt).toLocaleString()
                          : "—"}
                      </div>
                      <div>
                        Ties: points, Finals clincher, series winners, exact lengths, earliest entry
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-[24px] border border-dashed border-white/12 bg-white/[0.03] px-4 py-6 text-sm text-slate-300">
              No submitted entries yet. The leaderboard will appear as soon as the first real bracket is submitted.
            </div>
          )}

          <div className="mt-5 border-t border-white/10 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Results tracker
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  Live series updates
                </div>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                {seriesLengthPickCount}/15 exact length picks
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {visibleResults.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <div className="text-sm font-semibold text-white">{item.label}</div>
                  <div className="mt-1 text-sm text-slate-300">{item.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {selectedEntry ? (
        <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(2,6,23,0.92))] p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">
                Entry view
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {selectedEntry.displayName} · {selectedEntry.name}
              </h2>
              <p className="mt-2 text-sm text-slate-300/80">
                Click any submitted leaderboard entry to load that bracket here. Correct picks, missed picks, and live pending picks all flow from the shared official results.
              </p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3 text-right">
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Bracket status
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {selectedEntry.submittedAt ? "Submitted" : "Draft"}
              </div>
              <div className="text-xs text-slate-400">
                {selectedEntry.submittedAt
                  ? new Date(selectedEntry.submittedAt).toLocaleString()
                  : "Still editable before lock"}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Current points
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {activeScore.totalPoints}
              </div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Max possible
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {activeScore.maxPossiblePoints}
              </div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Winner points
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {activeScore.winnerPoints}
              </div>
              <div className="text-xs text-slate-400">
                {activeScore.correctWinners} correct winners
              </div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Exact bonus
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {activeScore.exactLengthPoints}
              </div>
              <div className="text-xs text-slate-400">
                {activeScore.exactLengths} exact lengths · {activeScore.pending} pending picks
              </div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Finals tiebreaker
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {selectedEntry.tiebreakerGuess ?? "—"}
              </div>
              <div className="text-xs text-slate-400">{tiebreakerHelperText}</div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Submission time
              </div>
              <div className="mt-2 text-sm font-semibold text-white">
                {selectedEntry.submittedAt
                  ? new Date(selectedEntry.submittedAt).toLocaleString()
                  : "Not submitted yet"}
              </div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Edit access
              </div>
              <div className="mt-2 text-sm font-semibold text-white">
                {selectedEntry.canEdit && !poolLocked ? "Editable" : "Read-only"}
              </div>
              <div className="text-xs text-slate-400">
                {selectedEntry.canEdit && !poolLocked
                  ? "You can still update this entry before lock."
                  : "Viewing a locked or non-owned bracket."}
              </div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Pick result key
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className={cx("rounded-full border px-3 py-1", pickStatusToneClasses.correct)}>
                  Correct
                </span>
                <span className={cx("rounded-full border px-3 py-1", pickStatusToneClasses.incorrect)}>
                  Incorrect
                </span>
                <span className={cx("rounded-full border px-3 py-1", pickStatusToneClasses.pending)}>
                  Pending
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {entryPickStatusRows.map((row) => (
              <div
                key={row.id}
                className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                      {row.stage}
                    </div>
                    <div className="mt-2 text-base font-semibold text-white">
                      {row.label}
                    </div>
                    <div className="mt-1 text-sm text-slate-300">{row.pickText}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-xs">
                    <span
                      className={cx(
                        "rounded-full border px-3 py-1",
                        pickStatusToneClasses[row.winnerTone],
                      )}
                    >
                      Winner: {row.winnerStatusLabel}
                    </span>
                    <span
                      className={cx(
                        "rounded-full border px-3 py-1",
                        pickStatusToneClasses[row.lengthTone],
                      )}
                    >
                      Length: {row.lengthStatusLabel}
                    </span>
                  </div>
                </div>
                <div className="mt-3 text-sm text-slate-300">{row.detail}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {displayPool ? (
        <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(2,6,23,0.92))] p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">
                Pool pulse
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {displayPool.name}
              </h2>
              <p className="mt-2 text-sm text-slate-300/80">
                Real pool stats and pick percentages are generated from submitted entries only. The bracket canvas above stays unchanged while this section tracks the live pool picture underneath it.
              </p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3 text-right">
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Submitted entries
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {submittedEntries.length}
              </div>
              <div className="text-xs text-slate-400">
                of {poolEntries.length} total entries
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Total entries
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {poolEntries.length}
              </div>
              <div className="text-xs text-slate-400">
                {displayPool.participantCount ?? 0} pool members
              </div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Current leader
              </div>
              <div className="mt-2 text-base font-semibold text-white">
                {leader ? `${leader.entry.displayName} · ${leader.entry.name}` : "No leader yet"}
              </div>
              <div className="text-xs text-slate-400">
                {leader ? `${leader.score.totalPoints} points` : "Waiting for submitted entries"}
              </div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Most-picked champion
              </div>
              <div className="mt-2 text-base font-semibold text-white">
                {mostPickedChampion?.team?.displayName ?? "No champion picks yet"}
              </div>
              <div className="text-xs text-slate-400">
                {mostPickedChampion ? `${mostPickedChampion.percent}% of submitted brackets` : "Submit entries to see the pool lean"}
              </div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Lock status
              </div>
              <div className="mt-2 text-base font-semibold text-white">
                {poolLocked ? "Locked" : "Open"}
              </div>
              <div className="text-xs text-slate-400">
                {formatAbsolute(displayPool.lockAt)}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Champion pick split
              </div>
              {championPickLeaders.length ? (
                <div className="mt-4 space-y-3">
                  {championPickLeaders.map((pick) => (
                    <div
                      key={pick.teamId}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3"
                    >
                      <div className="text-sm font-semibold text-white">
                        {pick.team?.displayName ?? pick.teamId}
                      </div>
                      <div className="text-sm font-semibold text-slate-200">
                        {pick.percent}%
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-white/12 bg-white/[0.03] px-4 py-5 text-sm text-slate-300">
                  No submitted champion picks yet.
                </div>
              )}
            </div>

            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Pool join security
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-200">
                <div>Private invite links can join the pool directly.</div>
                <div>Manual join codes only work from the Join Pool screen.</div>
                <div>Invite links no longer expose the full pool leaderboard before a user joins.</div>
                <div>Direct shared bracket links still work for the specific submitted entry being shared.</div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
              Pick percentages by matchup
            </div>
            {submittedEntries.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {matchupPopularityCards.map((card) => (
                  <div
                    key={card.id}
                    className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4"
                  >
                    <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                      {card.roundLabel}
                    </div>
                    <div className="mt-2 text-base font-semibold text-white">
                      {card.label}
                    </div>
                    <div className="mt-1 text-sm text-slate-300">{card.note}</div>
                    {card.picks.length ? (
                      <div className="mt-4 space-y-2">
                        {card.picks.map((pick) => (
                          <div
                            key={pick.teamId}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-2.5"
                          >
                            <div className="text-sm font-semibold text-white">
                              {pick.team?.displayName ?? pick.teamId}
                            </div>
                            <div className="text-sm font-semibold text-slate-200">
                              {pick.percent}%
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-white/12 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
                        No submitted picks yet for this matchup.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[24px] border border-dashed border-white/12 bg-white/[0.03] px-4 py-6 text-sm text-slate-300">
                Pool percentages will appear as soon as the first submitted bracket is in the pool.
              </div>
            )}
          </div>
        </section>
      ) : null}

      <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(2,6,23,0.92))] p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">
              Rules / Scoring
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              How the pool scores
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-300/80">
              Play-in games are single-elimination, every playoff round is best-of-seven, and exact series-length bonus points only count when the correct team also advances.
            </p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3 text-right">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
              Perfect bracket
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {MAX_BRACKET_POINTS}
            </div>
            <div className="text-xs text-slate-400">maximum possible points</div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {scoringRows.map((row) => (
              <div
                key={row.label}
                className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  {row.label}
                </div>
                <div className="mt-2 text-sm text-slate-300">{row.detail}</div>
                <div className="mt-4 text-xl font-semibold text-white">
                  {row.winnerPoints} pts
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Correct winner
                </div>
                <div className="mt-3 text-lg font-semibold text-white">
                  {row.exactLengthPoints ? `+${row.exactLengthPoints} pts` : "—"}
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  {row.exactLengthPoints ? "Exact length bonus" : "No length bonus"}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Leaderboard tiebreakers
              </div>
              <ol className="mt-3 space-y-2 text-sm text-slate-200">
                <li>1. Total points</li>
                <li>2. Closest Finals tiebreaker guess once the clincher total is known</li>
                <li>3. Most correct series winners</li>
                <li>4. Most exact series lengths</li>
                <li>5. Earliest submitted entry</li>
              </ol>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Lock + Finals tiebreaker
              </div>
              <div className="mt-3 text-sm text-slate-200">
                {lockStatusBody}
              </div>
              <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-3 text-sm text-slate-300">
                {tiebreakerHelperText}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
