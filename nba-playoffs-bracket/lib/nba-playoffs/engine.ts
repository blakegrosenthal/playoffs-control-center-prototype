import {
  BRACKET_LAYOUT,
  SCORING_RULES,
  playInById,
  playInGames,
  seededTeamIds,
  seriesById,
  seriesDefinitions,
  teamsById,
} from "./data";
import {
  BracketEntry,
  BracketSource,
  Conference,
  GameScore,
  LiveScoreboardGame,
  MatchupStatus,
  Pool,
  ResultsState,
  ScoredEntry,
  SeriesDefinition,
  SeriesLength,
  SlotRef,
  Team,
  TeamId,
} from "./types";

export const getTeam = (teamId?: TeamId | null): Team | null =>
  teamId ? teamsById[teamId] ?? null : null;

export const getPoolEntries = (pool?: Pool) => pool?.entries ?? [];

const getPredictedWinner = (
  matchupId: string,
  entry?: BracketEntry,
): TeamId | undefined => entry?.picks[matchupId]?.winnerTeamId;

const getOfficialWinner = (
  matchupId: string,
  results: ResultsState,
): TeamId | undefined =>
  results.playIn[matchupId]?.winnerTeamId ?? results.series[matchupId]?.winnerTeamId;

const getWinnerForSource = (
  matchupId: string,
  source: BracketSource,
  entry: BracketEntry | undefined,
  results: ResultsState,
): TeamId | undefined =>
  source === "prediction"
    ? getPredictedWinner(matchupId, entry)
    : getOfficialWinner(matchupId, results);

const resolvePlayInParticipants = (
  gameId: string,
  source: BracketSource,
  entry: BracketEntry | undefined,
  results: ResultsState,
): [TeamId | undefined, TeamId | undefined] => {
  const game = playInById[gameId];

  if (!game) {
    return [undefined, undefined];
  }

  return [
    resolveSlotTeamId(game.homeSlot, source, entry, results),
    resolveSlotTeamId(game.awaySlot, source, entry, results),
  ];
};

const resolvePlayInLoser = (
  gameId: string,
  source: BracketSource,
  entry: BracketEntry | undefined,
  results: ResultsState,
): TeamId | undefined => {
  const [homeTeamId, awayTeamId] = resolvePlayInParticipants(
    gameId,
    source,
    entry,
    results,
  );
  const winnerTeamId = getWinnerForSource(gameId, source, entry, results);

  if (!homeTeamId || !awayTeamId || !winnerTeamId) {
    return undefined;
  }

  return winnerTeamId === homeTeamId ? awayTeamId : homeTeamId;
};

export const resolveSlotTeamId = (
  slot: SlotRef,
  source: BracketSource,
  entry: BracketEntry | undefined,
  results: ResultsState,
): TeamId | undefined => {
  switch (slot.type) {
    case "team":
      return slot.teamId;
    case "play-in-winner":
      return getWinnerForSource(slot.gameId, source, entry, results);
    case "play-in-loser":
      return resolvePlayInLoser(slot.gameId, source, entry, results);
    case "series-winner":
      return getWinnerForSource(slot.seriesId, source, entry, results);
    default:
      return undefined;
  }
};

export const resolveSeriesParticipants = (
  series: SeriesDefinition,
  source: BracketSource,
  entry: BracketEntry | undefined,
  results: ResultsState,
): [TeamId | undefined, TeamId | undefined] => [
  resolveSlotTeamId(series.homeSlot, source, entry, results),
  resolveSlotTeamId(series.awaySlot, source, entry, results),
];

export const getSlotLabel = (slot: SlotRef): string => {
  switch (slot.type) {
    case "team":
      return teamsById[slot.teamId]?.displayName ?? "TBD";
    case "play-in-winner": {
      const game = playInById[slot.gameId];
      return game?.seedOutcome
        ? `${game.conference} No. ${game.seedOutcome} seed`
        : `Winner ${game?.label ?? "play-in"}`;
    }
    case "play-in-loser": {
      const game = playInById[slot.gameId];
      return `Loser ${game?.label ?? "play-in"}`;
    }
    case "series-winner": {
      const series = seriesById[slot.seriesId];
      return `Winner ${series?.label ?? "series"}`;
    }
    default:
      return "TBD";
  }
};

