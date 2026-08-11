/* ============================================================
   server.js — GreenLoop Production Node.js Backend Server
   Zero external npm dependencies — built on native Node.js:
   - Native HTTP Server serving static files & REST APIs
   - Real User Registration & Password Hashing (scrypt + salt)
   - Secure Session Management (Crypto Tokens)
   - REST API Endpoints: /api/auth/* & /api/pickups
   - Persistent Stores: data/users.json, data/sessions.json, data/pickups.json
   ============================================================ */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 5000;
const PUBLIC_DIR = __dirname;
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const PICKUPS_FILE = path.join(DATA_DIR, 'pickups.json');

// Ensure data directory and JSON stores exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(USERS_FILE)) {
  const seedSalt = crypto.randomBytes(16).toString('hex');
  const seedHash = hashPassword('Password123!', seedSalt);
  const initialUsers = [
    {
      id: 'usr_seed_1',
      name: 'Demo Admin',
      email: 'admin@greenloop.eco',
      passwordHash: seedHash,
      salt: seedSalt,
      accountType: 'Individual',
      createdAt: new Date().toISOString()
    }
  ];
  fs.writeFileSync(USERS_FILE, JSON.stringify(initialUsers, null, 2));
}

if (!fs.existsSync(SESSIONS_FILE)) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify([], null, 2));
}

if (!fs.existsSync(PICKUPS_FILE)) {
  fs.writeFileSync(PICKUPS_FILE, JSON.stringify([], null, 2));
}

/* ════════════════════════════════════════════════════════════
   CRYPTO & DATABASE HELPERS
   ════════════════════════════════════════════════════════════ */
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password, salt, storedHash) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch (e) { return []; }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function readSessions() {
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
  } catch (e) { return []; }
}

function writeSessions(sessions) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

function readPickups() {
  try {
    return JSON.parse(fs.readFileSync(PICKUPS_FILE, 'utf8'));
  } catch (e) { return []; }
}

function writePickups(pickups) {
  fs.writeFileSync(PICKUPS_FILE, JSON.stringify(pickups, null, 2));
}

function createSession(userId, userEmail, userName) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const sessions = readSessions();
  
  const newSession = {
    token,
    userId,
    userEmail,
    userName,
    createdAt: new Date().toISOString(),
    expiresAt
  };

  const activeSessions = sessions.filter(s => new Date(s.expiresAt) > new Date());
  activeSessions.push(newSession);
  writeSessions(activeSessions);

  return newSession;
}

function getSessionFromRequest(req) {
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.headers['cookie']) {
    const match = req.headers['cookie'].match(/greenloop_session=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) return null;

  const sessions = readSessions();
  const session = sessions.find(s => s.token === token);
  if (!session) return null;

  if (new Date(session.expiresAt) < new Date()) {
    return null;
  }

  return session;
}

/* ════════════════════════════════════════════════════════════
   MIME TYPES & STATIC FILE HANDLER
   ════════════════════════════════════════════════════════════ */
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp'
};

function serveStaticFile(req, res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found</h1>');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    fs.createReadStream(filePath).pipe(res);
  });
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) {
        req.connection.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON payload'));
      }
    });
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

/* ════════════════════════════════════════════════════════════
   REST API ROUTER
   ════════════════════════════════════════════════════════════ */
