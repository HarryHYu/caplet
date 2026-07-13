const DEFAULT_MAX_EVENTS = 5000;
const DEFAULT_WINDOW_MINUTES = 15;
const DEFAULT_CIRCUIT_WINDOW_MS = 5 * 60 * 1000;

let requestEvents = [];
let aiEvents = [];
const aiCircuits = new Map();
const processStartedAt = new Date();

function boundedNumber(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function maxEvents(env = process.env) {
  return Math.round(boundedNumber(env.OBSERVABILITY_MAX_EVENTS, DEFAULT_MAX_EVENTS, 100, 50000));
}

function boundedText(value, fallback, maximum = 160) {
  const text = String(value || '').replace(/[\r\n]/g, ' ').trim();
  return text.slice(0, maximum) || fallback;
}

function safeRoute(value) {
  const route = boundedText(String(value || '/').split('?')[0], '/', 200);
  return route.split('/').map((rawSegment) => {
    if (rawSegment.includes('@')) return ':value';
    const segment = rawSegment.replace(/[^A-Za-z0-9_:.*-]/g, '');
    if (!segment) return segment;
    if (/^[0-9]+$/.test(segment)) return ':id';
    if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment)) return ':id';
    if (/^[A-Za-z0-9_-]{20,}$/.test(segment) || segment.length > 40) return ':value';
    return segment;
  }).join('/') || '/';
}

function append(list, event, env = process.env) {
  list.push(Object.freeze(event));
  const excess = list.length - maxEvents(env);
  if (excess > 0) list.splice(0, excess);
}

function percentile(values, requestedPercentile) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(requestedPercentile * sorted.length) - 1);
  return Number(sorted[index].toFixed(2));
}

function eventWindow(events, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const minutes = boundedNumber(
    options.windowMinutes ?? options.env?.OBSERVABILITY_WINDOW_MINUTES,
    DEFAULT_WINDOW_MINUTES,
    1,
    24 * 60,
  );
  const cutoff = now.getTime() - minutes * 60 * 1000;
  return {
    now,
    minutes,
    events: events.filter((event) => event.at >= cutoff && event.at <= now.getTime()),
  };
}

function recordHttpRequest(input = {}, options = {}) {
  const durationMs = boundedNumber(input.durationMs, 0, 0, 30 * 60 * 1000);
  const status = Math.round(boundedNumber(input.status, 0, 0, 599));
  append(requestEvents, {
    at: options.now ? new Date(options.now).getTime() : Date.now(),
    route: safeRoute(input.route),
    method: boundedText(input.method, 'UNKNOWN', 12).toUpperCase(),
    status,
    durationMs,
    outcome: ['completed', 'aborted'].includes(input.outcome) ? input.outcome : 'completed',
  }, options.env);
}

function summarizeRequests(options = {}) {
  const window = eventWindow(requestEvents, options);
  const durations = window.events.map((event) => event.durationMs);
  const errors = window.events.filter((event) => event.status >= 500).length;
  const clientErrors = window.events.filter((event) => event.status >= 400 && event.status < 500).length;
  const aborted = window.events.filter((event) => event.outcome === 'aborted').length;
  const routeMap = new Map();

  for (const event of window.events) {
    const key = `${event.method} ${event.route}`;
    const aggregate = routeMap.get(key) || { route: event.route, method: event.method, count: 0, errors: 0, durations: [] };
    aggregate.count += 1;
    if (event.status >= 500) aggregate.errors += 1;
    aggregate.durations.push(event.durationMs);
    routeMap.set(key, aggregate);
  }

  const routes = [...routeMap.values()]
    .sort((left, right) => right.count - left.count || right.errors - left.errors)
    .slice(0, 10)
    .map((item) => ({
      route: item.route,
      method: item.method,
      count: item.count,
      errors: item.errors,
      p95Ms: percentile(item.durations, 0.95),
    }));

  return {
    windowMinutes: window.minutes,
    requests: window.events.length,
    errors,
    clientErrors,
    aborted,
    errorRate: window.events.length ? Number((errors / window.events.length).toFixed(4)) : 0,
    latencyMs: {
      p50: percentile(durations, 0.5),
      p95: percentile(durations, 0.95),
      p99: percentile(durations, 0.99),
      maximum: durations.length ? Number(Math.max(...durations).toFixed(2)) : null,
    },
    routes,
  };
}

function aiConfiguration(env = process.env) {
  return {
    estimatedCostPerUnitUsd: boundedNumber(env.AI_ESTIMATED_COST_USD_PER_UNIT, 0, 0, 100),
    monthlyBudgetUsd: boundedNumber(env.AI_MONTHLY_BUDGET_USD, 0, 0, 10000000),
    circuitWindowMs: boundedNumber(env.AI_CIRCUIT_WINDOW_MS, DEFAULT_CIRCUIT_WINDOW_MS, 1000, 60 * 60 * 1000),
    circuitMinimumRequests: Math.round(boundedNumber(env.AI_CIRCUIT_MIN_REQUESTS, 10, 3, 1000)),
    circuitFailureRate: boundedNumber(env.AI_CIRCUIT_FAILURE_RATE, 0.6, 0.1, 1),
    circuitOpenMs: boundedNumber(env.AI_CIRCUIT_OPEN_MS, 60 * 1000, 1000, 60 * 60 * 1000),
  };
}

