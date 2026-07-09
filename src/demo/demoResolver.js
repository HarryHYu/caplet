/**
 * Demo API resolver — maps (method, endpoint) to demo fixtures so the real
 * ApiService can serve the /demo sandbox with no backend.
 *
 * ApiService.request() short-circuits here whenever `api.demoMode` is true.
 * Reads return realistic fixtures; writes echo a plausible created/updated
 * object (or null) so the real pages' optimistic UIs never throw.
 */
import {
  DEMO_USER,
  DEMO_COURSES,
  getCourseDetail,
  getLessonById,
  getProgress,
  DEMO_USER_PROGRESS,
  DEMO_SAVED_SLIDES,
  DEMO_CLASSES,
  getClassDetail,
  getAnnouncementComments,
  getAssignmentComments,
  DEMO_EDITOR_TREE,
  AI_CHAT_GENERATE,
} from './demoData.js';

const clone = (v) => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));
const parseBody = (options) => {
  try {
    return options?.body ? JSON.parse(options.body) : {};
  } catch {
    return {};
  }
};
const path = (endpoint) => endpoint.split('?')[0];

let idSeq = 1000;
const nextId = () => `demo-${idSeq++}`;

// [method, RegExp over the path (no query), handler(match, options) -> body]
const ROUTES = [
  /* ── Reads ─────────────────────────────────────────────────────────── */
  ['GET', /^\/auth\/me$/, () => ({ user: DEMO_USER })],
  ['GET', /^\/users\/profile$/, () => ({ user: DEMO_USER })],
  ['GET', /^\/courses$/, () => ({ courses: DEMO_COURSES })],
  ['GET', /^\/courses\/([^/]+)$/, (m) => ({ course: getCourseDetail(m[1]) })],
  ['GET', /^\/courses\/([^/]+)\/lessons\/([^/]+)$/, (m) => ({ lesson: getLessonById(m[1], m[2]) })],
  ['GET', /^\/progress\/course\/([^/]+)$/, (m) => getProgress(m[1])],
  ['GET', /^\/progress$/, () => DEMO_USER_PROGRESS],
  ['GET', /^\/saved-slides$/, () => DEMO_SAVED_SLIDES],
  ['GET', /^\/review\/due$/, () => ({ items: [], due: [] })],
  ['GET', /^\/classes$/, () => DEMO_CLASSES],
  ['GET', /^\/classes\/([^/]+)$/, (m) => getClassDetail(m[1])],
  ['GET', /^\/classes\/[^/]+\/announcements\/([^/]+)\/comments$/, (m) => getAnnouncementComments(m[1])],
  ['GET', /^\/classes\/[^/]+\/assignments\/([^/]+)\/comments$/, (m) => getAssignmentComments(m[1])],
  ['GET', /^\/editor\/tree$/, () => ({ courses: DEMO_EDITOR_TREE.courses })],

  /* ── AI (editor chat) ──────────────────────────────────────────────── */
  ['POST', /^\/ai\/lesson-chat$/, () => ({ __delay: 900, body: AI_CHAT_GENERATE })],
  ['POST', /^\/ai\/generate-lesson$/, () => ({ __delay: 900, body: AI_CHAT_GENERATE })],

  /* ── Writes with a shape the UI reads back ─────────────────────────── */
  ['POST', /^\/classes\/join$/, () => ({ classroom: { id: 'cls-commerce', name: 'Year 11 Commerce A', code: 'CAP-4821' } })],
  ['POST', /^\/classes$/, (m, o) => ({ classroom: { id: nextId(), code: 'CAP-0000', ...parseBody(o) } })],
  ['POST', /^\/live\/sessions$/, () => ({ session: { id: 'demo-live', code: 'DEMO42' } })],
  ['POST', /^\/saved-slides$/, (m, o) => ({ savedSlide: { id: nextId(), ...parseBody(o) } })],
  ['POST', /^\/saved-slides\/categorize$/, () => ({ categories: [] })],
  // Editor create → echo a { lesson, course } / { module, course } / { course }
  ['POST', /^\/editor\/lessons$/, (m, o) => {
    const b = parseBody(o);
    return { lesson: { id: nextId(), title: b.title || 'Untitled lesson', slides: [], ...b }, course: { id: b.courseId || 'c_money_basics' } };
  }],
  ['POST', /^\/editor\/modules$/, (m, o) => ({ module: { id: nextId(), ...parseBody(o) }, course: { id: parseBody(o).courseId } })],
  ['POST', /^\/editor\/courses$/, (m, o) => ({ course: { id: nextId(), modules: [], ...parseBody(o) } })],
];

/**
 * Resolve a demo request. Returns the response body (already unwrapped the way
 * ApiService callers expect). Unmatched GETs return null (+warn); unmatched
 * writes return null so optimistic UIs proceed without a hard error.
 */
export async function resolveDemo(method, endpoint, options = {}) {
  const p = path(endpoint);
  let matched;
  for (const [m, re, fn] of ROUTES) {
    if (m !== method) continue;
    const hit = p.match(re);
    if (hit) {
      matched = fn(hit, options);
      break;
    }
  }

  let delay = 130;
  let body;
  if (matched === undefined) {
    if (method !== 'GET') {
      body = null; // generic write success (delete/update/complete/etc.)
    } else {
      if (import.meta?.env?.DEV) console.warn('[demo] unmatched GET', endpoint);
      body = null;
    }
  } else if (matched && typeof matched === 'object' && '__delay' in matched) {
    delay = matched.__delay;
    body = matched.body;
  } else {
    body = matched;
  }

  await new Promise((r) => setTimeout(r, delay));
  return body == null ? body : clone(body);
}
