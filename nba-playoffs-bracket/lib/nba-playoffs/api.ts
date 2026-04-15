import { AppBootstrapResponse, MatchupPick, ResultsState } from "./types";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }

  return payload;
}

export async function fetchAppBootstrap(input: {
  clientId: string;
  inviteCode?: string | null;
  entryId?: string | null;
}) {
  const params = new URLSearchParams({
    clientId: input.clientId,
  });

  if (input.inviteCode) {
    params.set("inviteCode", input.inviteCode);
  }

  if (input.entryId) {
    params.set("entryId", input.entryId);
  }

  const response = await fetch(`/api/app-state?${params.toString()}`, {
    cache: "no-store",
  });

  return parseJsonResponse<AppBootstrapResponse>(response);
}

export async function createPoolRequest(input: {
  clientId: string;
  displayName: string;
  poolName: string;
  description?: string;
  lockAt: string;
  inviteCode?: string;
  initialEntryName: string;
  finalsTiebreaker?: number;
}) {
  const response = await fetch("/api/pools", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJsonResponse<{ poolId: string; entryId: string }>(response);
}

export async function joinPoolRequest(input: {
  clientId: string;
  displayName: string;
  inviteCode?: string;
  joinMethod: "link" | "code";
  initialEntryName?: string;
  finalsTiebreaker?: number;
}) {
  const response = await fetch("/api/pools/join", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJsonResponse<{ poolId: string; entryId?: string; locked: boolean }>(
    response,
  );
}

export async function createEntryRequest(input: {
  clientId: string;
  poolId: string;
  entryName: string;
  finalsTiebreaker?: number;
}) {
  const response = await fetch(`/api/pools/${input.poolId}/entries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clientId: input.clientId,
      entryName: input.entryName,
      finalsTiebreaker: input.finalsTiebreaker,
    }),
  });

  return parseJsonResponse<{ poolId: string; entryId: string }>(response);
}

export async function updateEntryRequest(input: {
  clientId: string;
  entryId: string;
  name?: string;
  tiebreakerGuess?: number | null;
  picks?: Record<string, MatchupPick>;
  submit?: boolean;
}) {
  const response = await fetch(`/api/entries/${input.entryId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJsonResponse<{ entryId: string }>(response);
}

export async function syncResultsRequest() {
  const response = await fetch("/api/results/sync", {
    method: "POST",
  });

  return parseJsonResponse<ResultsState>(response);
}