function circuitState(scope, now = Date.now()) {
  const key = boundedText(scope, 'ai', 80);
  const existing = aiCircuits.get(key);
  if (!existing) return { scope: key, state: 'closed', openedAt: null, openUntil: null };
  if (existing.state === 'open' && existing.openUntil <= now) {
    const closed = { scope: key, state: 'closed', openedAt: null, openUntil: null };
    aiCircuits.set(key, closed);
    return closed;
  }
  return { ...existing };
}

function refreshCircuit(scope, options = {}) {
  const env = options.env || process.env;
  const config = aiConfiguration(env);
  const now = options.now ? new Date(options.now).getTime() : Date.now();
  const current = circuitState(scope, now);
  if (current.state === 'open') return current;
  const cutoff = now - config.circuitWindowMs;
  const terminal = aiEvents.filter((event) => (
    event.scope === scope
      && event.at >= cutoff
      && ['completed', 'failed'].includes(event.outcome)
  ));
  if (terminal.length < config.circuitMinimumRequests) return current;
  const failures = terminal.filter((event) => event.outcome === 'failed').length;
  if (failures / terminal.length < config.circuitFailureRate) return current;
  const opened = {
    scope,
    state: 'open',
    openedAt: now,
    openUntil: now + config.circuitOpenMs,
  };
  aiCircuits.set(scope, opened);
  append(aiEvents, { at: now, scope, units: 0, outcome: 'circuit_opened' }, env);
  return { ...opened };
}

function recordAIEvent(input = {}, options = {}) {
  const env = options.env || process.env;
  const scope = boundedText(input.scope, 'ai', 80);
  const outcome = [
    'reserved',
    'completed',
    'failed',
    'rejected_quota',
    'rejected_concurrency',
    'rejected_circuit',
    'circuit_opened',
  ].includes(input.outcome) ? input.outcome : 'completed';
  append(aiEvents, {
    at: options.now ? new Date(options.now).getTime() : Date.now(),
    scope,
    units: Math.round(boundedNumber(input.units, 0, 0, 10000)),
    outcome,
  }, env);
  if (['completed', 'failed'].includes(outcome)) refreshCircuit(scope, options);
}

function isAICircuitOpen(scope, options = {}) {
  const now = options.now ? new Date(options.now).getTime() : Date.now();
  const state = circuitState(boundedText(scope, 'ai', 80), now);
  return state.state === 'open' ? state : null;
}

function summarizeAI(options = {}) {
  const env = options.env || process.env;
  const window = eventWindow(aiEvents, options);
  const config = aiConfiguration(env);
  const counts = window.events.reduce((result, event) => {
    result[event.outcome] = (result[event.outcome] || 0) + 1;
    return result;
  }, {});
  const reservedUnits = window.events
    .filter((event) => event.outcome === 'reserved')
    .reduce((total, event) => total + event.units, 0);
  const estimatedCostUsd = Number((reservedUnits * config.estimatedCostPerUnitUsd).toFixed(4));
  const monthStart = Date.UTC(window.now.getUTCFullYear(), window.now.getUTCMonth(), 1);
  const retainedMonthUnits = aiEvents
    .filter((event) => event.at >= monthStart && event.at <= window.now.getTime() && event.outcome === 'reserved')
    .reduce((total, event) => total + event.units, 0);
  const retainedMonthCostUsd = Number((retainedMonthUnits * config.estimatedCostPerUnitUsd).toFixed(4));
  const budgetUsedPercentage = config.monthlyBudgetUsd > 0
    ? Number(((retainedMonthCostUsd / config.monthlyBudgetUsd) * 100).toFixed(2))
    : null;
  const now = options.now ? new Date(options.now).getTime() : Date.now();
  const circuits = [...aiCircuits.keys()]
    .map((scope) => circuitState(scope, now))
    .filter((state) => state.state === 'open')
    .map((state) => ({
      scope: state.scope,
      state: state.state,
      openedAt: new Date(state.openedAt).toISOString(),
      openUntil: new Date(state.openUntil).toISOString(),
    }));

  return {
    windowMinutes: window.minutes,
    reservedRequests: counts.reserved || 0,
    reservedUnits,
    completed: counts.completed || 0,
    failed: counts.failed || 0,
    rejected: {
      quota: counts.rejected_quota || 0,
      concurrency: counts.rejected_concurrency || 0,
      circuit: counts.rejected_circuit || 0,
    },
    circuits,
    cost: {
      estimatedUsd: config.estimatedCostPerUnitUsd > 0 ? estimatedCostUsd : null,
      retainedMonthToDateEstimatedUsd: config.estimatedCostPerUnitUsd > 0 ? retainedMonthCostUsd : null,
      estimatedCostPerUnitUsd: config.estimatedCostPerUnitUsd || null,
      configuredMonthlyBudgetUsd: config.monthlyBudgetUsd || null,
      budgetUsedPercentage,
      budgetExceeded: budgetUsedPercentage !== null && budgetUsedPercentage >= 100,
      basis: 'reserved quota units retained by this process; not provider billing',
    },
  };
}

function runtimeSummary(options = {}) {
  return {
    process: {
      startedAt: processStartedAt.toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      release: boundedText(process.env.RELEASE_SHA, null, 12),
    },
    http: summarizeRequests(options),
    ai: summarizeAI(options),
  };
}

function resetRuntimeMetricsForTests() {
  requestEvents = [];
  aiEvents = [];
  aiCircuits.clear();
}

module.exports = {
  aiConfiguration,
  isAICircuitOpen,
  recordAIEvent,
  recordHttpRequest,
  resetRuntimeMetricsForTests,
  runtimeSummary,
  summarizeAI,
  summarizeRequests,
};