export const getSlotSeedLabel = (slot: SlotRef): string | undefined => {
  if (slot.type === "team" && slot.seed) {
    return String(slot.seed);
  }

  if (slot.type === "play-in-winner") {
    const seedOutcome = playInById[slot.gameId]?.seedOutcome;
    return seedOutcome ? String(seedOutcome) : undefined;
  }

  return undefined;
};

export const getSeriesWins = (
  results: ResultsState,
  seriesId: string,
  teamId?: TeamId,
): number => {
  if (!teamId) {
    return 0;
  }

  return results.series[seriesId]?.wins[teamId] ?? 0;
};

const getCompletedGames = (games: GameScore[]) =>
  games.filter((game) => game.status === "final");

const lengthOptions: SeriesLength[] = [4, 5, 6, 7];

const uniqTeamIds = (teamIds: Array<TeamId | undefined>): TeamId[] =>
  [...new Set(teamIds.filter((teamId): teamId is TeamId => Boolean(teamId)))];

const getPossiblePlayInWinnerIds = (
  gameId: string,
  results: ResultsState,
): TeamId[] => {
  const actualWinner = results.playIn[gameId]?.winnerTeamId;

  if (actualWinner) {
    return [actualWinner];
  }

  const game = playInById[gameId];

  if (!game) {
    return [];
  }

  return uniqTeamIds([
    ...getPossibleSlotTeamIds(game.homeSlot, results),
    ...getPossibleSlotTeamIds(game.awaySlot, results),
  ]);
};

const getPossiblePlayInLoserIds = (
  gameId: string,
  results: ResultsState,
): TeamId[] => {
  const game = playInById[gameId];

  if (!game) {
    return [];
  }

  const participants = uniqTeamIds([
    ...getPossibleSlotTeamIds(game.homeSlot, results),
    ...getPossibleSlotTeamIds(game.awaySlot, results),
  ]);
  const actualWinner = results.playIn[gameId]?.winnerTeamId;

  return actualWinner
    ? participants.filter((teamId) => teamId !== actualWinner)
    : participants;
};

const getPossibleSeriesWinnerIds = (
  seriesId: string,
  results: ResultsState,
): TeamId[] => {
  const actualWinner = results.series[seriesId]?.winnerTeamId;

  if (actualWinner) {
    return [actualWinner];
  }

  const series = seriesById[seriesId];

  if (!series) {
    return [];
  }

  return uniqTeamIds([
    ...getPossibleSlotTeamIds(series.homeSlot, results),
    ...getPossibleSlotTeamIds(series.awaySlot, results),
  ]);
};

const getPossibleSlotTeamIds = (slot: SlotRef, results: ResultsState): TeamId[] => {
  switch (slot.type) {
    case "team":
      return [slot.teamId];
    case "play-in-winner":
      return getPossiblePlayInWinnerIds(slot.gameId, results);
    case "play-in-loser":
      return getPossiblePlayInLoserIds(slot.gameId, results);
    case "series-winner":
      return getPossibleSeriesWinnerIds(slot.seriesId, results);
    default:
      return [];
  }
};

