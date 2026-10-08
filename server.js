const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const API_KEY = process.env.API_KEY || '';
const STARTED_AT = Date.now();
const DATA_DIR = path.join(__dirname, 'data');
const MEMORIES_FILE = path.join(DATA_DIR, 'memories.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const LOG_FILE = path.join(DATA_DIR, 'events.json');

const defaultMemories = [
  {
    id: 'liminal_hallway',
    name: 'Liminal Hallway',
    originalExperience: 'Backrooms hallway section',
    placeId: null,
    universeId: null,
    category: 'hallway',
    intensity: 82,
    deformationProfile: 'The walls repeat at impossible intervals; the ceiling hums with a distant machine rhythm and the path never ends in the same direction.',
    spawnProbability: 28,
    enabled: true,
    cooldownSeconds: 75,
    notes: 'Classic endless corridor event.'
  },
  {
    id: 'wet_carpet',
    name: 'Wet Carpet Drift',
    originalExperience: 'Backrooms carpet floor',
    placeId: null,
    universeId: null,
    category: 'floor',
    intensity: 64,
    deformationProfile: 'The carpet absorbs footprints and then replays them a few seconds later, leaving damp tracks that are never yours.',
    spawnProbability: 22,
    enabled: true,
    cooldownSeconds: 90,
    notes: 'Subtle movement distortion with localized moisture.'
  },
  {
    id: 'maintenance_tunnels',
    name: 'Maintenance Tunnels',
    originalExperience: 'Utility tunnel maze',
    placeId: null,
    universeId: null,
    category: 'utility',
    intensity: 76,
    deformationProfile: 'Pipes pulse in sequence; service panels open onto empty, fluorescent voids that smell faintly of rust and mildew.',
    spawnProbability: 18,
    enabled: true,
    cooldownSeconds: 120,
    notes: 'Constrained, cramped, and noisy environmental trigger.'
  },
  {
    id: 'moldy_classroom',
    name: 'Moldy Classroom',
    originalExperience: 'Abandoned classroom wing',
    placeId: null,
    universeId: null,
    category: 'room',
    intensity: 68,
    deformationProfile: 'Desks tilt toward one wall, chalkboards write impossible equations, and every chair keeps one extra leg in the dark.',
    spawnProbability: 20,
    enabled: true,
    cooldownSeconds: 90,
    notes: 'Focused on disorientation and impossible geometry.'
  },
  {
    id: 'infinite_stairwell',
    name: 'Infinite Stairwell',
    originalExperience: 'Looping stairwell anomaly',
    placeId: null,
    universeId: null,
    category: 'stairwell',
    intensity: 94,
    deformationProfile: 'Concrete steps climb into the ceiling and vanish; distant footsteps repeat one floor above you when no one is there.',
    spawnProbability: 12,
    enabled: true,
    cooldownSeconds: 180,
    notes: 'High-intensity event with strong visual dread.'
  }
];

const defaultSettings = {
  far: 150,
  initial: 100,
  medium: 60,
  heavy: 30,
  critical: 10,
  final: 3
};

let requestCount = 0;
let lastSuccessfulRequest = null;
let previousSelectionId = null;
const cooldowns = new Map();

function readJson(filePath, fallback) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (_error) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempFile = `${filePath}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempFile, filePath);
}

function ensureSeedData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(MEMORIES_FILE)) {
    writeJson(MEMORIES_FILE, defaultMemories);
  }

  if (!fs.existsSync(SETTINGS_FILE)) {
    writeJson(SETTINGS_FILE, defaultSettings);
  }

  if (!fs.existsSync(LOG_FILE)) {
    writeJson(LOG_FILE, []);
  }
}

function getMemories() {
  return readJson(MEMORIES_FILE, defaultMemories);
}

function setMemories(memories) {
  writeJson(MEMORIES_FILE, memories);
}

function getSettings() {
  return readJson(SETTINGS_FILE, defaultSettings);
}

function setSettings(settings) {
  writeJson(SETTINGS_FILE, settings);
}

function getEvents() {
  return readJson(LOG_FILE, []);
}

function setEvents(events) {
  writeJson(LOG_FILE, events);
}

function logEvent(type, message) {
  const events = getEvents();
  events.unshift({
    type,
    message,
    timestamp: new Date().toISOString()
  });

  const trimmed = events.slice(0, 250);
  setEvents(trimmed);
}

function sanitizeMemory(memory) {
  return {
    id: String(memory.id),
    name: String(memory.name),
    originalExperience: String(memory.originalExperience),
    placeId: memory.placeId !== undefined && memory.placeId !== null ? Number(memory.placeId) : null,
    universeId: memory.universeId !== undefined && memory.universeId !== null ? Number(memory.universeId) : null,
    category: String(memory.category),
    intensity: Number(memory.intensity),
    deformationProfile: String(memory.deformationProfile),
    spawnProbability: Number(memory.spawnProbability),
    enabled: Boolean(memory.enabled),
    cooldownSeconds: Number(memory.cooldownSeconds || 0),
    notes: memory.notes !== undefined && memory.notes !== null ? String(memory.notes) : ''
  };
}

function validateMemory(payload, existingId) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 'Memory payload must be an object';
  }

  if (typeof payload.id !== 'string' || !/^[\w-]{1,64}$/.test(payload.id)) {
    return 'Invalid memory id';
  }

  if (existingId && payload.id !== existingId) {
    return 'URL ID must match memory id';
  }

  for (const key of ['name', 'originalExperience', 'category', 'deformationProfile']) {
    if (typeof payload[key] !== 'string' || payload[key].trim().length === 0 || payload[key].length > 500) {
      return `${key} is required and must be under 500 characters`;
    }
  }

  if (!Number.isInteger(Number(payload.intensity)) || Number(payload.intensity) < 1 || Number(payload.intensity) > 100) {
    return 'Intensity must be an integer between 1 and 100';
  }

  if (!Number.isFinite(Number(payload.spawnProbability)) || Number(payload.spawnProbability) < 0 || Number(payload.spawnProbability) > 100) {
    return 'Spawn probability must be a number between 0 and 100';
  }

  if (typeof payload.enabled !== 'boolean') {
    return 'Enabled flag must be boolean';
  }

  if (payload.placeId !== null && payload.placeId !== undefined && (!Number.isSafeInteger(Number(payload.placeId)) || Number(payload.placeId) < 1)) {
    return 'placeId must be a positive integer or null';
  }

  if (payload.universeId !== null && payload.universeId !== undefined && (!Number.isSafeInteger(Number(payload.universeId)) || Number(payload.universeId) < 1)) {
    return 'universeId must be a positive integer or null';
  }

  if (payload.cooldownSeconds !== undefined && payload.cooldownSeconds !== null && (!Number.isInteger(Number(payload.cooldownSeconds)) || Number(payload.cooldownSeconds) < 0 || Number(payload.cooldownSeconds) > 86400)) {
    return 'Cooldown must be between 0 and 86400 seconds';
  }

  if (payload.notes !== undefined && payload.notes !== null && (typeof payload.notes !== 'string' || payload.notes.length > 2000)) {
    return 'Notes must be a string up to 2000 chars';
  }

  return null;
}

function pickNextMemory() {
  const memories = getMemories().filter((memory) => memory.enabled && Number(memory.spawnProbability) > 0);

  if (!memories.length) {
    return null;
  }

  const now = Date.now();
  const eligible = memories.filter((memory) => {
    const cooldownMs = (Number(memory.cooldownSeconds) || 0) * 1000;
    const last = cooldowns.get(memory.id) || 0;
    return now - last >= cooldownMs && memory.id !== previousSelectionId;
  });

  const pool = eligible.length ? eligible : memories;
  const totalWeight = pool.reduce((sum, memory) => sum + Number(memory.spawnProbability || 0), 0);

  let threshold = Math.random() * totalWeight;

  for (const memory of pool) {
    threshold -= Number(memory.spawnProbability || 0);
    if (threshold <= 0) {
      previousSelectionId = memory.id;
      cooldowns.set(memory.id, now);
      return memory;
    }
  }

  const chosen = pool[pool.length - 1];
  previousSelectionId = chosen.id;
  cooldowns.set(chosen.id, now);
  return chosen;
}

function jsonResponse(res, status, payload) {
  return res.status(status).json(payload);
}

function ensureAuthorized(req, res, next) {
  if (!API_KEY) {
    return next();
  }

  if (req.headers['x-api-key'] === API_KEY) {
    return next();
  }

  return jsonResponse(res, 401, { success: false, error: 'Valid X-API-Key required' });
}

app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));
app.use((req, res, next) => {
  requestCount += 1;
  res.set('Cache-Control', 'no-store');
  next();
});

app.get('/api/health', (req, res) => {
  return jsonResponse(res, 200, {
    success: true,
    status: 'healthy',
    service: 'backrooms-memory-system',
    uptimeSeconds: Math.floor((Date.now() - STARTED_AT) / 1000),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', (req, res) => {
  const settings = getSettings();
  const memories = getMemories();
  const events = getEvents();
  lastSuccessfulRequest = new Date().toISOString();

  return jsonResponse(res, 200, {
    success: true,
    status: 'online',
    backend: 'online',
    uptimeSeconds: Math.floor((Date.now() - STARTED_AT) / 1000),
    requestCount,
    lastSuccessfulRequest,
    memoryCount: memories.length,
    enabledMemories: memories.filter((memory) => memory.enabled).length,
    settings,
    logs: events.slice(0, 20)
  });
});

app.get('/api/log', (req, res) => {
  return jsonResponse(res, 200, {
    success: true,
    logs: getEvents().slice(0, 100)
  });
});

app.get('/api/events', (req, res) => {
  return jsonResponse(res, 200, {
    success: true,
    events: getEvents().slice(0, 100)
  });
});

app.get('/api/memories', (req, res) => {
  const memories = getMemories();
  const all = req.query.all === '1' || req.query.all === 'true';
  const filtered = all ? memories : memories.filter((memory) => memory.enabled);

  return jsonResponse(res, 200, {
    success: true,
    memories: filtered
  });
});

app.get('/api/memories/:id', (req, res) => {
  const memory = getMemories().find((entry) => entry.id === req.params.id);

  if (!memory) {
    return jsonResponse(res, 404, { success: false, error: 'Memory not found' });
  }

  return jsonResponse(res, 200, { success: true, memory });
});

app.get('/api/settings', (req, res) => {
  return jsonResponse(res, 200, {
    success: true,
    settings: getSettings()
  });
});

app.get('/api/director/next', (req, res) => {
  const chosen = pickNextMemory();

  if (!chosen) {
    return jsonResponse(res, 404, {
      success: false,
      error: 'No eligible enabled memories available'
    });
  }

  logEvent('director', `Selected ${chosen.name}`);
  lastSuccessfulRequest = new Date().toISOString();

  return jsonResponse(res, 200, {
    success: true,
    memory: chosen,
    settings: getSettings()
  });
});

app.post('/api/test-event', ensureAuthorized, (req, res) => {
  const chosen = pickNextMemory();

  if (!chosen) {
    logEvent('test', 'No eligible enabled memories available');
    return jsonResponse(res, 200, {
      success: true,
      memory: null,
      message: 'No eligible enabled memories available'
    });
  }

  logEvent('test', `Dashboard test selected ${chosen.name}`);
  lastSuccessfulRequest = new Date().toISOString();

  return jsonResponse(res, 200, {
    success: true,
    memory: chosen,
    settings: getSettings()
  });
});

app.post('/api/memories', ensureAuthorized, (req, res) => {
  const payload = sanitizeMemory(req.body || {});
  const error = validateMemory(payload);

  if (error) {
    return jsonResponse(res, 400, { success: false, error });
  }

  const memories = getMemories();
  const duplicate = memories.some((memory) => memory.id === payload.id);

  if (duplicate) {
    return jsonResponse(res, 409, { success: false, error: 'A memory with that id already exists' });
  }

  memories.push(payload);
  setMemories(memories);
  logEvent('memory', `Created ${payload.name}`);
  lastSuccessfulRequest = new Date().toISOString();

  return jsonResponse(res, 201, { success: true, memory: payload });
});

app.put('/api/settings', ensureAuthorized, (req, res) => {
  const input = req.body && typeof req.body === 'object' ? req.body : {};
  const nextSettings = input.settings || input;
  const keys = Object.keys(defaultSettings);

  if (!nextSettings || typeof nextSettings !== 'object' || Array.isArray(nextSettings)) {
    return jsonResponse(res, 400, { success: false, error: 'Settings payload must be an object' });
  }

  const prepared = {};
  for (const key of keys) {
    const value = Number(nextSettings[key]);
    if (!Number.isFinite(value) || value < 0) {
      return jsonResponse(res, 400, { success: false, error: `Invalid value for ${key}` });
    }
    prepared[key] = value;
  }

  const ordered = Object.values(prepared);
  if (ordered.some((value, index) => index > 0 && ordered[index - 1] <= value)) {
    return jsonResponse(res, 400, { success: false, error: 'Distances must strictly descend from far to final' });
  }

  setSettings(prepared);
  logEvent('settings', 'Deformation settings updated');
  lastSuccessfulRequest = new Date().toISOString();

  return jsonResponse(res, 200, { success: true, settings: prepared });
});

app.patch('/api/memories/:id', ensureAuthorized, (req, res) => {
  const memories = getMemories();
  const index = memories.findIndex((entry) => entry.id === req.params.id);

  if (index === -1) {
    return jsonResponse(res, 404, { success: false, error: 'Memory not found' });
  }

  const merged = { ...memories[index], ...req.body };
  const sanitized = sanitizeMemory(merged);
  const validationError = validateMemory(sanitized, req.params.id);

  if (validationError) {
    return jsonResponse(res, 400, { success: false, error: validationError });
  }

  memories[index] = sanitized;
  setMemories(memories);
  logEvent('memory', `Updated ${sanitized.name}`);
  lastSuccessfulRequest = new Date().toISOString();

  return jsonResponse(res, 200, { success: true, memory: sanitized });
});

app.put('/api/memories/:id', ensureAuthorized, (req, res) => {
  const sanitized = sanitizeMemory(req.body || {});
  const validationError = validateMemory(sanitized, req.params.id);

  if (validationError) {
    return jsonResponse(res, 400, { success: false, error: validationError });
  }

  const memories = getMemories();
  const index = memories.findIndex((entry) => entry.id === req.params.id);

  if (index === -1) {
    memories.push(sanitized);
  } else {
    memories[index] = sanitized;
  }

  setMemories(memories);
  logEvent('memory', `${index === -1 ? 'Created' : 'Updated'} ${sanitized.name}`);
  lastSuccessfulRequest = new Date().toISOString();

  return jsonResponse(res, index === -1 ? 201 : 200, { success: true, memory: sanitized });
});

app.delete('/api/memories/:id', ensureAuthorized, (req, res) => {
  const memories = getMemories();
  const index = memories.findIndex((entry) => entry.id === req.params.id);

  if (index === -1) {
    return jsonResponse(res, 404, { success: false, error: 'Memory not found' });
  }

  const [removed] = memories.splice(index, 1);
  setMemories(memories);
  logEvent('memory', `Deleted ${removed.name}`);
  lastSuccessfulRequest = new Date().toISOString();

  return jsonResponse(res, 200, { success: true, deleted: removed.id });
});

app.delete('/api/log', ensureAuthorized, (req, res) => {
  setEvents([]);
  logEvent('system', 'Activity log cleared by dashboard');
  return jsonResponse(res, 200, { success: true, cleared: true });
});

app.use((req, res) => {
  return jsonResponse(res, 404, { success: false, error: 'Endpoint not found' });
});

app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  return jsonResponse(res, 500, { success: false, error: error.message || 'Internal server error' });
});

ensureSeedData();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backrooms memory system API is running on http://localhost:${PORT}`);
  console.log('Use GET /api/health to verify the service.');
});

module.exports = app;
