export type Conference = "East" | "West";
export type BracketSource = "prediction" | "official";
export type TeamId = string;
export type RoundKey =
  | "play-in"
  | "round-1"
  | "semifinals"
  | "conference-finals"
  | "finals";
export type MatchupStatus = "scheduled" | "live" | "final";
export type SeriesLength = 4 | 5 | 6 | 7;

export interface Team {
  id: TeamId;
  nbaTeamId: number;
  tricode: string;
  city: string;
  name: string;
  shortName: string;
  displayName: string;
  conference: Conference;
  defaultSeed?: number;
  logo: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export type SlotRef =
  | {
      type: "team";
      teamId: TeamId;
      seed?: number;
    }
  | {
      type: "play-in-winner";
      gameId: string;
    }
  | {
      type: "play-in-loser";
      gameId: string;
    }
  | {
      type: "series-winner";
      seriesId: string;
    };

export interface PlayInGameDefinition {
  id: string;
  conference: Conference;
  round: "play-in";
  label: string;
  seedOutcome?: 7 | 8;
  note: string;
  homeSlot: SlotRef;
  awaySlot: SlotRef;
}

export interface SeriesDefinition {
  id: string;
  conference: Conference | "NBA";
  round: Exclude<RoundKey, "play-in">;
  label: string;
  note: string;
  homeSlot: SlotRef;
  awaySlot: SlotRef;
}

export interface MatchupPick {
  winnerTeamId?: TeamId;
  games?: SeriesLength;
}

export interface BracketEntry {
  id: string;
  participantId?: string;
  displayName: string;
  name: string;
  picks: Record<string, MatchupPick>;
  tiebreakerGuess?: number;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  score?: number;
  correctWinners?: number;
  exactLengths?: number;
  pending?: number;
  canEdit?: boolean;
}

export interface Pool {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  lockAt?: string;
  tiebreakerQuestion: string;
  createdAt: string;
  createdBy?: string;
  participantCount?: number;
  joined?: boolean;
  entries: BracketEntry[];
}

export interface GameScore {
  externalId: string;
  playedAt: string;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  homeScore: number;
  awayScore: number;
  status: MatchupStatus;
  statusText: string;
  source: "manual" | "nba-live";
}

export interface PlayInResult {
  matchupId: string;
  status: MatchupStatus;
  winnerTeamId?: TeamId;
  games: GameScore[];
  lastUpdated?: string;
}

export interface SeriesResult {
  matchupId: string;
  status: MatchupStatus;
  winnerTeamId?: TeamId;
  wins: Partial<Record<TeamId, number>>;
  games: GameScore[];
  lastUpdated?: string;
}

export interface ResultsState {
  playIn: Record<string, PlayInResult>;
  series: Record<string, SeriesResult>;
  tiebreakerActual?: number;
  lastUpdated?: string;
  liveSyncNote?: string;
}

export interface LiveScoreboardGame {
  gameId: string;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  homeScore: number;
  awayScore: number;
  gameTimeUTC: string;
  status: MatchupStatus;
  statusText: string;
  seriesText: string;
  poRoundDesc: string;
  seriesConference: string;
  gameLabel: string;
  gameSubLabel: string;
}

export interface ScoredEntry {
  entryId: string;
  totalPoints: number;
  correctWinners: number;
  exactLengths: number;
  pending: number;
  tiebreakerGuess?: number;
  tiebreakerDiff?: number;
}

export interface ClientProfile {
  clientId: string;
  participantId?: string;
  displayName?: string;
}

export interface ClientPreferences {
  version: number;
  clientId: string;
  currentPoolId?: string;
  currentEntryId?: string;
  currentView: "my-bracket" | "official-bracket";
  displayName?: string;
}

export interface AppBootstrapResponse {
  participant: ClientProfile;
  pools: Pool[];
  results: ResultsState;
  invitePool?: Pool | null;
}