const getPossibleSeriesLengthsForWinner = (
  seriesId: string,
  winnerTeamId: TeamId,
  results: ResultsState,
): SeriesLength[] => {
  const actualWinner = results.series[seriesId]?.winnerTeamId;

  if (actualWinner) {
    const actualLength = getSeriesActualLength(results, seriesId);
    return actualWinner === winnerTeamId && actualLength ? [actualLength] : [];
  }

  const series = seriesById[seriesId];

  if (!series) {
    return [];
  }

  const [homeTeamId, awayTeamId] = resolveSeriesParticipants(
    series,
    "official",
    undefined,
    results,
  );

  if (!homeTeamId || !awayTeamId) {
    return getPossibleSeriesWinnerIds(seriesId, results).includes(winnerTeamId)
      ? lengthOptions
      : [];
  }

  if (winnerTeamId !== homeTeamId && winnerTeamId !== awayTeamId) {
    return [];
  }

  const loserTeamId = winnerTeamId === homeTeamId ? awayTeamId : homeTeamId;
  const winnerWins = getSeriesWins(results, seriesId, winnerTeamId);
  const loserWins = getSeriesWins(results, seriesId, loserTeamId);

  if (winnerWins >= 4 || loserWins >= 4) {
    return [];
  }

  const completedGames = Math.max(
    getCompletedGames(results.series[seriesId]?.games ?? []).length,
    winnerWins + loserWins,
  );
  const earliestFinish = completedGames + (4 - winnerWins);

  return lengthOptions.filter((games) => games >= earliestFinish);
};

const getSeriesRoundScoring = (series: SeriesDefinition) =>
  SCORING_RULES.seriesByRound[series.round];

interface MatchupScoreSummary {
  winnerPoints: number;
  exactLengthPoints: number;
  maxWinnerPoints: number;
  maxExactLengthPoints: number;
  correctWinner: boolean;
  exactLengthCorrect: boolean;
  pending: boolean;
}

const scorePlayInPick = (
  entry: BracketEntry,
  results: ResultsState,
  matchupId: string,
): MatchupScoreSummary => {
  const predictedWinner = entry.picks[matchupId]?.winnerTeamId;
  const actualWinner = results.playIn[matchupId]?.winnerTeamId;

  if (!predictedWinner) {
    return {
      winnerPoints: 0,
      exactLengthPoints: 0,
      maxWinnerPoints: 0,
      maxExactLengthPoints: 0,
      correctWinner: false,
      exactLengthCorrect: false,
      pending: false,
    };
  }

  if (actualWinner) {
    const correctWinner = predictedWinner === actualWinner;

    return {
      winnerPoints: correctWinner ? SCORING_RULES.playInWinner : 0,
      exactLengthPoints: 0,
      maxWinnerPoints: correctWinner ? SCORING_RULES.playInWinner : 0,
      maxExactLengthPoints: 0,
      correctWinner,
      exactLengthCorrect: false,
      pending: false,
    };
  }

  const canStillWin = getPossiblePlayInWinnerIds(matchupId, results).includes(
    predictedWinner,
  );

  return {
    winnerPoints: 0,
    exactLengthPoints: 0,
    maxWinnerPoints: canStillWin ? SCORING_RULES.playInWinner : 0,
    maxExactLengthPoints: 0,
    correctWinner: false,
    exactLengthCorrect: false,
    pending: canStillWin,
  };
};

const scoreSeriesPick = (
  entry: BracketEntry,
  results: ResultsState,
  series: SeriesDefinition,
): MatchupScoreSummary => {
  const predictedWinner = entry.picks[series.id]?.winnerTeamId;
  const predictedGames = entry.picks[series.id]?.games;
  const actualWinner = results.series[series.id]?.winnerTeamId;
  const roundScoring = getSeriesRoundScoring(series);

  if (!predictedWinner) {
    return {
      winnerPoints: 0,
      exactLengthPoints: 0,
      maxWinnerPoints: 0,
      maxExactLengthPoints: 0,
      correctWinner: false,
      exactLengthCorrect: false,
      pending: false,
    };
  }

  if (actualWinner) {
    const correctWinner = predictedWinner === actualWinner;
    const actualGames = getSeriesActualLength(results, series.id);
    const exactLengthCorrect =
      correctWinner &&
      Boolean(predictedGames) &&
      Boolean(actualGames) &&
      predictedGames === actualGames;

    return {
      winnerPoints: correctWinner ? roundScoring.winner : 0,
      exactLengthPoints: exactLengthCorrect ? roundScoring.exactLength : 0,
      maxWinnerPoints: correctWinner ? roundScoring.winner : 0,
      maxExactLengthPoints: exactLengthCorrect ? roundScoring.exactLength : 0,
      correctWinner,
      exactLengthCorrect,
      pending: false,
    };
  }

  const canStillWin = getPossibleSeriesWinnerIds(series.id, results).includes(
    predictedWinner,
  );
  const canStillHitExactLength =
    canStillWin &&
    Boolean(predictedGames) &&
    getPossibleSeriesLengthsForWinner(series.id, predictedWinner, results).includes(
      predictedGames as SeriesLength,
    );

  return {
    winnerPoints: 0,
    exactLengthPoints: 0,
    maxWinnerPoints: canStillWin ? roundScoring.winner : 0,
    maxExactLengthPoints: canStillHitExactLength ? roundScoring.exactLength : 0,
    correctWinner: false,
    exactLengthCorrect: false,
    pending: canStillWin || canStillHitExactLength,
  };
};

