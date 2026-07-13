import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export const USERS = {
  learner: {
    id: 'e2e-learner',
    firstName: 'Casey',
    lastName: 'Nguyen',
    email: 'casey@example.test',
    role: 'user',
  },
  teacher: {
    id: 'e2e-teacher',
    firstName: 'Taylor',
    lastName: 'Morgan',
    email: 'taylor@school.nsw.edu.au',
    role: 'user',
  },
  admin: {
    id: 'e2e-admin',
    firstName: 'Alex',
    lastName: 'Admin',
    email: 'alex@example.test',
    role: 'admin',
  },
};

export async function authenticateAs(page, user = USERS.learner) {
  await page.addInitScript(({ currentUser }) => {
    localStorage.setItem('token', 'caplet-e2e-token');
    localStorage.setItem('caplet:nav-mode', 'horizontal');
    localStorage.setItem('caplet:product-mode', 'study');
    localStorage.setItem('caplet:e2e-user', JSON.stringify(currentUser));
  }, { currentUser: user });
}

function commonResponse({ method, pathname, endpoint, user }) {
  if (method === 'GET' && pathname === '/feature-flags') return { json: { flags: [] } };
  if (method === 'GET' && pathname === '/auth/me') {
    return user
      ? { json: { user } }
      : { status: 401, json: { message: 'Not authenticated' } };
  }
  if (method === 'POST' && pathname === '/auth/logout') return { json: { ok: true } };
  if (method === 'POST' && pathname === '/events') return { json: { accepted: true } };
  if (method === 'GET' && pathname === '/courses') return { json: { courses: [] } };
  if (method === 'GET' && pathname === '/progress') return { json: { progress: [] } };
  if (method === 'GET' && pathname === '/classes') return { json: { teaching: [], student: [] } };
  if (method === 'GET' && pathname === '/saved-slides') return { json: { savedSlides: [] } };
  if (method === 'GET' && pathname === '/review/due') return { json: { items: [] } };
  if (method === 'GET' && pathname === '/study-plan') return { json: { studyPlan: null } };
  if (method === 'GET' && pathname === '/economics-exams') return { json: { sessions: [] } };
  if (method === 'GET' && pathname === '/recommendations/next') return { json: { recommendation: null } };
  return { status: 501, json: { message: `No E2E mock for ${method} ${endpoint}` } };
}

export async function installApiMock(page, { user = null, onRequest } = {}) {
  const requests = [];

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const pathname = url.pathname.replace(/^\/api/, '') || '/';
    const endpoint = `${pathname}${url.search}`;
    let body = null;
    try {
      body = request.postDataJSON();
    } catch {
      body = request.postData();
    }

    const record = { method, pathname, endpoint, body, headers: request.headers() };
    requests.push(record);

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }

    const custom = await onRequest?.(record);
    const response = custom ?? commonResponse({ method, pathname, endpoint, user });
    const status = response.status ?? 200;
    const payload = response.json ?? null;

    await route.fulfill({
      status,
      contentType: 'application/json',
      body: payload == null ? '' : JSON.stringify(payload),
      headers: {
        'access-control-allow-origin': '*',
        'cache-control': 'no-store',
        ...(response.headers || {}),
      },
    });
  });

  return requests;
}

export async function expectSingleMainAndFocusedRoute(page) {
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('#main-content')).toBeFocused();
}

export async function expectNoAxeViolations(page, include = 'main') {
  const result = await new AxeBuilder({ page })
    .include(include)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(result.violations, result.violations.map((violation) => (
    `${violation.id}: ${violation.help}\n${violation.nodes.map((node) => `  ${node.target.join(' ')}: ${node.failureSummary}`).join('\n')}`
  )).join('\n\n')).toEqual([]);
}
