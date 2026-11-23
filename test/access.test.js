import assert from 'node:assert/strict';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Duplex } from 'node:stream';
import { test } from 'node:test';
import { Types } from 'mongoose';
import express from 'express';
import { getProject, getProjectSaveStatus, addProjectComment, saveProject, createChat } from '../controllers/api.js';
import { Project } from '../models/project.js';
import { Chat } from '../models/chat.js';
import { Profile } from '../models/profile.js';
import { router as apiRouter } from '../routes/api.js';
import { safeReturnTo } from '../lib/return-to.js';
import { sanitizeRichText } from '../lib/rich-text.js';
import { getStoredPictureName } from '../frontend/lib/project-images.js';
import { parseInstruction } from '../frontend/lib/project-instructions.js';

const projectId = new Types.ObjectId();
const owner = new Types.ObjectId();
const visitor = new Types.ObjectId();

const request = (app, method, path, headers = {}) => new Promise((resolve, reject) => {
  let output = '';
  const socket = new Duplex({
    read() { this.push(null); },
    write(chunk, encoding, callback) {
      output += chunk.toString();
      callback();
    },
  });
  const req = new IncomingMessage(socket);
  req.method = method;
  req.url = path;
  req.headers = { host: 'localhost:3000', ...headers };
  const res = new ServerResponse(req);
  res.assignSocket(socket);
  res.on('finish', () => resolve({ status: res.statusCode, headers: res.getHeaders(), output }));
  res.on('error', reject);
  app(req, res);
});

const apiWithViewer = (_id, role = 'user') => {
  const app = express();
  app.use((req, res, next) => {
    req.user = _id ? { profile: { _id, role } } : undefined;
    req.isAuthenticated = () => Boolean(req.user);
    next();
  });
  app.use('/api', apiRouter);
  return app;
};

test('Express sends old page links to Next.js and retires legacy writes', async () => {
  process.env.DOTENV_CONFIG_PATH = 'test/.no-env-file';
  process.env.SESSION_SECRET = 'test-only session secret';
  process.env.FRONTEND_URL = 'http://localhost:3001';
  process.env.AUTH_DEBUG_LINKS = 'false';
  const { app } = await import('../server.js');

  const detail = await request(app, 'GET', `/chats/${projectId}?source=bookmark`);
  assert.equal(detail.status, 302);
  assert.equal(detail.headers.location, `http://localhost:3001/chats/${projectId}?source=bookmark`);

  for (const [method, path] of [
    ['PUT', `/profiles/${owner}`],
    ['DELETE', `/projects/${projectId}/comments/${visitor}`],
    ['POST', '/projects?_method=PUT'],
    ['POST', '/chats'],
  ]) {
    assert.equal((await request(app, method, path)).status, 405);
  }

  assert.equal((await request(app, 'GET', '/socket.io/')).status, 404);
  assert.equal((await request(app, 'GET', '/auth/logout')).status, 404);
  assert.equal((await request(app, 'POST', '/auth/logout', { origin: 'https://example.invalid' })).status, 403);
  assert.equal((await request(app, 'POST', '/auth/signup')).status, 503);
});

test('hidden project details and interactions are limited to the owner', async (t) => {
  const project = { _id: projectId, owner, visible: false };
  t.mock.method(Project, 'findById', () => ({
    select() { return this; },
    exec: async () => project,
  }));

  const invoke = async (handler, _id) => {
    const res = {
      statusCode: 200,
      headers: {},
      set(name, value) { this.headers[name] = value; return this; },
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.body = payload; return this; },
    };
    await handler({ params: { id: projectId.toString() }, user: _id ? { profile: { _id } } : undefined }, res);
    return res;
  };

  const guest = await invoke(getProject);
  assert.equal(guest.statusCode, 404);
  assert.equal(guest.headers['Cache-Control'], 'private, no-store');
  assert.equal((await invoke(getProject, owner)).body.project.id, projectId.toString());
  for (const handler of [getProject, getProjectSaveStatus, addProjectComment, saveProject]) {
    assert.equal((await invoke(handler, visitor)).statusCode, 404);
  }

  project.visible = true;
  assert.equal((await invoke(getProject)).statusCode, 200);
});