export const getSeriesActualLength = (
  results: ResultsState,
  seriesId: string,
): SeriesLength | undefined => {
  const seriesResult = results.series[seriesId];

  if (!seriesResult?.winnerTeamId) {
    return undefined;
  }

  const winnerWins = seriesResult.wins[seriesResult.winnerTeamId] ?? 0;

  if (winnerWins !== 4) {
    return undefined;
  }

  return getCompletedGames(seriesResult.games).length as SeriesLength;
};

export const formatSeriesStatus = (
  seriesId: string,
  results: ResultsState,
  participants?: [Team | null, Team | null],
): string => {
  const result = results.series[seriesId];

  if (!result) {
    return "Awaiting bracket results";
  }

  const [homeTeam, awayTeam] = participants ?? [null, null];
  const homeWins = homeTeam ? result.wins[homeTeam.id] ?? 0 : 0;
  const awayWins = awayTeam ? result.wins[awayTeam.id] ?? 0 : 0;

  if (result.winnerTeamId) {
    const winner = getTeam(result.winnerTeamId);
    const loserWins = homeTeam?.id === result.winnerTeamId ? awayWins : homeWins;
    return `${winner?.shortName ?? "Team"} win series 4 to ${loserWins}`;
  }

  if (homeWins === 0 && awayWins === 0) {
    return "Best-of-seven series has not started";
  }

  if (homeWins === awayWins) {
    return `Series tied ${homeWins} to ${awayWins}`;
  }

  if (homeWins > awayWins) {
    return `${homeTeam?.shortName ?? "Home team"} lead series ${homeWins} to ${awayWins}`;
  }

  return `${awayTeam?.shortName ?? "Away team"} lead series ${awayWins} to ${homeWins}`;
};

export const formatPlayInStatus = (
  matchupId: string,
  results: ResultsState,
): string => {
  const result = results.playIn[matchupId];

  if (!result) {
    return "Awaiting tip-off";
  }

  const latestGame = result.games[result.games.length - 1];

  if (result.winnerTeamId) {
    const winner = getTeam(result.winnerTeamId);
    return `${winner?.shortName ?? "Team"} advance from the play-in`;
  }

  if (latestGame?.status === "live") {
    return latestGame.statusText;
  }

  return "Single-elimination play-in game";
};

export const isPickCorrect = (
  matchupId: string,
  entry: BracketEntry,
  results: ResultsState,
): boolean | undefined => {
  const predicted = entry.picks[matchupId]?.winnerTeamId;
  const actual = getOfficialWinner(matchupId, results);

  if (!predicted || !actual) {
    return undefined;
  }

  return predicted === actual;
};

export const isSeriesLengthCorrect = (
  seriesId: string,
  entry: BracketEntry,
  results: ResultsState,
): boolean | undefined => {
  const predictedGames = entry.picks[seriesId]?.games;
  const actualGames = getSeriesActualLength(results, seriesId);
  const predictedWinner = entry.picks[seriesId]?.winnerTeamId;
  const actualWinner = results.series[seriesId]?.winnerTeamId;

  if (!predictedGames || !actualGames || !predictedWinner || !actualWinner) {
    return undefined;
  }

  if (predictedWinner !== actualWinner) {
    return false;
  }

  return predictedGames === actualGames;
};

