export type LocalEntry = {
  notionId: string;
  slug: string;
  notionLastEdited: string;
};

export type RemoteRow = {
  notionId: string;
  slug: string;
  lastEdited: string;
};

export type SyncPlan = {
  /** Rows that need a full fetch. */
  fetch: RemoteRow[];
  /** Local folders to delete: unpublished pages and abandoned old slugs. */
  remove: string[];
  /** Rows already in sync. */
  unchanged: string[];
};

/**
 * `remove` carries old slugs as well as deleted pages, so a rename cannot leave
 * two directories claiming the same content.
 */
export function planSync(local: LocalEntry[], remote: RemoteRow[]): SyncPlan {
  const localById = new Map(local.map((entry) => [entry.notionId, entry]));
  const remoteIds = new Set(remote.map((row) => row.notionId));

  const fetch: RemoteRow[] = [];
  const unchanged: string[] = [];
  const remove: string[] = [];

  for (const row of remote) {
    const existing = localById.get(row.notionId);

    if (!existing) {
      fetch.push(row);
      continue;
    }

    const editedAt = Date.parse(row.lastEdited);
    const syncedAt = Date.parse(existing.notionLastEdited);
    const edited = editedAt > syncedAt;
    const renamed = existing.slug !== row.slug;
    const unreadableTimestamp = Number.isNaN(syncedAt);

    if (edited || renamed || unreadableTimestamp) {
      fetch.push(row);
    } else {
      unchanged.push(row.slug);
    }

    if (renamed) remove.push(existing.slug);
  }

  for (const entry of local) {
    if (remoteIds.has(entry.notionId)) continue;
    if (!remove.includes(entry.slug)) remove.push(entry.slug);
  }

  return { fetch, remove, unchanged };
}