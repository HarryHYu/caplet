import http from 'node:http';

const PORT = 5000;

const users = new Map();
const tokens = new Map();
const requestLog = [];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const readBody = (req) => new Promise((resolve) => {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    if (!body) return resolve(undefined);
    try {
      resolve(JSON.parse(body));
    } catch {
      resolve(body);
    }
  });
});

const send = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...corsHeaders });
  res.end(JSON.stringify(data));
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  const body = await readBody(req);
  requestLog.push({ method: req.method, url: req.url, body });

  if (req.method === 'GET' && req.url === '/api/courses') {
    return send(res, 200, { courses: [] });
  }

  if (req.method === 'POST' && req.url === '/api/auth/google') {
    if (!body || typeof body !== 'object' || !body.idToken) {
      return send(res, 400, { errors: [{ msg: 'Google ID token is required' }] });
    }
    const email = `mock-user-${users.size + 1}@gmail.com`;
    const user = {
      id: `mock-${users.size + 1}`,
      email,
      firstName: 'Mock',
      lastName: 'User',
      role: 'student',
    };
    users.set(email, user);
    const token = `token-${user.id}`;
    tokens.set(token, user);
    return send(res, 200, { message: 'Google login successful', token, user });
  }

  if (req.method === 'GET' && req.url === '/api/auth/me') {
    const auth = req.headers.authorization || '';
    const token = auth.replace('Bearer ', '');
    const user = tokens.get(token);
    if (!user) return send(res, 401, { message: 'Invalid token' });
    return send(res, 200, { user });
  }

  if (req.method === 'POST' && req.url === '/api/auth/logout') {
    return send(res, 200, { message: 'Logout successful' });
  }

  if (req.method === 'GET' && req.url === '/api/users/dashboard') {
    return send(res, 200, {
      userStats: {
        completedCourses: 0,
        totalCourses: 0,
        completionRate: 0,
        averageScore: 0,
        totalLessonsCompleted: 0,
      },
      recentActivity: [],
      bookmarks: [],
      recommendedCourses: [],
      learningStreak: 0,
    });
  }

  if (req.method === 'GET' && req.url.startsWith('/api/progress')) {
    return send(res, 200, {});
  }

  if (req.method === 'GET' && req.url === '/__logs') {
    return send(res, 200, { requestLog });
  }

  return send(res, 404, { message: `No mock route for ${req.method} ${req.url}` });
});

server.listen(PORT, () => {
  console.log(`Mock API listening on http://localhost:${PORT}`);
});