export const scoreEntry = (
  entry: BracketEntry,
  results: ResultsState,
): ScoredEntry => {
  let winnerPoints = 0;
  let exactLengthPoints = 0;
  let maxWinnerPoints = 0;
  let maxExactLengthPoints = 0;
  let correctWinners = 0;
  let correctSeriesWinners = 0;
  let exactLengths = 0;
  let pending = 0;

  for (const playIn of playInGames) {
    const summary = scorePlayInPick(entry, results, playIn.id);

    winnerPoints += summary.winnerPoints;
    maxWinnerPoints += summary.maxWinnerPoints;

    if (summary.correctWinner) {
      correctWinners += 1;
      correctSeriesWinners += 1;
    }

    if (summary.pending) {
      pending += 1;
    }
  }

  for (const series of seriesDefinitions) {
    const summary = scoreSeriesPick(entry, results, series);

    winnerPoints += summary.winnerPoints;
    exactLengthPoints += summary.exactLengthPoints;
    maxWinnerPoints += summary.maxWinnerPoints;
    maxExactLengthPoints += summary.maxExactLengthPoints;

    if (summary.correctWinner) {
      correctWinners += 1;
    }

    if (summary.exactLengthCorrect) {
      exactLengths += 1;
    }

    if (summary.pending) {
      pending += 1;
    }
  }

  const totalPoints = winnerPoints + exactLengthPoints;
  const maxPossiblePoints = maxWinnerPoints + maxExactLengthPoints;
  const tiebreakerDiff =
    typeof results.tiebreakerActual === "number" &&
    typeof entry.tiebreakerGuess === "number"
      ? Math.abs(results.tiebreakerActual - entry.tiebreakerGuess)
      : undefined;

  return {
    entryId: entry.id,
    totalPoints,
    maxPossiblePoints,
    winnerPoints,
    exactLengthPoints,
    correctWinners,
    correctSeriesWinners,
    exactLengths,
    pending,
    tiebreakerGuess: entry.tiebreakerGuess,
    tiebreakerDiff,
  };
};

export const rankEntries = (entries: BracketEntry[], results: ResultsState) =>
  [...entries]
    .map((entry) => ({
      entry,
      score: scoreEntry(entry, results),
    }))
    .sort((left, right) => {
      if (right.score.totalPoints !== left.score.totalPoints) {
        return right.score.totalPoints - left.score.totalPoints;
      }

      if (
        typeof left.score.tiebreakerDiff === "number" &&
        typeof right.score.tiebreakerDiff === "number" &&
        left.score.tiebreakerDiff !== right.score.tiebreakerDiff
      ) {
        return left.score.tiebreakerDiff - right.score.tiebreakerDiff;
      }

      if (right.score.correctSeriesWinners !== left.score.correctSeriesWinners) {
        return right.score.correctSeriesWinners - left.score.correctSeriesWinners;
      }

      if (right.score.exactLengths !== left.score.exactLengths) {
        return right.score.exactLengths - left.score.exactLengths;
      }

      const leftSubmittedAt = left.entry.submittedAt
        ? new Date(left.entry.submittedAt).getTime()
        : Number.POSITIVE_INFINITY;
      const rightSubmittedAt = right.entry.submittedAt
        ? new Date(right.entry.submittedAt).getTime()
        : Number.POSITIVE_INFINITY;

      if (leftSubmittedAt !== rightSubmittedAt) {
        return leftSubmittedAt - rightSubmittedAt;
      }

      return `${left.entry.displayName}:${left.entry.name}`.localeCompare(
        `${right.entry.displayName}:${right.entry.name}`,
      );
    });

export const getWinnerPickPopularity = (
  entries: BracketEntry[],
  matchupId: string,
): Record<TeamId, number> => {
  const submittedEntries = entries.filter((entry) => entry.submittedAt);
  const total = submittedEntries.filter(
    (entry) => entry.picks[matchupId]?.winnerTeamId,
  ).length;

  if (!total) {
    return {};
  }

  const counts = submittedEntries.reduce<Record<TeamId, number>>(
    (accumulator, entry) => {
      const teamId = entry.picks[matchupId]?.winnerTeamId;

      if (!teamId) {
        return accumulator;
      }

      accumulator[teamId] = (accumulator[teamId] ?? 0) + 1;
      return accumulator;
    },
    {},
  );

  return Object.fromEntries(
    Object.entries(counts).map(([teamId, count]) => [
      teamId,
      Math.round((count / total) * 100),
    ]),
  ) as Record<TeamId, number>;
};

