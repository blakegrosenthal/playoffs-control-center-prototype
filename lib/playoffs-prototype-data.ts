const nbaLogoUrl = (nbaTeamId: number) =>
  `https://cdn.nba.com/logos/nba/${nbaTeamId}/global/L/logo.svg`;

export interface PrototypeTeam {
  id: string;
  nbaTeamId: number;
  city: string;
  name: string;
  shortName: string;
  logo: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface PrototypeSlot {
  id: string;
  type: "team" | "placeholder";
  label: string;
  shortLabel: string;
  seed?: number;
  teamId?: string;
  candidateTeamIds: string[];
  note?: string;
}

export interface PrototypeScheduleItem {
  label: string;
  date: string;
  time: string;
  venue: string;
  note?: string;
}

export interface PrototypeFriendPick {
  name: string;
  side: "teamA" | "teamB";
  confidence: string;
  note: string;
}

export interface PrototypeRecentGame {
  label: string;
  result: string;
  detail: string;
}

export interface PrototypePerformance {
  player: string;
  line: string;
  teamId: string;
}

export interface PrototypeReaction {
  emoji: string;
  count: number;
}

export interface PrototypeComment {
  id: string;
  user: string;
  flair: string;
  time: string;
  text: string;
  reactions: PrototypeReaction[];
}

export interface PrototypeSeries {
  id: string;
  conference: "East" | "West" | "League";
  round: "Round 1" | "Conference Semifinals" | "Conference Finals" | "NBA Finals";
  teamA: PrototypeSlot;
  teamB: PrototypeSlot;
  score: string;
  status: string;
  statusTone: "hot" | "watch" | "locked" | "pending";
  cardNote: string;
  community: {
    teamA: number;
    teamB: number;
  };
  activeLabel: string;
  fansDiscussing: string;
  preview: string;
  schedule: PrototypeScheduleItem[];
  friends: PrototypeFriendPick[];
  recentResults: PrototypeRecentGame[];
  playerPerformances: PrototypePerformance[];
  stakes: string[];
  comments: PrototypeComment[];
  impactStat: string;
}

export interface PrototypeUpcomingGame {
  id: string;
  label: string;
  matchup: string;
  window: string;
  note: string;
  impact: string;
}

export interface PrototypeActivityItem {
  id: string;
  user: string;
  action: string;
  detail: string;
  tone: "prediction" | "comment" | "wager";
  time: string;
  seriesId?: string;
}

export interface PrototypeBracketPick {
  id: string;
  round: string;
  matchup: string;
  pick: string;
  status: "correct" | "incorrect" | "pending";
  note: string;
}

export interface PrototypeLeaderboardEntry {
  id: string;
  rank: number;
  username: string;
  points: number;
  correctPicks: number;
  recentAccuracy: string;
  trend: string;
  favoriteCall: string;
  bracketPreview: PrototypeBracketPick[];
}

const teams: PrototypeTeam[] = [
  {
    id: "det",
    nbaTeamId: 1610612765,
    city: "Detroit",
    name: "Pistons",
    shortName: "Pistons",
    logo: nbaLogoUrl(1610612765),
    colors: { primary: "#1D428A", secondary: "#C8102E", accent: "#BEC0C2" },
  },
  {
    id: "bos",
    nbaTeamId: 1610612738,
    city: "Boston",
    name: "Celtics",
    shortName: "Celtics",
    logo: nbaLogoUrl(1610612738),
    colors: { primary: "#007A33", secondary: "#BA9653", accent: "#FFFFFF" },
  },
  {
    id: "nyk",
    nbaTeamId: 1610612752,
    city: "New York",
    name: "Knicks",
    shortName: "Knicks",
    logo: nbaLogoUrl(1610612752),
    colors: { primary: "#006BB6", secondary: "#F58426", accent: "#BEC0C2" },
  },
  {
    id: "cle",
    nbaTeamId: 1610612739,
    city: "Cleveland",
    name: "Cavaliers",
    shortName: "Cavs",
    logo: nbaLogoUrl(1610612739),
    colors: { primary: "#6F263D", secondary: "#FFB81C", accent: "#041E42" },
  },
  {
    id: "tor",
    nbaTeamId: 1610612761,
    city: "Toronto",
    name: "Raptors",
    shortName: "Raptors",
    logo: nbaLogoUrl(1610612761),
    colors: { primary: "#CE1141", secondary: "#000000", accent: "#A1A1A4" },
  },
  {
    id: "atl",
    nbaTeamId: 1610612737,
    city: "Atlanta",
    name: "Hawks",
    shortName: "Hawks",
    logo: nbaLogoUrl(1610612737),
    colors: { primary: "#E03A3E", secondary: "#C1D32F", accent: "#26282A" },
  },
  {
    id: "phi",
    nbaTeamId: 1610612755,
    city: "Philadelphia",
    name: "76ers",
    shortName: "76ers",
    logo: nbaLogoUrl(1610612755),
    colors: { primary: "#006BB6", secondary: "#ED174C", accent: "#FFFFFF" },
  },
  {
    id: "orl",
    nbaTeamId: 1610612753,
    city: "Orlando",
    name: "Magic",
    shortName: "Magic",
    logo: nbaLogoUrl(1610612753),
    colors: { primary: "#0077C0", secondary: "#C4CED4", accent: "#000000" },
  },
  {
    id: "cha",
    nbaTeamId: 1610612766,
    city: "Charlotte",
    name: "Hornets",
    shortName: "Hornets",
    logo: nbaLogoUrl(1610612766),
    colors: { primary: "#1D1160", secondary: "#00788C", accent: "#A1A1A4" },
  },
  {
    id: "okc",
    nbaTeamId: 1610612760,
    city: "Oklahoma City",
    name: "Thunder",
    shortName: "Thunder",
    logo: nbaLogoUrl(1610612760),
    colors: { primary: "#007AC1", secondary: "#EF3B24", accent: "#FDBB30" },
  },
  {
    id: "sas",
    nbaTeamId: 1610612759,
    city: "San Antonio",
    name: "Spurs",
    shortName: "Spurs",
    logo: nbaLogoUrl(1610612759),
    colors: { primary: "#000000", secondary: "#C4CED4", accent: "#FFFFFF" },
  },
  {
    id: "den",
    nbaTeamId: 1610612743,
    city: "Denver",
    name: "Nuggets",
    shortName: "Nuggets",
    logo: nbaLogoUrl(1610612743),
    colors: { primary: "#0E2240", secondary: "#FEC524", accent: "#8B2131" },
  },
  {
    id: "lal",
    nbaTeamId: 1610612747,
    city: "Los Angeles",
    name: "Lakers",
    shortName: "Lakers",
    logo: nbaLogoUrl(1610612747),
    colors: { primary: "#552583", secondary: "#FDB927", accent: "#FFFFFF" },
  },
  {
    id: "hou",
    nbaTeamId: 1610612745,
    city: "Houston",
    name: "Rockets",
    shortName: "Rockets",
    logo: nbaLogoUrl(1610612745),
    colors: { primary: "#CE1141", secondary: "#000000", accent: "#C4CED4" },
  },
  {
    id: "min",
    nbaTeamId: 1610612750,
    city: "Minnesota",
    name: "Timberwolves",
    shortName: "Wolves",
    logo: nbaLogoUrl(1610612750),
    colors: { primary: "#0C2340", secondary: "#236192", accent: "#9EA2A2" },
  },
  {
    id: "por",
    nbaTeamId: 1610612757,
    city: "Portland",
    name: "Trail Blazers",
    shortName: "Blazers",
    logo: nbaLogoUrl(1610612757),
    colors: { primary: "#E03A3E", secondary: "#000000", accent: "#B6BFBF" },
  },
  {
    id: "phx",
    nbaTeamId: 1610612756,
    city: "Phoenix",
    name: "Suns",
    shortName: "Suns",
    logo: nbaLogoUrl(1610612756),
    colors: { primary: "#1D1160", secondary: "#E56020", accent: "#63727A" },
  },
  {
    id: "lac",
    nbaTeamId: 1610612746,
    city: "LA",
    name: "Clippers",
    shortName: "Clippers",
    logo: nbaLogoUrl(1610612746),
    colors: { primary: "#C8102E", secondary: "#1D428A", accent: "#BEC0C2" },
  },
  {
    id: "gsw",
    nbaTeamId: 1610612744,
    city: "Golden State",
    name: "Warriors",
    shortName: "Warriors",
    logo: nbaLogoUrl(1610612744),
    colors: { primary: "#1D428A", secondary: "#FFC72C", accent: "#FFFFFF" },
  },
];

export const teamMap = Object.fromEntries(
  teams.map((team) => [team.id, team]),
) as Record<string, PrototypeTeam>;

const teamSlot = (teamId: string, seed: number): PrototypeSlot => ({
  id: `${teamId}-${seed}`,
  type: "team",
  teamId,
  label: `${teamMap[teamId].city} ${teamMap[teamId].name}`,
  shortLabel: teamMap[teamId].shortName,
  seed,
  candidateTeamIds: [teamId],
});

const placeholderSlot = (
  id: string,
  label: string,
  shortLabel: string,
  seed: number | undefined,
  candidateTeamIds: string[],
  note?: string,
): PrototypeSlot => ({
  id,
  type: "placeholder",
  label,
  shortLabel,
  seed,
  candidateTeamIds,
  note,
});

const east8Placeholder = placeholderSlot(
  "east-8",
  "East Play-In Winner",
  "East Play-In Winner",
  8,
  ["cha", "phi", "orl"],
  "East 8 seed settles Friday",
);

const east7Placeholder = placeholderSlot(
  "east-7",
  "East 7 Seed",
  "East 7 Seed",
  7,
  ["phi", "orl"],
  "Tips tonight on Prime",
);

const west8Placeholder = placeholderSlot(
  "west-8",
  "West Play-In Winner",
  "West Play-In Winner",
  8,
  ["phx", "lac", "gsw"],
  "West 8 seed settles Friday",
);

const eastSemisTop = placeholderSlot(
  "east-semis-top",
  "DET / East 8",
  "DET / East 8",
  undefined,
  ["det", "cha", "phi", "orl"],
  "Projected May 4",
);

const eastSemisBottom = placeholderSlot(
  "east-semis-bottom",
  "CLE / TOR",
  "CLE / TOR",
  undefined,
  ["cle", "tor"],
  "Projected May 4",
);

const eastSemisMiddle = placeholderSlot(
  "east-semis-middle",
  "BOS / East 7",
  "BOS / East 7",
  undefined,
  ["bos", "phi", "orl"],
  "Projected May 5",
);

const eastSemisLower = placeholderSlot(
  "east-semis-lower",
  "NYK / ATL",
  "NYK / ATL",
  undefined,
  ["nyk", "atl"],
  "Projected May 5",
);

const westSemisTop = placeholderSlot(
  "west-semis-top",
  "OKC / West 8",
  "OKC / West 8",
  undefined,
  ["okc", "phx", "lac", "gsw"],
  "Projected May 4",
);

const westSemisBottom = placeholderSlot(
  "west-semis-bottom",
  "LAL / HOU",
  "LAL / HOU",
  undefined,
  ["lal", "hou"],
  "Projected May 4",
);

const westSemisMiddle = placeholderSlot(
  "west-semis-middle",
  "SAS / POR",
  "SAS / POR",
  undefined,
  ["sas", "por"],
  "Projected May 5",
);

const westSemisLower = placeholderSlot(
  "west-semis-lower",
  "DEN / MIN",
  "DEN / MIN",
  undefined,
  ["den", "min"],
  "Projected May 5",
);

const eastFinalsTop = placeholderSlot(
  "east-finals-top",
  "East Semis A",
  "East Semis A",
  undefined,
  ["det", "cle", "tor", "cha", "phi", "orl"],
  "Projected May 19",
);

const eastFinalsBottom = placeholderSlot(
  "east-finals-bottom",
  "East Semis B",
  "East Semis B",
  undefined,
  ["bos", "nyk", "atl", "phi", "orl"],
  "Projected May 20",
);

const westFinalsTop = placeholderSlot(
  "west-finals-top",
  "West Semis A",
  "West Semis A",
  undefined,
  ["okc", "lal", "hou", "phx", "lac", "gsw"],
  "Projected May 19",
);

const westFinalsBottom = placeholderSlot(
  "west-finals-bottom",
  "West Semis B",
  "West Semis B",
  undefined,
  ["sas", "por", "den", "min"],
  "Projected May 20",
);

const finalsEast = placeholderSlot(
  "finals-east",
  "East Champion",
  "East Champion",
  undefined,
  ["det", "bos", "nyk", "cle", "tor", "atl", "phi", "orl", "cha"],
  "Projected June 3",
);

const finalsWest = placeholderSlot(
  "finals-west",
  "West Champion",
  "West Champion",
  undefined,
  ["okc", "sas", "den", "lal", "hou", "min", "por", "phx", "lac", "gsw"],
  "Projected June 3",
);

export const prototypeSeries: PrototypeSeries[] = [
  {
    id: "east-r1-1",
    conference: "East",
    round: "Round 1",
    teamA: teamSlot("det", 1),
    teamB: east8Placeholder,
    score: "0-0",
    status: "Awaiting East 8 seed",
    statusTone: "watch",
    cardNote: "Cade's top-seed Pistons are waiting on Friday's winner.",
    community: { teamA: 74, teamB: 26 },
    activeLabel: "Bracket opens Sunday",
    fansDiscussing: "8.7K",
    preview:
      "Detroit owns the inside lane, but the 8-seed spot is still shaping the entire East side of the bracket.",
    schedule: [
      { label: "Game 1", date: "Sun, Apr 19", time: "3:30 PM PT", venue: "Little Caesars Arena" },
      { label: "Game 2", date: "Tue, Apr 21", time: "TBD", venue: "Little Caesars Arena" },
      { label: "Game 3", date: "Fri, Apr 24", time: "TBD", venue: "East 8 host arena" },
    ],
    friends: [
      {
        name: "Nina",
        side: "teamA",
        confidence: "74%",
        note: "Believes Cade controls tempo from the jump.",
      },
      {
        name: "Chris",
        side: "teamB",
        confidence: "Upset watch",
        note: "If Orlando lands here, he likes their defense.",
      },
    ],
    recentResults: [
      {
        label: "Sunday close",
        result: "Pistons 118, Bucks 104",
        detail: "Detroit locked the East's No. 1 seed and rested starters late.",
      },
      {
        label: "Bracket watch",
        result: "Hornets 127, Heat 126 OT",
        detail: "Charlotte stayed alive and now waits on the loser of 76ers-Magic.",
      },
    ],
    playerPerformances: [
      { player: "Cade Cunningham", line: "31 pts, 11 ast", teamId: "det" },
      { player: "Jalen Duren", line: "18 pts, 15 reb", teamId: "det" },
      { player: "LaMelo Ball", line: "30 pts, 10 ast", teamId: "cha" },
    ],
    stakes: [
      "Game 1 is Detroit's chance to set the tone for its first No. 1 seed run.",
      "A Charlotte or Orlando upset would shake 38% of saved East brackets.",
      "This side of the bracket feeds directly into a likely Cavs-Raptors semifinal path.",
    ],
    comments: [
      {
        id: "det-1",
        user: "courtvision",
        flair: "Pistons fan",
        time: "3m ago",
        text: "Detroit finally has the big-stage pressure game it has been building toward all year.",
        reactions: [
          { emoji: "🔥", count: 44 },
          { emoji: "🏀", count: 18 },
        ],
      },
      {
        id: "det-2",
        user: "playoffchaos",
        flair: "Bracket nerd",
        time: "11m ago",
        text: "If Charlotte grabs the 8, this becomes the chaos corner of the East immediately.",
        reactions: [
          { emoji: "😳", count: 25 },
          { emoji: "🔥", count: 9 },
        ],
      },
    ],
    impactStat: "38% of saved East brackets swing if Detroit loses Game 1.",
  },
  {
    id: "east-r1-2",
    conference: "East",
    round: "Round 1",
    teamA: teamSlot("bos", 2),
    teamB: east7Placeholder,
    score: "0-0",
    status: "Tonight decides Boston's opponent",
    statusTone: "hot",
    cardNote: "Boston gets either a Maxey-led Sixers group or Paolo's Magic.",
    community: { teamA: 68, teamB: 32 },
    activeLabel: "Prime game tonight",
    fansDiscussing: "14.2K",
    preview:
      "The Celtics are in wait-and-scout mode while the East's 7-seed is decided tonight in Philadelphia.",
    schedule: [
      { label: "Game 1", date: "Sun, Apr 19", time: "10:00 AM PT", venue: "TD Garden" },
      { label: "Game 2", date: "Tue, Apr 21", time: "TBD", venue: "TD Garden" },
      { label: "Game 3", date: "Fri, Apr 24", time: "TBD", venue: "7-seed host arena" },
    ],
    friends: [
      {
        name: "Alex",
        side: "teamA",
        confidence: "Celtics in 6",
        note: "Thinks Boston's wing depth wins every margin quarter.",
      },
      {
        name: "Jordan",
        side: "teamB",
        confidence: "Sneaky upset",
        note: "Likes Orlando's size if the Magic clinch tonight.",
      },
    ],
    recentResults: [
      {
        label: "Sunday close",
        result: "Celtics 121, Nets 98",
        detail: "Boston coasted into the 2-seed with Tatum and Brown both under 32 minutes.",
      },
      {
        label: "Tonight's gatekeeper",
        result: "76ers vs Magic",
        detail: "Winner claims the East 7 line and opens in Boston on Sunday.",
      },
    ],
    playerPerformances: [
      { player: "Jayson Tatum", line: "34 pts, 8 reb", teamId: "bos" },
      { player: "Tyrese Maxey", line: "29 pts, 7 ast", teamId: "phi" },
      { player: "Paolo Banchero", line: "27 pts, 9 reb", teamId: "orl" },
    ],
    stakes: [
      "If Boston starts 2-0, 61% of community brackets hold their projected East finals.",
      "If Philly wins tonight, Maxey becomes the most-picked underdog star on the East side.",
      "If Orlando wins tonight, users are already forecasting a defense-first six-game grind.",
    ],
    comments: [
      {
        id: "bos-1",
        user: "greenline",
        flair: "Celtics fan",
        time: "2m ago",
        text: "I want the Sixers. Give me the loudest possible first-round environment.",
        reactions: [
          { emoji: "🔥", count: 61 },
          { emoji: "🏀", count: 22 },
        ],
      },
      {
        id: "bos-2",
        user: "midrangeclub",
        flair: "Magic believer",
        time: "15m ago",
        text: "Orlando's size is the only East 7/8 profile that makes Boston uncomfortable.",
        reactions: [
          { emoji: "😳", count: 28 },
          { emoji: "🏀", count: 12 },
        ],
      },
    ],
    impactStat: "Boston is the most-picked East finalist in 67% of user brackets.",
  },
  {
    id: "east-r1-3",
    conference: "East",
    round: "Round 1",
    teamA: teamSlot("nyk", 3),
    teamB: teamSlot("atl", 6),
    score: "0-0",
    status: "Locked series",
    statusTone: "locked",
    cardNote: "Brunson vs Trae is already the hottest thread in the app.",
    community: { teamA: 59, teamB: 41 },
    activeLabel: "Tips Saturday",
    fansDiscussing: "16.6K",
    preview:
      "New York gets a shot-creation war with Atlanta, and the social layer is already split on whether this reaches Game 7.",
    schedule: [
      { label: "Game 1", date: "Sat, Apr 18", time: "3:00 PM PT", venue: "Madison Square Garden" },
      { label: "Game 2", date: "Mon, Apr 20", time: "TBD", venue: "Madison Square Garden" },
      { label: "Game 3", date: "Thu, Apr 23", time: "TBD", venue: "State Farm Arena" },
      { label: "Game 4", date: "Sat, Apr 25", time: "TBD", venue: "State Farm Arena" },
    ],
    friends: [
      {
        name: "Alex",
        side: "teamA",
        confidence: "Knicks in 7",
        note: "Trusts New York's late-game shotmaking.",
      },
      {
        name: "Maya",
        side: "teamB",
        confidence: "Hawks in 6",
        note: "Likes Atlanta's pace and wing scoring.",
      },
      {
        name: "Reese",
        side: "teamA",
        confidence: "60 Coins",
        note: "Already wagered on Brunson in Game 1.",
      },
    ],
    recentResults: [
      {
        label: "Season finale",
        result: "Knicks 117, Bulls 109",
        detail: "Jalen Brunson tuned up with 28 and 9 entering the weekend.",
      },
      {
        label: "Sunday close",
        result: "Hawks 124, Bucks 116",
        detail: "Trae Young and Jalen Johnson combined for 55 as Atlanta locked the 6-seed.",
      },
    ],
    playerPerformances: [
      { player: "Jalen Brunson", line: "32 pts, 9 ast", teamId: "nyk" },
      { player: "Karl-Anthony Towns", line: "24 pts, 11 reb", teamId: "nyk" },
      { player: "Trae Young", line: "29 pts, 12 ast", teamId: "atl" },
    ],
    stakes: [
      "If New York protects home court, 59% of friend groups keep their East semifinal paths intact.",
      "If Atlanta steals Game 1, the app's most common upset path becomes live instantly.",
      "Thirty-four percent of user brackets already project this as the East's only first-round seven-gamer.",
    ],
    comments: [
      {
        id: "nyk-1",
        user: "bleacherbets",
        flair: "Knicks fan",
        time: "1m ago",
        text: "MSG is going to swallow this series whole if New York gets the first punch.",
        reactions: [
          { emoji: "🔥", count: 88 },
          { emoji: "🏀", count: 31 },
        ],
      },
      {
        id: "nyk-2",
        user: "iceTraeArchive",
        flair: "Hawks fan",
        time: "7m ago",
        text: "People are talking like Trae has not broken a New York crowd before.",
        reactions: [
          { emoji: "😳", count: 36 },
          { emoji: "🔥", count: 19 },
        ],
      },
    ],
    impactStat: "41% of all underdog series picks in the East are on Atlanta.",
  },
  {
    id: "east-r1-4",
    conference: "East",
    round: "Round 1",
    teamA: teamSlot("cle", 4),
    teamB: teamSlot("tor", 5),
    score: "0-0",
    status: "Locked series",
    statusTone: "locked",
    cardNote: "Cleveland-Toronto is the quiet coin-flip everyone is circling.",
    community: { teamA: 55, teamB: 45 },
    activeLabel: "Tips Saturday",
    fansDiscussing: "9.8K",
    preview:
      "The East's cleanest toss-up pits Cleveland's shot creation against Toronto's rangy, turnover-hunting wings.",
    schedule: [
      { label: "Game 1", date: "Sat, Apr 18", time: "10:00 AM PT", venue: "Rocket Arena" },
      { label: "Game 2", date: "Mon, Apr 20", time: "TBD", venue: "Rocket Arena" },
      { label: "Game 3", date: "Thu, Apr 23", time: "TBD", venue: "Scotiabank Arena" },
      { label: "Game 4", date: "Sat, Apr 25", time: "TBD", venue: "Scotiabank Arena" },
    ],
    friends: [
      {
        name: "Chris",
        side: "teamA",
        confidence: "Cavs in 7",
        note: "Leans Mitchell in clutch possessions.",
      },
      {
        name: "Sam",
        side: "teamB",
        confidence: "Raptors in 6",
        note: "Believes Toronto's length will win the possession battle.",
      },
    ],
    recentResults: [
      {
        label: "Final tune-up",
        result: "Cavaliers 113, Pacers 106",
        detail: "Mitchell scored 30 and Mobley closed with 10 fourth-quarter points.",
      },
      {
        label: "Final tune-up",
        result: "Raptors 119, 76ers 108",
        detail: "Scottie Barnes stuffed the box score with 24, 10 and 8.",
      },
    ],
    playerPerformances: [
      { player: "Donovan Mitchell", line: "30 pts, 6 ast", teamId: "cle" },
      { player: "Evan Mobley", line: "21 pts, 12 reb", teamId: "cle" },
      { player: "Scottie Barnes", line: "24 pts, 10 reb, 8 ast", teamId: "tor" },
    ],
    stakes: [
      "This is the East matchup with the smallest community spread and the biggest leaderboard leverage.",
      "If Toronto wins Game 1, 27% of perfect first-round entries vanish immediately.",
      "If Cleveland protects home court twice, most East semifinal projections stay balanced.",
    ],
    comments: [
      {
        id: "cle-1",
        user: "northsidefade",
        flair: "Raptors fan",
        time: "6m ago",
        text: "Toronto's wing length is exactly the kind of thing that can tilt a coin-flip series.",
        reactions: [
          { emoji: "🏀", count: 22 },
          { emoji: "🔥", count: 12 },
        ],
      },
      {
        id: "cle-2",
        user: "wineandgold",
        flair: "Cavs fan",
        time: "18m ago",
        text: "Mitchell is the closer in this matchup. That is the whole argument for me.",
        reactions: [
          { emoji: "🔥", count: 41 },
          { emoji: "😳", count: 7 },
        ],
      },
    ],
    impactStat: "This series carries the biggest leaderboard swing in the East first round.",
  },
  {
    id: "west-r1-1",
    conference: "West",
    round: "Round 1",
    teamA: teamSlot("okc", 1),
    teamB: west8Placeholder,
    score: "0-0",
    status: "Awaiting West 8 seed",
    statusTone: "watch",
    cardNote: "OKC waits on Friday while Suns, Clippers and Warriors fight for the final slot.",
    community: { teamA: 79, teamB: 21 },
    activeLabel: "Bracket opens Sunday",
    fansDiscussing: "10.1K",
    preview:
      "The Thunder's road to June starts against the winner of Friday's final West play-in knockout.",
    schedule: [
      { label: "Game 1", date: "Sun, Apr 19", time: "12:30 PM PT", venue: "Paycom Center" },
      { label: "Game 2", date: "Tue, Apr 21", time: "TBD", venue: "Paycom Center" },
      { label: "Game 3", date: "Fri, Apr 24", time: "TBD", venue: "West 8 host arena" },
    ],
    friends: [
      {
        name: "Jordan",
        side: "teamA",
        confidence: "Thunder sweep",
        note: "Thinks OKC's defense is too clean for the final play-in survivor.",
      },
      {
        name: "Dev",
        side: "teamB",
        confidence: "Warriors if they get in",
        note: "Only trusts Steph to turn this into a stress test.",
      },
    ],
    recentResults: [
      {
        label: "Sunday close",
        result: "Thunder 126, Jazz 101",
        detail: "SGA and Jalen Williams sat the fourth after OKC buried Utah early.",
      },
      {
        label: "Bracket watch",
        result: "Blazers 114, Suns 110",
        detail: "Phoenix slipped into Friday's final play-in game after Avdija's takeover.",
      },
    ],
    playerPerformances: [
      { player: "Shai Gilgeous-Alexander", line: "33 pts, 7 ast", teamId: "okc" },
      { player: "Jalen Williams", line: "24 pts, 6 reb, 5 ast", teamId: "okc" },
      { player: "Stephen Curry", line: "31 pts, 6 ast", teamId: "gsw" },
    ],
    stakes: [
      "Oklahoma City is the heaviest first-round favorite in the app right now.",
      "If the Warriors reach this line, watch rates for this side of the bracket jump by 23%.",
      "If the Clippers get through, users are immediately splitting on a defense-first upset path.",
    ],
    comments: [
      {
        id: "okc-1",
        user: "pacebender",
        flair: "Thunder fan",
        time: "5m ago",
        text: "This is exactly why the 1-seed matters. Let the rest of the West beat each other up first.",
        reactions: [
          { emoji: "🔥", count: 36 },
          { emoji: "🏀", count: 10 },
        ],
      },
      {
        id: "okc-2",
        user: "stephtruthers",
        flair: "Warriors fan",
        time: "13m ago",
        text: "Nobody wants to see Steph walk into the 8-line if Golden State survives tonight and Friday.",
        reactions: [
          { emoji: "😳", count: 33 },
          { emoji: "🔥", count: 21 },
        ],
      },
    ],
    impactStat: "OKC appears in 82% of saved West Finals picks.",
  },
  {
    id: "west-r1-2",
    conference: "West",
    round: "Round 1",
    teamA: teamSlot("sas", 2),
    teamB: teamSlot("por", 7),
    score: "0-0",
    status: "Locked series",
    statusTone: "hot",
    cardNote: "Portland clinched late Tuesday, and now Wemby gets Avdija in a fresh matchup.",
    community: { teamA: 63, teamB: 37 },
    activeLabel: "Series locked last night",
    fansDiscussing: "12.8K",
    preview:
      "The Spurs finally know their opponent after Portland's play-in rally, and the app is already treating this as the breakout-star series.",
    schedule: [
      { label: "Game 1", date: "Sun, Apr 19", time: "6:00 PM PT", venue: "Frost Bank Center" },
      { label: "Game 2", date: "Tue, Apr 21", time: "TBD", venue: "Frost Bank Center" },
      { label: "Game 3", date: "Fri, Apr 24", time: "TBD", venue: "Moda Center" },
      { label: "Game 4", date: "Sun, Apr 26", time: "TBD", venue: "Moda Center" },
    ],
    friends: [
      {
        name: "Maya",
        side: "teamA",
        confidence: "Spurs in 6",
        note: "Trusts San Antonio's size and halfcourt defense.",
      },
      {
        name: "Alex",
        side: "teamB",
        confidence: "Blazers in 7",
        note: "Believes Portland's confidence spike is real after Tuesday.",
      },
    ],
    recentResults: [
      {
        label: "Play-In clincher",
        result: "Trail Blazers 114, Suns 110",
        detail: "Deni Avdija dropped 41 and Portland stole the West's 7-seed.",
      },
      {
        label: "Sunday close",
        result: "Spurs 120, Pelicans 109",
        detail: "Victor Wembanyama closed the season with 29 points, 12 boards and 5 blocks.",
      },
    ],
    playerPerformances: [
      { player: "Deni Avdija", line: "41 pts, 12 ast", teamId: "por" },
      { player: "Victor Wembanyama", line: "29 pts, 12 reb, 5 blk", teamId: "sas" },
      { player: "De'Aaron Fox", line: "24 pts, 8 ast", teamId: "sas" },
    ],
    stakes: [
      "If Portland steals Game 1, the West bracket explodes because the 2-line is the most split path in friends groups.",
      "San Antonio is the second-most picked West finalist behind Oklahoma City.",
      "Portland already flipped thousands of saved brackets by taking the 7-seed Tuesday night.",
    ],
    comments: [
      {
        id: "sas-1",
        user: "wembywatch",
        flair: "Spurs fan",
        time: "4m ago",
        text: "This is exactly the kind of weird, physical series that tells us if San Antonio is really ready.",
        reactions: [
          { emoji: "🔥", count: 57 },
          { emoji: "🏀", count: 17 },
        ],
      },
      {
        id: "sas-2",
        user: "ripcityloop",
        flair: "Blazers fan",
        time: "9m ago",
        text: "Portland got here the hard way. That confidence matters in a young-series opener.",
        reactions: [
          { emoji: "🔥", count: 29 },
          { emoji: "😳", count: 14 },
        ],
      },
    ],
    impactStat: "Portland becoming the 7-seed flipped 19% of saved West brackets overnight.",
  },
  {
    id: "west-r1-3",
    conference: "West",
    round: "Round 1",
    teamA: teamSlot("den", 3),
    teamB: teamSlot("min", 6),
    score: "0-0",
    status: "Locked series",
    statusTone: "locked",
    cardNote: "Jokic and Ant meet again in a heavyweight first-round draw.",
    community: { teamA: 52, teamB: 48 },
    activeLabel: "Tips Saturday",
    fansDiscussing: "15.3K",
    preview:
      "The thinnest spread in the West belongs to Denver-Minnesota, and everyone is arguing pace, depth and late-game shot creation.",
    schedule: [
      { label: "Game 1", date: "Sat, Apr 18", time: "12:30 PM PT", venue: "Ball Arena" },
      { label: "Game 2", date: "Mon, Apr 20", time: "TBD", venue: "Ball Arena" },
      { label: "Game 3", date: "Thu, Apr 23", time: "TBD", venue: "Target Center" },
      { label: "Game 4", date: "Sat, Apr 25", time: "TBD", venue: "Target Center" },
    ],
    friends: [
      {
        name: "Jordan",
        side: "teamA",
        confidence: "Nuggets in 7",
        note: "Thinks Jokic game-mapping wins late.",
      },
      {
        name: "Sam",
        side: "teamB",
        confidence: "Wolves in 6",
        note: "Trusts Minnesota's perimeter pressure.",
      },
    ],
    recentResults: [
      {
        label: "Sunday close",
        result: "Nuggets 115, Grizzlies 103",
        detail: "Denver secured the 3-seed and kept its starters fresh.",
      },
      {
        label: "Sunday close",
        result: "Wolves 122, Kings 118",
        detail: "Anthony Edwards scored 37 in a pace-heavy tune-up.",
      },
    ],
    playerPerformances: [
      { player: "Nikola Jokic", line: "28 pts, 13 reb, 11 ast", teamId: "den" },
      { player: "Anthony Edwards", line: "37 pts, 6 reb", teamId: "min" },
      { player: "Jamal Murray", line: "24 pts, 8 ast", teamId: "den" },
    ],
    stakes: [
      "This is the most evenly split first-round matchup in the entire app.",
      "If Denver wins Game 1, users finally stop treating Minnesota as the popular upset side.",
      "If Minnesota takes home court, bracket leverage spikes for every contrarian West Finals path.",
    ],
    comments: [
      {
        id: "den-1",
        user: "elbowjumper",
        flair: "Neutral",
        time: "3m ago",
        text: "This feels like a conference semifinals series that got dropped into round one.",
        reactions: [
          { emoji: "🔥", count: 91 },
          { emoji: "🏀", count: 42 },
        ],
      },
      {
        id: "den-2",
        user: "wolvespack",
        flair: "Wolves fan",
        time: "16m ago",
        text: "Ant in a toss-up series is exactly why I never care what the seed line says.",
        reactions: [
          { emoji: "😳", count: 19 },
          { emoji: "🔥", count: 14 },
        ],
      },
    ],
    impactStat: "Only 4 percentage points separate Denver and Minnesota in community brackets.",
  },
  {
    id: "west-r1-4",
    conference: "West",
    round: "Round 1",
    teamA: teamSlot("lal", 4),
    teamB: teamSlot("hou", 5),
    score: "0-0",
    status: "Featured series",
    statusTone: "hot",
    cardNote: "Luka, LeBron and Houston's young core are driving the biggest playoff conversation in the app.",
    community: { teamA: 61, teamB: 39 },
    activeLabel: "Most-followed series",
    fansDiscussing: "18.9K",
    preview:
      "This is the app's social control center right now: stars, swagger, first-round volatility and nonstop Game 1 picks.",
    schedule: [
      { label: "Game 1", date: "Sat, Apr 18", time: "5:30 PM PT", venue: "Crypto.com Arena" },
      { label: "Game 2", date: "Mon, Apr 20", time: "TBD", venue: "Crypto.com Arena" },
      { label: "Game 3", date: "Thu, Apr 23", time: "TBD", venue: "Toyota Center" },
      { label: "Game 4", date: "Sat, Apr 25", time: "TBD", venue: "Toyota Center" },
    ],
    friends: [
      {
        name: "Alex",
        side: "teamA",
        confidence: "Lakers in 6",
        note: "Betting on Luka's halfcourt shotmaking.",
      },
      {
        name: "Maya",
        side: "teamB",
        confidence: "Rockets in 7",
        note: "Thinks Houston's energy swings the middle games.",
      },
      {
        name: "Jordan",
        side: "teamA",
        confidence: "220 Coins",
        note: "Already wagered on the Lakers to win Game 1.",
      },
    ],
    recentResults: [
      {
        label: "Sunday close",
        result: "Lakers 118, Suns 104",
        detail: "Doncic and James combined for 62 while LA closed on a 17-5 run.",
      },
      {
        label: "Sunday close",
        result: "Rockets 112, Mavericks 103",
        detail: "Alperen Sengun controlled the paint and Houston won the rebounding battle by 12.",
      },
    ],
    playerPerformances: [
      { player: "Luka Doncic", line: "34 pts, 10 ast", teamId: "lal" },
      { player: "LeBron James", line: "28 pts, 8 reb, 7 ast", teamId: "lal" },
      { player: "Alperen Sengun", line: "26 pts, 12 reb", teamId: "hou" },
      { player: "Amen Thompson", line: "18 pts, 9 reb, 4 stl", teamId: "hou" },
    ],
    stakes: [
      "If the Lakers win Game 1, 61% of saved West semifinal paths hold serve.",
      "If Houston steals Game 1, 42% of user brackets lose their projected West finalist immediately.",
      "This is the most wagered first-round matchup in the app by a wide margin.",
    ],
    comments: [
      {
        id: "lal-1",
        user: "baselinebanter",
        flair: "Lakers fan",
        time: "Just now",
        text: "Luka and LeBron owning the late possessions is exactly why I cannot fade LA in this spot.",
        reactions: [
          { emoji: "🔥", count: 112 },
          { emoji: "🏀", count: 47 },
        ],
      },
      {
        id: "lal-2",
        user: "rocketfuel",
        flair: "Rockets fan",
        time: "4m ago",
        text: "Houston is younger, deeper and way more comfortable turning this into a chaos possession game.",
        reactions: [
          { emoji: "😳", count: 55 },
          { emoji: "🔥", count: 33 },
        ],
      },
      {
        id: "lal-3",
        user: "seriesjunkie",
        flair: "Neutral",
        time: "9m ago",
        text: "This series is going 7. The app is not ready for those game threads.",
        reactions: [
          { emoji: "🔥", count: 78 },
          { emoji: "🏀", count: 28 },
        ],
      },
    ],
    impactStat: "42% of saved West champion paths are impacted by a Houston Game 1 win.",
  },
  {
    id: "east-sf-1",
    conference: "East",
    round: "Conference Semifinals",
    teamA: eastSemisTop,
    teamB: eastSemisBottom,
    score: "Awaiting winners",
    status: "Pathway preview",
    statusTone: "pending",
    cardNote: "Detroit's side meets Cleveland-Toronto on the upper East branch.",
    community: { teamA: 58, teamB: 42 },
    activeLabel: "Projected May 4",
    fansDiscussing: "5.2K",
    preview:
      "Fans are already mapping the upper East branch, with Detroit getting the edge over the Cavs-Raptors winner in early picks.",
    schedule: [
      { label: "Series window", date: "Mon, May 4", time: "TBD", venue: "Higher seed hosts" },
    ],
    friends: [
      {
        name: "Nina",
        side: "teamA",
        confidence: "Detroit side",
        note: "Trusts the top seed's depth.",
      },
      {
        name: "Chris",
        side: "teamB",
        confidence: "Cleveland/Toronto side",
        note: "Sees a more battle-tested group emerging.",
      },
    ],
    recentResults: [
      {
        label: "Upper branch trend",
        result: "Detroit side leads 58-42",
        detail: "Early semifinal simulations prefer the 1-seed path.",
      },
    ],
    playerPerformances: [
      { player: "Cade Cunningham", line: "Upper-bracket favorite", teamId: "det" },
      { player: "Donovan Mitchell", line: "Most-picked spoiler", teamId: "cle" },
    ],
    stakes: [
      "This branch decides whether the East goes chalk or opens a path for a 4- or 5-seed run.",
      "Upsets on this side create the biggest leaderboard separation in private pools.",
    ],
    comments: [
      {
        id: "esf-1",
        user: "roadtojune",
        flair: "Bracket watcher",
        time: "21m ago",
        text: "Upper East is where the app's safest bracket and most chaotic bracket split apart.",
        reactions: [
          { emoji: "🔥", count: 19 },
          { emoji: "🏀", count: 9 },
        ],
      },
    ],
    impactStat: "One upset here would flip the top of almost every East pool.",
  },
  {
    id: "east-sf-2",
    conference: "East",
    round: "Conference Semifinals",
    teamA: eastSemisMiddle,
    teamB: eastSemisLower,
    score: "Awaiting winners",
    status: "Pathway preview",
    statusTone: "pending",
    cardNote: "Boston's branch collides with Knicks-Hawks in the lower East.",
    community: { teamA: 62, teamB: 38 },
    activeLabel: "Projected May 5",
    fansDiscussing: "6.1K",
    preview:
      "Boston still owns this branch in bracket picks, but New York is the most common threat waiting below.",
    schedule: [
      { label: "Series window", date: "Tue, May 5", time: "TBD", venue: "Higher seed hosts" },
    ],
    friends: [
      {
        name: "Alex",
        side: "teamA",
        confidence: "Boston side",
        note: "Tatum path believer.",
      },
      {
        name: "Maya",
        side: "teamB",
        confidence: "Knicks side",
        note: "Believes MSG gets New York through round one.",
      },
    ],
    recentResults: [
      {
        label: "Lower branch trend",
        result: "Boston side leads 62-38",
        detail: "Community still leans chalk, but the Knicks carry the social buzz.",
      },
    ],
    playerPerformances: [
      { player: "Jayson Tatum", line: "Most-picked East star", teamId: "bos" },
      { player: "Jalen Brunson", line: "Most-picked lower-branch spoiler", teamId: "nyk" },
    ],
    stakes: [
      "If New York gets through Atlanta, this becomes the loudest semifinal forecast in the East.",
      "A Magic or Sixers shocker against Boston would rewrite almost every East finals prediction.",
    ],
    comments: [
      {
        id: "esf-2",
        user: "seedmath",
        flair: "Pool commissioner",
        time: "33m ago",
        text: "Every friend group I am in is basically Boston path vs Knicks path on this branch.",
        reactions: [
          { emoji: "🏀", count: 14 },
          { emoji: "🔥", count: 11 },
        ],
      },
    ],
    impactStat: "New York is the single biggest East semifinal spoiler pick.",
  },
  {
    id: "west-sf-1",
    conference: "West",
    round: "Conference Semifinals",
    teamA: westSemisTop,
    teamB: westSemisBottom,
    score: "Awaiting winners",
    status: "Pathway preview",
    statusTone: "pending",
    cardNote: "OKC's branch could crash directly into Lakers-Rockets.",
    community: { teamA: 56, teamB: 44 },
    activeLabel: "Projected May 4",
    fansDiscussing: "8.3K",
    preview:
      "This is the branch fans keep screen-shotting: the 1-seed route potentially colliding with the app's most-followed first-round series.",
    schedule: [
      { label: "Series window", date: "Mon, May 4", time: "TBD", venue: "Higher seed hosts" },
    ],
    friends: [
      {
        name: "Jordan",
        side: "teamA",
        confidence: "OKC side",
        note: "Believes the Thunder have the cleanest West path.",
      },
      {
        name: "Reese",
        side: "teamB",
        confidence: "Lakers/Rockets side",
        note: "Likes the battle-tested star talent.",
      },
    ],
    recentResults: [
      {
        label: "Simulation trend",
        result: "OKC side leads 56-44",
        detail: "But that edge shrinks if the Lakers handle Houston quickly.",
      },
    ],
    playerPerformances: [
      { player: "Shai Gilgeous-Alexander", line: "West path anchor", teamId: "okc" },
      { player: "Luka Doncic", line: "Most-picked semifinal disruptor", teamId: "lal" },
    ],
    stakes: [
      "This is the branch where social chatter and bracket leverage overlap the most.",
      "An early Lakers surge immediately pressures every Thunder-to-Finals pick.",
    ],
    comments: [
      {
        id: "wsf-1",
        user: "playoffpulse",
        flair: "Neutral",
        time: "17m ago",
        text: "Thunder vs Lakers is already being treated like a future series before round one even starts.",
        reactions: [
          { emoji: "🔥", count: 47 },
          { emoji: "😳", count: 15 },
        ],
      },
    ],
    impactStat: "This branch drives the highest save rate in bracket screenshots.",
  },
  {
    id: "west-sf-2",
    conference: "West",
    round: "Conference Semifinals",
    teamA: westSemisMiddle,
    teamB: westSemisLower,
    score: "Awaiting winners",
    status: "Pathway preview",
    statusTone: "pending",
    cardNote: "Spurs-Blazers and Nuggets-Wolves feed the grindhouse side of the West.",
    community: { teamA: 47, teamB: 53 },
    activeLabel: "Projected May 5",
    fansDiscussing: "7.7K",
    preview:
      "The lower West branch is the toughest to call, with Denver-Minnesota slightly outweighing San Antonio-Portland in early picks.",
    schedule: [
      { label: "Series window", date: "Tue, May 5", time: "TBD", venue: "Higher seed hosts" },
    ],
    friends: [
      {
        name: "Maya",
        side: "teamB",
        confidence: "Nuggets/Wolves side",
        note: "Thinks that series creates the battle-tested semifinal team.",
      },
      {
        name: "Dev",
        side: "teamA",
        confidence: "Spurs/Blazers side",
        note: "Believes Wemby swings the matchup map.",
      },
    ],
    recentResults: [
      {
        label: "Simulation trend",
        result: "Nuggets-Wolves side leads 53-47",
        detail: "Community expects the first round winner there to come in sharper.",
      },
    ],
    playerPerformances: [
      { player: "Victor Wembanyama", line: "Most-watched young star", teamId: "sas" },
      { player: "Nikola Jokic", line: "Most-trusted closer", teamId: "den" },
    ],
    stakes: [
      "This is the branch with the least consensus in the West.",
      "A Portland or Minnesota run here creates the biggest pool separation behind Houston.",
    ],
    comments: [
      {
        id: "wsf-2",
        user: "hoopsatlas",
        flair: "Bracket nerd",
        time: "29m ago",
        text: "Lower West is where the real bracket leverage lives. Nobody agrees on anything there.",
        reactions: [
          { emoji: "🏀", count: 21 },
          { emoji: "🔥", count: 17 },
        ],
      },
    ],
    impactStat: "No other future round is this evenly divided in community picks.",
  },
  {
    id: "east-finals",
    conference: "East",
    round: "Conference Finals",
    teamA: eastFinalsTop,
    teamB: eastFinalsBottom,
    score: "Awaiting winners",
    status: "Pathway preview",
    statusTone: "pending",
    cardNote: "Detroit and Boston still own the highest East Finals share, but New York keeps rising.",
    community: { teamA: 49, teamB: 51 },
    activeLabel: "Projected May 19",
    fansDiscussing: "9.1K",
    preview:
      "The East Finals market is almost dead even, with the top and bottom halves of the conference separated by only a few points.",
    schedule: [
      { label: "Series window", date: "Tue, May 19", time: "TBD", venue: "Higher seed hosts" },
    ],
    friends: [
      {
        name: "Alex",
        side: "teamB",
        confidence: "Bottom half",
        note: "Thinks Boston or New York comes through.",
      },
      {
        name: "Nina",
        side: "teamA",
        confidence: "Top half",
        note: "Still riding Detroit's regular-season authority.",
      },
    ],
    recentResults: [
      {
        label: "Conference trend",
        result: "Bottom half leads 51-49",
        detail: "Boston and New York volume barely edge Detroit's side in early forecasts.",
      },
    ],
    playerPerformances: [
      { player: "Jayson Tatum", line: "Most-picked East Finals MVP", teamId: "bos" },
      { player: "Cade Cunningham", line: "Fastest-rising East pick", teamId: "det" },
    ],
    stakes: [
      "This is where the app's East narratives meet: Boston's standard, Detroit's rise, New York's noise.",
      "The conference leaderboards tighten here because the favorites are nearly even.",
    ],
    comments: [
      {
        id: "ecf-1",
        user: "storylineszn",
        flair: "Neutral",
        time: "42m ago",
        text: "East Finals is basically old power vs new power, and that is why this bracket side feels so alive.",
        reactions: [
          { emoji: "🔥", count: 30 },
          { emoji: "🏀", count: 12 },
        ],
      },
    ],
    impactStat: "The East half of the bracket is almost perfectly split in finals projections.",
  },
  {
    id: "west-finals",
    conference: "West",
    round: "Conference Finals",
    teamA: westFinalsTop,
    teamB: westFinalsBottom,
    score: "Awaiting winners",
    status: "Pathway preview",
    statusTone: "pending",
    cardNote: "One branch has OKC-Lakers energy; the other has Spurs-Nuggets danger.",
    community: { teamA: 54, teamB: 46 },
    activeLabel: "Projected May 20",
    fansDiscussing: "11.2K",
    preview:
      "Fans slightly prefer the upper West branch to reach the conference finals, but the lower branch holds more contrarian value.",
    schedule: [
      { label: "Series window", date: "Wed, May 20", time: "TBD", venue: "Higher seed hosts" },
    ],
    friends: [
      {
        name: "Jordan",
        side: "teamA",
        confidence: "Upper West",
        note: "Believes a Thunder or Lakers path survives the gauntlet.",
      },
      {
        name: "Maya",
        side: "teamB",
        confidence: "Lower West",
        note: "Sees value in Denver or San Antonio's two-way balance.",
      },
    ],
    recentResults: [
      {
        label: "Conference trend",
        result: "Upper branch leads 54-46",
        detail: "But the lower branch is more common among top leaderboard players.",
      },
    ],
    playerPerformances: [
      { player: "Shai Gilgeous-Alexander", line: "Most-picked West Finals star", teamId: "okc" },
      { player: "Nikola Jokic", line: "Highest-confidence contrarian pick", teamId: "den" },
    ],
    stakes: [
      "The West title path is where leaderboard leaders are already separating from the crowd.",
      "A lower-branch finalist creates more upset value than anywhere else in the bracket.",
    ],
    comments: [
      {
        id: "wcf-1",
        user: "westcoastbias",
        flair: "Neutral",
        time: "38m ago",
        text: "The upper West is louder, but the lower West is way scarier if you care about surviving a full bracket pool.",
        reactions: [
          { emoji: "😳", count: 17 },
          { emoji: "🔥", count: 14 },
        ],
      },
    ],
    impactStat: "This round produces the biggest difference between casual picks and leaderboard leaders.",
  },
  {
    id: "nba-finals",
    conference: "League",
    round: "NBA Finals",
    teamA: finalsEast,
    teamB: finalsWest,
    score: "Awaiting finalists",
    status: "Championship preview",
    statusTone: "pending",
    cardNote: "The last card in the bracket stays saved, shared and argued over more than any other.",
    community: { teamA: 46, teamB: 54 },
    activeLabel: "Projected June 3",
    fansDiscussing: "20.4K",
    preview:
      "Across the app, the West still owns a slight Finals edge, but the East has more variety in who gets there.",
    schedule: [
      { label: "Game 1", date: "Wed, Jun 3", time: "5:30 PM PT", venue: "Higher remaining seed hosts" },
    ],
    friends: [
      {
        name: "Alex",
        side: "teamB",
        confidence: "West champ",
        note: "Still trusts the West star power.",
      },
      {
        name: "Nina",
        side: "teamA",
        confidence: "East champ",
        note: "Believes the East winner arrives fresher.",
      },
    ],
    recentResults: [
      {
        label: "Championship trend",
        result: "West champion leads 54-46",
        detail: "But no single team owns a majority of title picks.",
      },
    ],
    playerPerformances: [
      { player: "Jayson Tatum", line: "Top East title pick", teamId: "bos" },
      { player: "Shai Gilgeous-Alexander", line: "Top overall Finals MVP pick", teamId: "okc" },
    ],
    stakes: [
      "This is the save point for the whole feature: predictions, wagers, comments and friend bragging all end here.",
      "The championship card has the highest re-open rate in the product because users keep checking their path.",
    ],
    comments: [
      {
        id: "fin-1",
        user: "finalsforecast",
        flair: "Commissioner",
        time: "55m ago",
        text: "Every pool ends up here, which is exactly why the bracket works best as the main nav for the postseason.",
        reactions: [
          { emoji: "🔥", count: 63 },
          { emoji: "🏀", count: 28 },
        ],
      },
    ],
    impactStat: "The Finals card gets reopened 3.4x more than any other future round card.",
  },
];

export const seriesById = Object.fromEntries(
  prototypeSeries.map((series) => [series.id, series]),
) as Record<string, PrototypeSeries>;

export const roundSections = [
  {
    title: "Round 1",
    description: "Every current first-round matchup plus the play-in placeholders that still shape the bracket.",
    seriesIds: [
      "east-r1-1",
      "east-r1-2",
      "east-r1-3",
      "east-r1-4",
      "west-r1-1",
      "west-r1-2",
      "west-r1-3",
      "west-r1-4",
    ],
  },
  {
    title: "Conference Semifinals",
    description: "Pathway cards show where winners flow next and how the community is leaning already.",
    seriesIds: ["east-sf-1", "east-sf-2", "west-sf-1", "west-sf-2"],
  },
  {
    title: "Conference Finals",
    description: "These are the branch summaries users keep revisiting as soon as round one starts to tilt.",
    seriesIds: ["east-finals", "west-finals"],
  },
  {
    title: "NBA Finals",
    description: "The championship route stays visible the whole time, so users can trace every upset back to June.",
    seriesIds: ["nba-finals"],
  },
] as const;

export const upcomingGames: PrototypeUpcomingGame[] = [
  {
    id: "upcoming-1",
    label: "Tonight",
    matchup: "Magic at 76ers",
    window: "Wed, Apr 15 · 4:30 PM PT",
    note: "Winner becomes Boston's 7-seed opponent.",
    impact: "Boston branch locks the moment this final sounds.",
  },
  {
    id: "upcoming-2",
    label: "Tonight",
    matchup: "Warriors at Clippers",
    window: "Wed, Apr 15 · 7:00 PM PT",
    note: "Winner advances to Friday for the West 8 line.",
    impact: "OKC's path sharpens, and Suns fans learn the final challenger.",
  },
  {
    id: "upcoming-3",
    label: "Saturday opener",
    matchup: "Raptors at Cavaliers",
    window: "Sat, Apr 18 · 10:00 AM PT",
    note: "East's cleanest toss-up starts the weekend.",
    impact: "Early leverage game for leaderboard separation.",
  },
  {
    id: "upcoming-4",
    label: "Saturday spotlight",
    matchup: "Rockets at Lakers",
    window: "Sat, Apr 18 · 5:30 PM PT",
    note: "The app's most-followed series tips in prime time.",
    impact: "Game 1 touches 42% of saved West finalist paths.",
  },
];

export const communityActivity: PrototypeActivityItem[] = [
  {
    id: "activity-1",
    user: "Alex",
    action: "predicted",
    detail: "Knicks in 7",
    tone: "prediction",
    time: "2m ago",
    seriesId: "east-r1-3",
  },
  {
    id: "activity-2",
    user: "Jordan",
    action: "commented on",
    detail: "Celtics vs East 7 Seed",
    tone: "comment",
    time: "6m ago",
    seriesId: "east-r1-2",
  },
  {
    id: "activity-3",
    user: "Maya",
    action: "wagered 180 Coins on",
    detail: "Rockets Game 1 upset",
    tone: "wager",
    time: "9m ago",
    seriesId: "west-r1-4",
  },
  {
    id: "activity-4",
    user: "Chris",
    action: "saved",
    detail: "a Portland-in-7 bracket path",
    tone: "prediction",
    time: "14m ago",
    seriesId: "west-r1-2",
  },
];

export const leaderboard: PrototypeLeaderboardEntry[] = [
  {
    id: "alex",
    rank: 1,
    username: "Alex",
    points: 112,
    correctPicks: 14,
    recentAccuracy: "86%",
    trend: "+12 today",
    favoriteCall: "Knicks in 7",
    bracketPreview: [
      {
        id: "alex-1",
        round: "Seed call",
        matchup: "Spurs' 7-seed opponent",
        pick: "Trail Blazers",
        status: "correct",
        note: "Portland clinched the 7-line on Tuesday night.",
      },
      {
        id: "alex-2",
        round: "Seed call",
        matchup: "Heat stay alive",
        pick: "Miami",
        status: "incorrect",
        note: "Charlotte eliminated the Heat in overtime.",
      },
      {
        id: "alex-3",
        round: "Round 1",
        matchup: "Knicks vs Hawks",
        pick: "Knicks in 7",
        status: "pending",
        note: "Heaviest confidence call on Alex's board.",
      },
      {
        id: "alex-4",
        round: "Round 1",
        matchup: "Lakers vs Rockets",
        pick: "Lakers in 6",
        status: "pending",
        note: "Banking on late-game shotmaking.",
      },
      {
        id: "alex-5",
        round: "NBA Finals",
        matchup: "Champion",
        pick: "Thunder over Knicks",
        status: "pending",
        note: "Alex stayed chalk up top and bold in the East.",
      },
    ],
  },
  {
    id: "jordan",
    rank: 2,
    username: "Jordan",
    points: 108,
    correctPicks: 13,
    recentAccuracy: "81%",
    trend: "+8 today",
    favoriteCall: "Magic give Boston trouble",
    bracketPreview: [
      {
        id: "jordan-1",
        round: "Seed call",
        matchup: "Spurs' 7-seed opponent",
        pick: "Suns",
        status: "incorrect",
        note: "Phoenix dropped into Friday's final play-in game.",
      },
      {
        id: "jordan-2",
        round: "Seed call",
        matchup: "Hornets stay alive",
        pick: "Charlotte",
        status: "correct",
        note: "Charlotte beat Miami and extended its season.",
      },
      {
        id: "jordan-3",
        round: "Round 1",
        matchup: "Celtics vs East 7",
        pick: "Magic in 7",
        status: "pending",
        note: "Leaning all the way into the Orlando defense theory.",
      },
      {
        id: "jordan-4",
        round: "Round 1",
        matchup: "Nuggets vs Wolves",
        pick: "Nuggets in 7",
        status: "pending",
        note: "Sticking with Jokic in a coin flip.",
      },
      {
        id: "jordan-5",
        round: "NBA Finals",
        matchup: "Champion",
        pick: "Celtics over Thunder",
        status: "pending",
        note: "Still trusts the proven title infrastructure.",
      },
    ],
  },
  {
    id: "maya",
    rank: 3,
    username: "Maya",
    points: 102,
    correctPicks: 12,
    recentAccuracy: "79%",
    trend: "+6 today",
    favoriteCall: "Rockets in 7",
    bracketPreview: [
      {
        id: "maya-1",
        round: "Seed call",
        matchup: "Hornets stay alive",
        pick: "Charlotte",
        status: "correct",
        note: "Needed the Hornets for her East upset tree.",
      },
      {
        id: "maya-2",
        round: "Seed call",
        matchup: "Spurs' 7-seed opponent",
        pick: "Trail Blazers",
        status: "correct",
        note: "Avdija's explosion kept Maya's West tree alive.",
      },
      {
        id: "maya-3",
        round: "Round 1",
        matchup: "Lakers vs Rockets",
        pick: "Rockets in 7",
        status: "pending",
        note: "Favorite contrarian series in the whole bracket.",
      },
      {
        id: "maya-4",
        round: "Round 1",
        matchup: "Knicks vs Hawks",
        pick: "Hawks in 6",
        status: "pending",
        note: "Trae shotmaking plus Atlanta pace.",
      },
      {
        id: "maya-5",
        round: "NBA Finals",
        matchup: "Champion",
        pick: "Rockets over Celtics",
        status: "pending",
        note: "High-variance title swing for leaderboard upside.",
      },
    ],
  },
  {
    id: "reese",
    rank: 4,
    username: "Reese",
    points: 96,
    correctPicks: 11,
    recentAccuracy: "74%",
    trend: "+4 today",
    favoriteCall: "Spurs over Blazers in 6",
    bracketPreview: [
      {
        id: "reese-1",
        round: "Seed call",
        matchup: "Spurs' 7-seed opponent",
        pick: "Trail Blazers",
        status: "correct",
        note: "Hit the toughest West seed call of the day.",
      },
      {
        id: "reese-2",
        round: "Round 1",
        matchup: "Spurs vs Trail Blazers",
        pick: "Spurs in 6",
        status: "pending",
        note: "Thinks San Antonio wears Portland down.",
      },
      {
        id: "reese-3",
        round: "Round 1",
        matchup: "Cavs vs Raptors",
        pick: "Cavaliers in 7",
        status: "pending",
        note: "Playing for the closer advantage.",
      },
    ],
  },
];

export const prototypeData = {
  seasonLabel: "2025-26 NBA Playoffs",
  asOfLabel: "Current as of Wednesday, April 15, 2026",
  home: {
    featuredSeriesId: "west-r1-4",
    heroTitle: "The bracket is the control center now.",
    heroCopy:
      "Track every series, make picks, wager Coins, follow friend brackets and jump into the loudest playoff threads from one map.",
  },
  user: {
    name: "You",
    coins: 1280,
    rank: 27,
    accuracy: "78%",
    streak: "4 straight bracket calls",
  },
  series: prototypeSeries,
  leaderboard,
  upcomingGames,
  communityActivity,
};

export const primaryTabs = [
  { id: "home", label: "Home" },
  { id: "bracket", label: "Bracket" },
  { id: "leaderboard", label: "Leaderboard" },
] as const;
