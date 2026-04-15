import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSeededResultsState, DEFAULT_TIEBREAKER_QUESTION } from "./data";
import { mergeLiveGamesIntoResults, sanitizeEntryPicks, scoreEntry } from "./engine";
import { fetchOfficialLiveScoreboard } from "./live-scoreboard";
import {
  AppBootstrapResponse,
  BracketEntry,
  ClientProfile,
  MatchupPick,
  Pool,
  ResultsState,
} from "./types";

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const sharedStateId = 1;

const poolInclude = {
  createdBy: true,
  participants: {
    include: {
      participant: true,
    },
  },
  entries: {
    orderBy: [
      { submittedAt: "desc" },
      { createdAt: "asc" },
    ],
  },
} satisfies Prisma.PoolInclude;

type PoolRecord = Prisma.PoolGetPayload<{
  include: typeof poolInclude;
}>;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);

const parsePicks = (value: string): Record<string, MatchupPick> => {
  try {
    return JSON.parse(value) as Record<string, MatchupPick>;
  } catch {
    return {};
  }
};

const serializePicks = (value: Record<string, MatchupPick>) =>
  JSON.stringify(value);

const toEntryShape = (
  entry: PoolRecord["entries"][number],
  canEdit: boolean,
): BracketEntry => ({
  id: entry.id,
  participantId: entry.participantId,
  displayName: entry.displayName,
  name: entry.entryName,
  picks: parsePicks(entry.picksJson),
  tiebreakerGuess: entry.finalsTiebreaker ?? undefined,
  submittedAt: entry.submittedAt?.toISOString(),
  createdAt: entry.createdAt.toISOString(),
  updatedAt: entry.updatedAt.toISOString(),
  score: entry.score,
  correctWinners: entry.correctWinners,
  exactLengths: entry.exactLengths,
  pending: entry.pending,
  canEdit,
});

const visibleEntriesForParticipant = (
  pool: PoolRecord,
  participantId?: string,
) => {
  const locked = Date.now() >= new Date(pool.lockTime).getTime();

  return pool.entries
    .filter((entry) => entry.submittedAt || entry.participantId === participantId)
    .map((entry) =>
      toEntryShape(entry, entry.participantId === participantId && !locked),
    );
};

const toPoolShape = (pool: PoolRecord, participantId?: string): Pool => ({
  id: pool.id,
  name: pool.name,
  description: pool.description ?? undefined,
  inviteCode: pool.inviteCode,
  lockAt: pool.lockTime.toISOString(),
  tiebreakerQuestion: pool.tiebreakerQuestion,
  createdAt: pool.createdAt.toISOString(),
  createdBy: pool.createdBy?.displayName,
  participantCount: pool.participants.length,
  joined: pool.participants.some(
    (membership) => membership.participantId === participantId,
  ),
  entries: visibleEntriesForParticipant(pool, participantId),
});

const createClientProfile = (
  clientId: string,
  participant?: {
    id: string;
    displayName: string;
  } | null,
): ClientProfile => ({
  clientId,
  participantId: participant?.id,
  displayName: participant?.displayName,
});

const validateClientId = (clientId?: string) => {
  if (!clientId?.trim()) {
    throw new HttpError(400, "A client id is required.");
  }
};

const validateDisplayName = (displayName?: string) => {
  if (!displayName?.trim()) {
    throw new HttpError(400, "A display name is required.");
  }
};

const validateEntryName = (entryName?: string) => {
  if (!entryName?.trim()) {
    throw new HttpError(400, "An entry name is required.");
  }
};

const validatePoolName = (poolName?: string) => {
  if (!poolName?.trim()) {
    throw new HttpError(400, "A pool name is required.");
  }
};

const normalizeInviteCode = (inviteCode?: string) =>
  inviteCode
    ?.toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

const parseResults = (resultsJson: string): ResultsState => {
  try {
    return JSON.parse(resultsJson) as ResultsState;
  } catch {
    return createSeededResultsState();
  }
};

async function ensureSharedState() {
  return prisma.sharedState.upsert({
    where: { id: sharedStateId },
    update: {},
    create: {
      id: sharedStateId,
      resultsJson: JSON.stringify(createSeededResultsState()),
    },
  });
}

export async function getSharedResults(): Promise<ResultsState> {
  const sharedState = await ensureSharedState();
  return parseResults(sharedState.resultsJson);
}

async function saveSharedResults(results: ResultsState) {
  await prisma.sharedState.upsert({
    where: { id: sharedStateId },
    update: {
      resultsJson: JSON.stringify(results),
    },
    create: {
      id: sharedStateId,
      resultsJson: JSON.stringify(results),
    },
  });
}

async function upsertParticipant(input: {
  clientId: string;
  displayName: string;
}) {
  return prisma.participant.upsert({
    where: {
      clientId: input.clientId,
    },
    update: {
      displayName: input.displayName.trim(),
    },
    create: {
      clientId: input.clientId,
      displayName: input.displayName.trim(),
    },
  });
}

