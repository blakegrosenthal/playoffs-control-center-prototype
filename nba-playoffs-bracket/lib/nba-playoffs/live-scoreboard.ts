import { teams } from "./data";
import { LiveScoreboardGame, MatchupStatus } from "./types";

const SCOREBOARD_URL =
  "https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json";

const internalTeamIdByNbaId = new Map(
  teams.map((team) => [String(team.nbaTeamId), team.id]),
);

interface ScoreboardApiGame {
  gameId: string;
  gameStatus: number;
  gameStatusText?: string;
  gameTimeUTC: string;
  seriesText?: string;
  poRoundDesc?: string;
  seriesConference?: string;
  gameLabel?: string;
  gameSubLabel?: string;
  homeTeam: {
    teamId: number;
    score?: number;
  };
  awayTeam: {
    teamId: number;
    score?: number;
  };
}

interface ScoreboardApiPayload {
  scoreboard?: {
    games?: ScoreboardApiGame[];
  };
}

const toMatchupStatus = (gameStatus: number): MatchupStatus => {
  if (gameStatus === 3) {
    return "final";
  }

  if (gameStatus === 2) {
    return "live";
  }

  return "scheduled";
};

export async function fetchOfficialLiveScoreboard(): Promise<LiveScoreboardGame[]> {
  const response = await fetch(SCOREBOARD_URL, {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Official NBA scoreboard request failed.");
  }

  const payload = (await response.json()) as ScoreboardApiPayload;

  return (payload.scoreboard?.games ?? [])
    .map((game) => {
      const homeTeamId = internalTeamIdByNbaId.get(String(game.homeTeam.teamId));
      const awayTeamId = internalTeamIdByNbaId.get(String(game.awayTeam.teamId));

      if (!homeTeamId || !awayTeamId) {
        return null;
      }

      return {
        gameId: String(game.gameId),
        homeTeamId,
        awayTeamId,
        homeScore: Number(game.homeTeam.score ?? 0),
        awayScore: Number(game.awayTeam.score ?? 0),
        gameTimeUTC: String(game.gameTimeUTC),
        status: toMatchupStatus(Number(game.gameStatus ?? 1)),
        statusText: String(game.gameStatusText ?? "Scheduled"),
        seriesText: String(game.seriesText ?? ""),
        poRoundDesc: String(game.poRoundDesc ?? ""),
        seriesConference: String(game.seriesConference ?? ""),
        gameLabel: String(game.gameLabel ?? ""),
        gameSubLabel: String(game.gameSubLabel ?? ""),
      } satisfies LiveScoreboardGame;
    })
    .filter((game): game is LiveScoreboardGame => Boolean(game));
}
