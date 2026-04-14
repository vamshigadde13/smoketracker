import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "sync_queue_v1";
const STATE_KEY = "sync_state_v1";

const defaultState = {
  inProgress: false,
  queuedCount: 0,
  lastAttemptAt: null,
  lastSuccessAt: null,
  lastError: null,
};

const subscribers = new Set();

const safeParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const readQueue = async () => safeParse(await AsyncStorage.getItem(QUEUE_KEY), []);
const writeQueue = async (queue) => {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  await updateSyncState({ queuedCount: queue.length });
};

export const getSyncState = async () => ({
  ...defaultState,
  ...safeParse(await AsyncStorage.getItem(STATE_KEY), {}),
});

export const subscribeSyncState = (callback) => {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
};

const emitSyncState = async () => {
  const state = await getSyncState();
  subscribers.forEach((cb) => {
    try {
      cb(state);
    } catch {}
  });
};

export const updateSyncState = async (partial) => {
  const next = { ...(await getSyncState()), ...partial };
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(next));
  await emitSyncState();
  return next;
};

const buildFingerprint = (item) => {
  const id = item?.payload?.id || item?.payload?._id || "";
  return `${item.entity}:${item.op}:${id}`;
};

export const enqueueOperation = async (operation) => {
  const queue = await readQueue();
  const item = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    entity: operation.entity,
    op: operation.op,
    payload: operation.payload,
    createdAt: Date.now(),
    attempts: 0,
  };

  // Compact repetitive mutations for same record.
  const fingerprint = buildFingerprint(item);
  const compacted = queue.filter((q) => buildFingerprint(q) !== fingerprint);
  compacted.push(item);
  await writeQueue(compacted);
  return item;
};

export const getQueuedOperations = async () => readQueue();

export const clearQueue = async () => {
  await writeQueue([]);
};

export const flushQueue = async ({ handlers }) => {
  let queue = await readQueue();
  if (!queue.length) {
    await updateSyncState({ inProgress: false, queuedCount: 0, lastError: null });
    return { processed: 0, failed: 0 };
  }

  await updateSyncState({
    inProgress: true,
    queuedCount: queue.length,
    lastAttemptAt: Date.now(),
    lastError: null,
  });

  const remaining = [];
  let processed = 0;
  let failed = 0;

  for (const item of queue) {
    const handler = handlers?.[item.entity]?.[item.op];
    if (!handler) {
      remaining.push({ ...item, attempts: (item.attempts || 0) + 1 });
      failed += 1;
      continue;
    }

    try {
      await handler(item.payload);
      processed += 1;
    } catch (error) {
      remaining.push({ ...item, attempts: (item.attempts || 0) + 1 });
      failed += 1;
      await updateSyncState({ lastError: error?.message || "Queue replay failed" });
    }
  }

  await writeQueue(remaining);
  await updateSyncState({
    inProgress: false,
    queuedCount: remaining.length,
    lastSuccessAt: Date.now(),
  });

  return { processed, failed };
};