async function resolveInviteCode(poolName: string, inviteCode?: string) {
  const requested = normalizeInviteCode(inviteCode);

  if (requested) {
    const existing = await prisma.pool.findUnique({
      where: { inviteCode: requested },
      select: { id: true },
    });

    if (existing) {
      throw new HttpError(409, "That invite code is already taken.");
    }

    return requested;
  }

  const base = slugify(poolName) || "playoff-pool";

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate =
      attempt === 0
        ? base
        : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const existing = await prisma.pool.findUnique({
      where: { inviteCode: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new HttpError(500, "Unable to generate a unique invite code.");
}

async function recomputeEntryStats(entryId: string, results: ResultsState) {
  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
  });

  if (!entry) {
    throw new HttpError(404, "Entry not found.");
  }

  const scored = scoreEntry(
    {
      id: entry.id,
      participantId: entry.participantId,
      displayName: entry.displayName,
      name: entry.entryName,
      picks: parsePicks(entry.picksJson),
      tiebreakerGuess: entry.finalsTiebreaker ?? undefined,
      submittedAt: entry.submittedAt?.toISOString(),
    },
    results,
  );

  await prisma.entry.update({
    where: { id: entryId },
    data: {
      score: scored.totalPoints,
      correctWinners: scored.correctWinners,
      exactLengths: scored.exactLengths,
      pending: scored.pending,
    },
  });
}

async function recomputeAllEntryStats(results: ResultsState) {
  const entries = await prisma.entry.findMany({
    select: { id: true },
  });

  for (const entry of entries) {
    await recomputeEntryStats(entry.id, results);
  }
}

async function getPoolRecord(poolId: string) {
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: poolInclude,
  });

  if (!pool) {
    throw new HttpError(404, "Pool not found.");
  }

  return pool;
}

async function getPoolByInviteCode(inviteCode: string) {
  const pool = await prisma.pool.findUnique({
    where: { inviteCode: inviteCode.toLowerCase() },
    include: poolInclude,
  });

  if (!pool) {
    throw new HttpError(404, "Pool not found.");
  }

  return pool;
}

function assertPoolOpen(lockTime: Date) {
  if (Date.now() >= lockTime.getTime()) {
    throw new HttpError(409, "This pool is locked.");
  }
}

async function assertMembership(poolId: string, participantId: string) {
  const membership = await prisma.poolParticipant.findUnique({
    where: {
      poolId_participantId: {
        poolId,
        participantId,
      },
    },
  });

  if (!membership) {
    throw new HttpError(403, "You need to join this pool first.");
  }
}