export const getCompletedPickCount = (entry: BracketEntry) =>
  Object.values(entry.picks).filter((pick) => pick.winnerTeamId).length;

export const getSeriesLengthPickCount = (entry: BracketEntry) =>
  seriesDefinitions.filter((series) => entry.picks[series.id]?.games).length;

export const getPredictionMatchupParticipants = (
  matchupId: string,
  entry: BracketEntry,
  results: ResultsState,
): [TeamId | undefined, TeamId | undefined] => {
  if (playInById[matchupId]) {
    return resolvePlayInParticipants(matchupId, "prediction", entry, results);
  }

  if (seriesById[matchupId]) {
    return resolveSeriesParticipants(
      seriesById[matchupId],
      "prediction",
      entry,
      results,
    );
  }

  return [undefined, undefined];
};

export const sanitizeEntryPicks = (
  entry: BracketEntry,
  results: ResultsState,
): BracketEntry => {
  const nextEntry: BracketEntry = {
    ...entry,
    picks: Object.fromEntries(
      Object.entries(entry.picks).map(([key, value]) => [key, { ...value }]),
    ),
  };

  const orderedMatchups = [
    ...playInGames.map((game) => game.id),
    ...seriesDefinitions.map((series) => series.id),
  ];

  let changed = true;

  while (changed) {
    changed = false;

    for (const matchupId of orderedMatchups) {
      const pick = nextEntry.picks[matchupId];

      if (!pick?.winnerTeamId) {
        continue;
      }

      const [homeTeamId, awayTeamId] = getPredictionMatchupParticipants(
        matchupId,
        nextEntry,
        results,
      );

      if (
        homeTeamId &&
        awayTeamId &&
        pick.winnerTeamId !== homeTeamId &&
        pick.winnerTeamId !== awayTeamId
      ) {
        nextEntry.picks[matchupId] = {};
        changed = true;
      }
    }
  }

  return nextEntry;
};

const sameMatchup = (
  firstTeamId?: TeamId,
  secondTeamId?: TeamId,
  homeTeamId?: TeamId,
  awayTeamId?: TeamId,
) => {
  if (!firstTeamId || !secondTeamId || !homeTeamId || !awayTeamId) {
    return false;
  }

  const pair = [firstTeamId, secondTeamId].sort().join(":");
  const otherPair = [homeTeamId, awayTeamId].sort().join(":");
  return pair === otherPair;
};

const upsertGame = (games: GameScore[], game: GameScore) => {
  const existing = games.findIndex(
    (currentGame) => currentGame.externalId === game.externalId,
  );

  if (existing === -1) {
    return [...games, game].sort((left, right) =>
      left.playedAt.localeCompare(right.playedAt),
    );
  }

  const nextGames = [...games];
  nextGames[existing] = game;
  return nextGames.sort((left, right) => left.playedAt.localeCompare(right.playedAt));
};

const deriveSeriesWins = (games: GameScore[]) => {
  return games
    .filter((game) => game.status === "final")
    .reduce<Partial<Record<TeamId, number>>>((wins, game) => {
      const winnerTeamId =
        game.homeScore > game.awayScore ? game.homeTeamId : game.awayTeamId;
      wins[winnerTeamId] = (wins[winnerTeamId] ?? 0) + 1;
      return wins;
    }, {});
};

const mapLiveStatus = (status: MatchupStatus, games: GameScore[]): MatchupStatus => {
  if (games.some((game) => game.status === "live")) {
    return "live";
  }

  const wins = Object.values(deriveSeriesWins(games));

  if (wins.some((winCount) => winCount === 4)) {
    return "final";
  }

  if (games.some((game) => game.status === "final")) {
    return "live";
  }

  return status;
};