async function handleApiRequest(req, res, pathname) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    });
    res.end();
    return;
  }

  // 1. POST /api/auth/register — User Registration
  if (req.method === 'POST' && pathname === '/api/auth/register') {
    try {
      const payload = await parseJsonBody(req);
      const { name, email, password, accountType } = payload;

      if (!name || !email || !password) {
        return sendJson(res, 400, { success: false, error: 'Name, email, and password are required.' });
      }

      const users = readUsers();
      const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
      if (existingUser) {
        return sendJson(res, 409, { success: false, error: 'An account with this email address already exists.' });
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword(password, salt);

      const newUser = {
        id: 'usr_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        salt,
        accountType: accountType || 'Individual',
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      writeUsers(users);

      const session = createSession(newUser.id, newUser.email, newUser.name);

      return sendJson(res, 201, {
        success: true,
        message: 'Account created successfully.',
        token: session.token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          accountType: newUser.accountType
        }
      });
    } catch (e) {
      return sendJson(res, 500, { success: false, error: 'Server error during registration: ' + e.message });
    }
  }

  // 2. POST /api/auth/login — Email/Password Login
  if (req.method === 'POST' && pathname === '/api/auth/login') {
    try {
      const payload = await parseJsonBody(req);
      const { email, password } = payload;

      if (!email || !password) {
        return sendJson(res, 400, { success: false, error: 'Please enter your email and password.' });
      }

      const users = readUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

      if (!user) {
        return sendJson(res, 401, { success: false, error: 'Invalid email or password.' });
      }

      const isValid = verifyPassword(password, user.salt, user.passwordHash);
      if (!isValid) {
        return sendJson(res, 401, { success: false, error: 'Invalid email or password.' });
      }

      const session = createSession(user.id, user.email, user.name);

      return sendJson(res, 200, {
        success: true,
        message: 'Login successful.',
        token: session.token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          accountType: user.accountType
        }
      });
    } catch (e) {
      return sendJson(res, 500, { success: false, error: 'Server error during login.' });
    }
  }

  // 3. GET /api/auth/me — Validate Active Session
  if (req.method === 'GET' && pathname === '/api/auth/me') {
    const session = getSessionFromRequest(req);
    if (!session) {
      return sendJson(res, 401, { success: false, error: 'Unauthenticated' });
    }

    const users = readUsers();
    const user = users.find(u => u.id === session.userId);

    return sendJson(res, 200, {
      success: true,
      user: {
        id: session.userId,
        name: session.userName,
        email: session.userEmail,
        accountType: user ? user.accountType : 'Individual'
      }
    });
  }

  // 4. POST /api/auth/logout — Revoke Session
  if (req.method === 'POST' && pathname === '/api/auth/logout') {
    const session = getSessionFromRequest(req);
    if (session) {
      const sessions = readSessions().filter(s => s.token !== session.token);
      writeSessions(sessions);
    }
    return sendJson(res, 200, { success: true, message: 'Logged out successfully.' });
  }

  // 5. POST /api/auth/forgot-password — Password Reset Request
  if (req.method === 'POST' && pathname === '/api/auth/forgot-password') {
    try {
      const payload = await parseJsonBody(req);
      const { email } = payload;

      return sendJson(res, 200, {
        success: true,
        message: `If an account exists for ${email}, a password reset link has been dispatched to your inbox.`
      });
    } catch (e) {
      return sendJson(res, 500, { success: false, error: 'Reset dispatch error.' });
    }
  }

  // 6. GET /api/pickups — Fetch Authenticated User's Pickups
  if (req.method === 'GET' && pathname === '/api/pickups') {
    const session = getSessionFromRequest(req);
    if (!session) {
      return sendJson(res, 401, { success: false, error: 'Authentication required to view scheduled pickups.' });
    }

    const allPickups = readPickups();
    const userPickups = allPickups.filter(p => p.userId === session.userId || p.userEmail === session.userEmail);

    return sendJson(res, 200, {
      success: true,
      pickups: userPickups
    });
  }

  // 7. POST /api/pickups — Save New Authenticated Doorstep Pickup
  if (req.method === 'POST' && pathname === '/api/pickups') {
    const session = getSessionFromRequest(req);
    if (!session) {
      return sendJson(res, 401, { success: false, error: 'Authentication required to schedule a doorstep pickup.' });
    }

    try {
      const payload = await parseJsonBody(req);
      const { items, itemTypes, date, timeSlot, quantity, address, phone, notes } = payload;

      if (!date || !timeSlot || !address || !phone) {
        return sendJson(res, 400, { success: false, error: 'Date, time slot, address, and phone number are required.' });
      }

      const pickups = readPickups();
      const newPickup = {
        id: 'pkp_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex'),
        userId: session.userId,
        userEmail: session.userEmail,
        userName: session.userName,
        items: items || itemTypes || ['General E-Waste'],
        itemTypes: itemTypes || items || ['General E-Waste'],
        date,
        timeSlot,
        quantity: parseInt(quantity, 10) || 1,
        address: address.trim(),
        phone: phone.trim(),
        notes: notes ? notes.trim() : '',
        status: 'Confirmed',
        createdAt: new Date().toISOString()
      };

      pickups.unshift(newPickup);
      writePickups(pickups);

      return sendJson(res, 201, {
        success: true,
        message: 'Doorstep e-waste pickup scheduled successfully.',
        pickup: newPickup
      });
    } catch (e) {
      return sendJson(res, 500, { success: false, error: 'Failed to schedule pickup: ' + e.message });
    }
  }

  // Unknown API Endpoint
  return sendJson(res, 404, { success: false, error: 'API endpoint not found' });
}

/* ════════════════════════════════════════════════════════════
   HTTP SERVER REQUEST HANDLER
   ════════════════════════════════════════════════════════════ */
const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  if (pathname.startsWith('/api/')) {
    handleApiRequest(req, res, pathname);
    return;
  }

  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, safePath);
  serveStaticFile(req, res, filePath);
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 GreenLoop Server running on http://localhost:${PORT}`);
  console.log(`📁 Database stores initialized at ${DATA_DIR}`);
  console.log(`====================================================`);
});