export async function getAppBootstrap(input: {
  clientId: string;
  inviteCode?: string | null;
}): Promise<AppBootstrapResponse> {
  validateClientId(input.clientId);

  const [results, participant] = await Promise.all([
    getSharedResults(),
    prisma.participant.findUnique({
      where: { clientId: input.clientId },
      select: { id: true, displayName: true },
    }),
  ]);

  const joinedPools = participant
    ? await prisma.pool.findMany({
        where: {
          participants: {
            some: {
              participantId: participant.id,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        include: poolInclude,
      })
    : [];

  const invitePool =
    input.inviteCode && normalizeInviteCode(input.inviteCode)
      ? await prisma.pool.findUnique({
          where: {
            inviteCode: normalizeInviteCode(input.inviteCode)!,
          },
          include: poolInclude,
        })
      : null;

  return {
    participant: createClientProfile(input.clientId, participant),
    pools: joinedPools.map((pool) => toPoolShape(pool, participant?.id)),
    results,
    invitePool:
      invitePool && !joinedPools.some((pool) => pool.id === invitePool.id)
        ? toPoolShape(invitePool, participant?.id)
        : null,
  };
}

export async function createPoolWithInitialEntry(input: {
  clientId: string;
  displayName: string;
  poolName: string;
  description?: string;
  lockAt: string;
  inviteCode?: string;
  initialEntryName: string;
  finalsTiebreaker?: number;
}) {
  validateClientId(input.clientId);
  validateDisplayName(input.displayName);
  validatePoolName(input.poolName);
  validateEntryName(input.initialEntryName);

  const lockTime = new Date(input.lockAt);

  if (Number.isNaN(lockTime.getTime())) {
    throw new HttpError(400, "A valid lock time is required.");
  }

  const results = await getSharedResults();
  const participant = await upsertParticipant({
    clientId: input.clientId,
    displayName: input.displayName,
  });
  const inviteCode = await resolveInviteCode(input.poolName, input.inviteCode);

  const created = await prisma.$transaction(async (tx) => {
    const pool = await tx.pool.create({
      data: {
        name: input.poolName.trim(),
        description: input.description?.trim() || null,
        inviteCode,
        tiebreakerQuestion: DEFAULT_TIEBREAKER_QUESTION,
        lockTime,
        createdById: participant.id,
      },
    });

    await tx.poolParticipant.create({
      data: {
        poolId: pool.id,
        participantId: participant.id,
      },
    });

    const entry = await tx.entry.create({
      data: {
        poolId: pool.id,
        participantId: participant.id,
        displayName: participant.displayName,
        entryName: input.initialEntryName.trim(),
        finalsTiebreaker: input.finalsTiebreaker,
      },
    });

    return {
      poolId: pool.id,
      entryId: entry.id,
    };
  });

  await recomputeEntryStats(created.entryId, results);
  return created;
}

export async function joinPoolWithInitialEntry(input: {
  clientId: string;
  displayName: string;
  inviteCode: string;
  initialEntryName?: string;
  finalsTiebreaker?: number;
}) {
  validateClientId(input.clientId);
  validateDisplayName(input.displayName);

  const normalizedInviteCode = normalizeInviteCode(input.inviteCode);

  if (!normalizedInviteCode) {
    throw new HttpError(400, "A valid invite code is required.");
  }

  const results = await getSharedResults();
  const pool = await getPoolByInviteCode(normalizedInviteCode);
  const participant = await upsertParticipant({
    clientId: input.clientId,
    displayName: input.displayName,
  });

  let createdEntryId: string | undefined;

  await prisma.$transaction(async (tx) => {
    await tx.poolParticipant.upsert({
      where: {
        poolId_participantId: {
          poolId: pool.id,
          participantId: participant.id,
        },
      },
      update: {},
      create: {
        poolId: pool.id,
        participantId: participant.id,
      },
    });

    if (input.initialEntryName?.trim() && Date.now() < pool.lockTime.getTime()) {
      const entry = await tx.entry.create({
        data: {
          poolId: pool.id,
          participantId: participant.id,
          displayName: participant.displayName,
          entryName: input.initialEntryName.trim(),
          finalsTiebreaker: input.finalsTiebreaker,
        },
      });

      createdEntryId = entry.id;
    }
  });

  if (createdEntryId) {
    await recomputeEntryStats(createdEntryId, results);
  }

  return {
    poolId: pool.id,
    entryId: createdEntryId,
    locked: Date.now() >= pool.lockTime.getTime(),
  };
}

export async function createEntryInPool(input: {
  clientId: string;
  poolId: string;
  entryName: string;
  finalsTiebreaker?: number;
}) {
  validateClientId(input.clientId);
  validateEntryName(input.entryName);

  const participant = await prisma.participant.findUnique({
    where: { clientId: input.clientId },
  });

  if (!participant) {
    throw new HttpError(403, "Join the pool before creating an entry.");
  }

  const pool = await getPoolRecord(input.poolId);
  await assertMembership(pool.id, participant.id);
  assertPoolOpen(pool.lockTime);
  const results = await getSharedResults();

  const entry = await prisma.entry.create({
    data: {
      poolId: pool.id,
      participantId: participant.id,
      displayName: participant.displayName,
      entryName: input.entryName.trim(),
      finalsTiebreaker: input.finalsTiebreaker,
    },
  });

  await recomputeEntryStats(entry.id, results);
  return {
    poolId: pool.id,
    entryId: entry.id,
  };
}

export async function updateEntry(input: {
  clientId: string;
  entryId: string;
  name?: string;
  tiebreakerGuess?: number | null;
  picks?: Record<string, MatchupPick>;
  submit?: boolean;
}) {
  validateClientId(input.clientId);

  const entry = await prisma.entry.findUnique({
    where: { id: input.entryId },
    include: {
      participant: true,
      pool: true,
    },
  });

  if (!entry) {
    throw new HttpError(404, "Entry not found.");
  }

  if (entry.participant.clientId !== input.clientId) {
    throw new HttpError(403, "You can only edit your own entries.");
  }

  assertPoolOpen(entry.pool.lockTime);

  const results = await getSharedResults();
  const currentEntry: BracketEntry = {
    id: entry.id,
    participantId: entry.participantId,
    displayName: entry.displayName,
    name: entry.entryName,
    picks: parsePicks(entry.picksJson),
    tiebreakerGuess: entry.finalsTiebreaker ?? undefined,
    submittedAt: entry.submittedAt?.toISOString(),
  };

  const nextPicks = input.picks
    ? sanitizeEntryPicks(
        {
          ...currentEntry,
          picks: input.picks,
        },
        results,
      ).picks
    : currentEntry.picks;

  await prisma.entry.update({
    where: { id: entry.id },
    data: {
      entryName: input.name?.trim() ? input.name.trim() : entry.entryName,
      picksJson: serializePicks(nextPicks),
      finalsTiebreaker:
        input.tiebreakerGuess === undefined
          ? entry.finalsTiebreaker
          : input.tiebreakerGuess ?? null,
      submittedAt: input.submit ? new Date() : entry.submittedAt,
    },
  });

  await recomputeEntryStats(entry.id, results);
  return {
    entryId: entry.id,
  };
}

export async function syncOfficialResults() {
  const [results, liveGames] = await Promise.all([
    getSharedResults(),
    fetchOfficialLiveScoreboard(),
  ]);

  const merged = mergeLiveGamesIntoResults(results, liveGames);
  await saveSharedResults(merged.results);
  await recomputeAllEntryStats(merged.results);
  return merged.results;
}

export function getHttpErrorStatus(error: unknown) {
  return error instanceof HttpError ? error.status : 500;
}

export function getHttpErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected server error.";
}