export const mergeLiveGamesIntoResults = (
  results: ResultsState,
  liveGames: LiveScoreboardGame[],
): { results: ResultsState; matchedCount: number } => {
  const nextResults: ResultsState = {
    ...results,
    playIn: Object.fromEntries(
      Object.entries(results.playIn).map(([key, value]) => [key, { ...value }]),
    ),
    series: Object.fromEntries(
      Object.entries(results.series).map(([key, value]) => [
        key,
        { ...value, wins: { ...value.wins }, games: [...value.games] },
      ]),
    ),
  };

  let matchedCount = 0;

  for (const liveGame of liveGames) {
    if (!seededTeamIds.has(liveGame.homeTeamId) || !seededTeamIds.has(liveGame.awayTeamId)) {
      continue;
    }

    const mappedGame: GameScore = {
      externalId: liveGame.gameId,
      playedAt: liveGame.gameTimeUTC,
      homeTeamId: liveGame.homeTeamId,
      awayTeamId: liveGame.awayTeamId,
      homeScore: liveGame.homeScore,
      awayScore: liveGame.awayScore,
      status: liveGame.status,
      statusText: liveGame.statusText,
      source: "nba-live",
    };

    const playInMatch = playInGames.find((playIn) => {
      const [homeTeamId, awayTeamId] = resolvePlayInParticipants(
        playIn.id,
        "official",
        undefined,
        nextResults,
      );
      return sameMatchup(
        homeTeamId,
        awayTeamId,
        liveGame.homeTeamId,
        liveGame.awayTeamId,
      );
    });

    if (playInMatch) {
      const previous = nextResults.playIn[playInMatch.id];
      const games = upsertGame(previous.games, mappedGame);
      const winnerTeamId =
        liveGame.status === "final"
          ? liveGame.homeScore > liveGame.awayScore
            ? liveGame.homeTeamId
            : liveGame.awayTeamId
          : previous.winnerTeamId;

      nextResults.playIn[playInMatch.id] = {
        ...previous,
        games,
        status: liveGame.status,
        winnerTeamId,
        lastUpdated: new Date().toISOString(),
      };

      matchedCount += 1;
      continue;
    }

    const seriesMatch = seriesDefinitions.find((series) => {
      const [homeTeamId, awayTeamId] = resolveSeriesParticipants(
        series,
        "official",
        undefined,
        nextResults,
      );
      return sameMatchup(
        homeTeamId,
        awayTeamId,
        liveGame.homeTeamId,
        liveGame.awayTeamId,
      );
    });

    if (!seriesMatch) {
      continue;
    }

    const previous = nextResults.series[seriesMatch.id];
    const games = upsertGame(previous.games, mappedGame);
    const wins = deriveSeriesWins(games);
    const winnerTeamId = Object.keys(wins).find(
      (teamId) => wins[teamId] === 4,
    ) as TeamId | undefined;

    nextResults.series[seriesMatch.id] = {
      ...previous,
      games,
      wins,
      winnerTeamId,
      status: mapLiveStatus(liveGame.status, games),
      lastUpdated: new Date().toISOString(),
    };

    matchedCount += 1;
  }

  nextResults.lastUpdated = new Date().toISOString();
  nextResults.liveSyncNote = matchedCount
    ? `Synced ${matchedCount} official NBA game${matchedCount === 1 ? "" : "s"} into the postseason tracker.`
    : "No postseason games from today’s official NBA feed matched the seeded 2026 bracket.";

  return { results: nextResults, matchedCount };
};

export const getConferenceChampion = (
  conference: Conference,
  source: BracketSource,
  entry: BracketEntry | undefined,
  results: ResultsState,
) => {
  const seriesId = conference === "East" ? "east-cf" : "west-cf";
  return getTeam(getWinnerForSource(seriesId, source, entry, results));
};

export const getFinalsChampion = (
  source: BracketSource,
  entry: BracketEntry | undefined,
  results: ResultsState,
) => getTeam(getWinnerForSource("nba-finals", source, entry, results));

export const getBracketLayout = () => BRACKET_LAYOUT;