test('JSON routes enforce chat membership, admin role, draft account, and owner-only deletion', async (t) => {
  const thread = { _id: projectId, user1: { _id: owner }, user2: { _id: visitor }, messages: [] };
  t.mock.method(Chat, 'findById', () => ({ populate() { return this; }, exec: async () => thread }));
  const caller = new Types.ObjectId();
  const del = t.mock.method(Project, 'findOneAndDelete', (query) => ({
    exec: async () => query.owner.equals(owner) ? { _id: projectId } : null,
  }));
  const wrongProfile = { _id: owner, name: 'Owner' };
  const profileFind = t.mock.method(Profile, 'findById', () => ({ exec: async () => wrongProfile }));

  assert.equal((await request(apiWithViewer(), 'GET', `/api/chats/${projectId}`)).status, 401);
  assert.equal((await request(apiWithViewer(caller), 'GET', `/api/chats/${projectId}`)).status, 403);
  assert.equal((await request(apiWithViewer(owner), 'GET', `/api/chats/${projectId}`)).status, 200);
  assert.equal((await request(apiWithViewer(visitor), 'GET', '/api/admin/category-suggestions')).status, 403);
  assert.equal((await request(apiWithViewer(visitor), 'PUT', `/api/profiles/${owner}`)).status, 403);
  assert.equal(profileFind.mock.callCount(), 1);
  assert.equal((await request(apiWithViewer(visitor), 'GET', '/api/projects/draft', { 'x-draft-profile': owner.toString() })).status, 409);
  assert.equal((await request(apiWithViewer(visitor), 'DELETE', `/api/projects/${projectId}`)).status, 404);
  assert.equal((await request(apiWithViewer(owner), 'DELETE', `/api/projects/${projectId}`)).status, 204);
  assert.equal(del.mock.callCount(), 2);
});

test('chat creation requires another existing profile and reuses an existing conversation', async (t) => {
  const exists = t.mock.method(Profile, 'exists', async ({ _id }) => _id === visitor.toString());
  const thread = { _id: projectId, user1: { _id: owner }, user2: { _id: visitor }, messages: [] };
  const find = t.mock.method(Chat, 'findOne', () => ({
    populate() { return this; },
    exec: async () => thread,
  }));
  const create = t.mock.method(Chat, 'create', async () => { throw new Error('Unexpected chat creation'); });
  const invoke = async (user2) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await createChat({ user: { profile: { _id: owner } }, body: { user2 } }, res);
    return res;
  };

  for (const id of [undefined, 'invalid', owner.toString(), owner.toString().toUpperCase()]) {
    assert.equal((await invoke(id)).statusCode, 400);
  }
  assert.equal(exists.mock.callCount(), 0);
  assert.equal((await invoke(new Types.ObjectId().toString())).statusCode, 404);
  assert.equal(find.mock.callCount(), 0);
  const response = await invoke(visitor.toString());
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.chat.id, projectId.toString());
  assert.equal(find.mock.callCount(), 1);
  assert.equal(create.mock.callCount(), 0);
});

test('sign-in return paths, rich text, and historical step image names work offline', () => {
  assert.equal(safeReturnTo('/projects?category=Woodworking#latest'), '/projects?category=Woodworking#latest');
  assert.equal(safeReturnTo('https://example.invalid/projects'), '/');
  assert.equal(safeReturnTo('//example.invalid'), '/');
  const richText = sanitizeRichText('<p><strong>Cut the base</strong></p>');
  assert.equal(richText, '<p><strong>Cut the base</strong></p>');
  const image = 'https://assets.example.invalid/projects/825d6fb9-1c6b-436f-9b19-c0b891c5fc31-side%20view.png';
  assert.equal(getStoredPictureName(image), 'side view.png');
  const step = parseInstruction('[TIP] Cut the base: <p>Mark first.</p> (Images: side view.png; Position: before)');
  assert.equal(step.content, '<p>Mark first.</p>');
  assert.deepEqual(step.imageNames, [getStoredPictureName(image)]);
  assert.equal(step.imagePosition, 'before');
  assert.equal(parseInstruction('<p>Tip: mark first.</p>').content, '<p>Tip: mark first.</p>');
});
