import assert from 'node:assert/strict';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Duplex } from 'node:stream';
import { test } from 'node:test';
import { Types } from 'mongoose';
import express from 'express';
import { getProject, getProjectSaveStatus, addProjectComment, saveProject, createChat, saveProjectDraft, addChatMessage, editChatMessage } from '../controllers/api.js';
import { Project } from '../models/project.js';
import { Chat } from '../models/chat.js';
import { Profile } from '../models/profile.js';
import { CategorySuggestion } from '../models/categorySuggestion.js';
import { ProjectDraft } from '../models/projectDraft.js';
import { router as apiRouter } from '../routes/api.js';
import { safeReturnTo } from '../lib/return-to.js';
import { sanitizeRichText } from '../lib/rich-text.js';
import { getStoredPictureName, resolveInstructionImageIndexes } from '../frontend/lib/project-images.js';
import { parseInstruction } from '../frontend/lib/project-instructions.js';
import { clearMissingDraftAttachments, moveSelectedImage, removeSelectedImage } from '../frontend/lib/project-image-selection.js';
import { MAX_CHAT_MESSAGE_LENGTH, validateChatMessage } from '../lib/chat-message.js';
import { createAuthRateLimit } from '../middleware/authRateLimit.js';
import { router as authRouter } from '../routes/auth.js';

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

test('email auth requests are limited per IP and recover after the window', async () => {
  let clock = 0;
  const limit = createAuthRateLimit({ limit: 2, windowMs: 10000, maxKeys: 3, now: () => clock });
  const call = (ip) => {
    const result = { headers: {}, statusCode: 200, allowed: false,
      set(name, value) { this.headers[name] = value; return this; },
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; } };
    limit({ ip }, result, () => { result.allowed = true; });
    return result;
  };
  assert.equal(call('one').allowed, true);
  assert.equal(call('one').allowed, true);
  assert.equal(call('two').allowed, true);
  const blocked = call('one');
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.headers['Retry-After'], '10');
  clock = 10000;
  assert.equal(call('one').allowed, true);

  const app = express();
  app.use((req, res, next) => { req.body = {}; next(); });
  app.use('/auth', authRouter);
  let first = await request(app, 'POST', '/auth/magic-link/consume');
  assert.equal(first.status, 400);
  let last = first;
  for (let count = 0; count < 31 && last.status !== 429; count += 1) {
    last = await request(app, 'POST', '/auth/magic-link/consume');
  }
  assert.equal(last.status, 429);
  assert.ok(Number(last.headers['retry-after']) > 0);
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
  thread.hiddenBy = [owner];
  assert.equal((await request(apiWithViewer(owner), 'GET', `/api/chats/${projectId}`)).status, 404);
  const otherView = await request(apiWithViewer(visitor), 'GET', `/api/chats/${projectId}`);
  assert.equal(otherView.status, 200);
  assert.equal(otherView.headers['cache-control'], 'private, no-store');
  assert.equal((await request(apiWithViewer(visitor), 'GET', '/api/admin/category-suggestions')).status, 403);
  assert.equal((await request(apiWithViewer(visitor), 'PUT', `/api/profiles/${owner}`)).status, 403);
  assert.equal(profileFind.mock.callCount(), 1);
  assert.equal((await request(apiWithViewer(visitor), 'GET', '/api/projects/draft', { 'x-draft-profile': owner.toString() })).status, 409);
  assert.equal((await request(apiWithViewer(visitor), 'DELETE', `/api/projects/${projectId}`)).status, 404);
  assert.equal((await request(apiWithViewer(owner), 'DELETE', `/api/projects/${projectId}`)).status, 204);
  assert.equal(del.mock.callCount(), 2);
});

test('chat inbox summaries select the latest message while retaining the legacy response', async (t) => {
  assert.deepEqual(Chat.find().slice('messages', -1).projection(), { messages: { $slice: -1 } });
  const oldMessage = { _id: new Types.ObjectId(), message: 'older message' };
  const newMessage = { _id: new Types.ObjectId(), message: 'latest message' };
  const slices = [];
  const find = t.mock.method(Chat, 'find', () => {
    let summary = false;
    return {
      slice(path, count) { slices.push([path, count]); summary = true; return this; },
      populate() { return this; },
      sort() { return this; },
      exec: async () => [{ _id: projectId, user1: { _id: owner }, user2: { _id: visitor }, messages: summary ? [newMessage] : [oldMessage, newMessage] }],
    };
  });
  assert.equal((await request(apiWithViewer(), 'GET', '/api/chats?summary=1')).status, 401);
  const summary = await request(apiWithViewer(owner), 'GET', '/api/chats?summary=1');
  assert.equal(summary.status, 200);
  assert.equal(summary.headers['cache-control'], 'private, no-store');
  assert.match(summary.output, /latest message/);
  assert.doesNotMatch(summary.output, /older message/);
  assert.deepEqual(slices, [['messages', -1]]);
  const filter = find.mock.calls[0].arguments[0];
  assert.ok(filter.hiddenBy.$nin[0].equals(owner));
  assert.ok(filter.$or[0].user1.equals(owner));
  const legacy = await request(apiWithViewer(owner), 'GET', '/api/chats');
  assert.match(legacy.output, /older message/);
  assert.equal(slices.length, 1);
});

test('chat writes reject malformed and oversized text without weakening participant or author checks', async (t) => {
  const chat = new Chat({ _id: projectId, user1: owner, user2: visitor, messages: [{ user: owner, message: 'Original' }] });
  const messageId = chat.messages[0]._id;
  t.mock.method(Chat, 'findById', () => ({ exec: async () => chat }));
  const save = t.mock.method(chat, 'save', async () => { throw new Error('Unexpected write'); });
  const invoke = async (handler, viewer, message) => {
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await handler({ params: { chatId: String(projectId), messageId: String(messageId) }, user: { profile: { _id: viewer } }, body: { message } }, res);
    return res;
  };
  for (const message of [null, {}, [], 1, '   ', 'x'.repeat(MAX_CHAT_MESSAGE_LENGTH + 1)]) {
    assert.equal((await invoke(addChatMessage, owner, message)).statusCode, 400);
    assert.equal((await invoke(editChatMessage, owner, message)).statusCode, 400);
  }
  assert.equal((await invoke(addChatMessage, new Types.ObjectId(), 'hello')).statusCode, 403);
  assert.equal((await invoke(editChatMessage, visitor, 'hello')).statusCode, 403);
  assert.equal(save.mock.callCount(), 0);
  assert.deepEqual(validateChatMessage('  hello  '), { message: 'hello' });
  assert.equal(validateChatMessage('x'.repeat(MAX_CHAT_MESSAGE_LENGTH)).message.length, MAX_CHAT_MESSAGE_LENGTH);
  assert.equal(chat.messages[0].message, 'Original');
});

test('rating lookup requires a viewer, respects visibility, and returns only that viewer’s score', async (t) => {
  const other = new Types.ObjectId();
  const project = {
    _id: projectId, owner, visible: true,
    ratings: [{ owner: visitor, value: 4 }, { owner: other, value: 2 }],
    rating: [5],
  };
  t.mock.method(Project, 'findById', () => ({ select() { return this; }, exec: async () => project }));
  const path = `/api/projects/${projectId}/rating`;
  assert.equal((await request(apiWithViewer(), 'GET', path)).status, 401);
  const response = await request(apiWithViewer(visitor), 'GET', path);
  assert.equal(response.status, 200);
  assert.equal(response.headers['cache-control'], 'private, no-store');
  assert.match(response.output, /\{"rating":4\}/);
  assert.match((await request(apiWithViewer(owner), 'GET', path)).output, /\{"rating":null\}/);
  project.visible = false;
  assert.equal((await request(apiWithViewer(visitor), 'GET', path)).status, 404);
  assert.equal((await request(apiWithViewer(owner), 'GET', path)).status, 200);
});

test('comment deletion requires visibility and author or admin permissions', async (t) => {
  const commentId = new Types.ObjectId();
  const project = { _id: projectId, owner, visible: true, comments: [{ _id: commentId, owner: visitor }] };
  t.mock.method(Project, 'findById', () => ({ select() { return this; }, exec: async () => project }));
  const update = t.mock.method(Project, 'updateOne', () => ({ exec: async () => ({ modifiedCount: 1 }) }));
  const path = `/api/projects/${projectId}/comments/${commentId}`;
  const other = new Types.ObjectId();
  assert.equal((await request(apiWithViewer(), 'DELETE', path)).status, 401);
  assert.equal((await request(apiWithViewer(owner), 'DELETE', path)).status, 403);
  assert.equal((await request(apiWithViewer(other), 'DELETE', path)).status, 403);
  assert.equal(update.mock.callCount(), 0);
  assert.equal((await request(apiWithViewer(visitor), 'DELETE', path)).status, 204);
  const authorQuery = update.mock.calls[0].arguments[0];
  assert.ok(authorQuery.comments.$elemMatch.owner.equals(visitor));
  assert.ok(authorQuery.$or[1].owner.equals(visitor));
  assert.equal((await request(apiWithViewer(other, 'admin'), 'DELETE', path)).status, 204);
  assert.equal(update.mock.calls[1].arguments[0].comments.$elemMatch.owner, undefined);
  project.visible = false;
  assert.equal((await request(apiWithViewer(visitor), 'DELETE', path)).status, 404);
  assert.equal((await request(apiWithViewer(other, 'admin'), 'DELETE', path)).status, 404);
  assert.equal((await request(apiWithViewer(owner, 'admin'), 'DELETE', path)).status, 204);
  assert.equal((await request(apiWithViewer(owner), 'DELETE', `/api/projects/${projectId}/comments/invalid`)).status, 404);
});

test('maker filters use bounded literal values and count only visible projects for matches', async (t) => {
  const profile = { _id: visitor, name: 'A. Maker', skills: ['Woodworking'] };
  const findProfiles = t.mock.method(Profile, 'find', () => ({ sort() { return this; }, exec: async () => [profile] }));
  const findProjects = t.mock.method(Project, 'find', () => ({ select() { return this; }, exec: async () => [{ owner: visitor }] }));
  const response = await request(apiWithViewer(), 'GET', '/api/profiles?name=A.%2A&skill=Woodworking');
  assert.equal(response.status, 200);
  assert.deepEqual(findProfiles.mock.calls[0].arguments[0], {
    name: { $regex: 'A\\.\\*', $options: 'i' },
    skills: { $regex: '^Woodworking$', $options: 'i' },
  });
  const projectFilter = findProjects.mock.calls[0].arguments[0];
  assert.equal(projectFilter.visible, true);
  assert.deepEqual(projectFilter.owner.$in, [visitor]);
  assert.match(response.output, /"projectCount":1/);
  await request(apiWithViewer(), 'GET', `/api/profiles?name=${'x'.repeat(100)}`);
  assert.equal(findProfiles.mock.calls[1].arguments[0].name.$regex.length, 80);
});

test('moderation pagination filters and sorts across the queue and remains admin-only', async (t) => {
  const calls = {};
  t.mock.method(CategorySuggestion, 'find', (filter) => {
    calls.filter = filter;
    return {
      sort(value) { calls.sort = value; return this; },
      skip(value) { calls.skip = value; return this; },
      limit(value) { calls.limit = value; return this; },
      exec: async () => [{ _id: projectId, label: 'A.*', status: 'approved' }],
    };
  });
  t.mock.method(CategorySuggestion, 'countDocuments', (filter) => {
    calls.countFilter = filter;
    return { exec: async () => 76 };
  });
  const path = '/api/admin/category-suggestions?status=approved&promoted=true&page=2&limit=25&query=A.%2A&sort=label&direction=asc';
  assert.equal((await request(apiWithViewer(visitor), 'GET', path)).status, 403);
  const response = await request(apiWithViewer(owner, 'admin'), 'GET', path);
  assert.equal(response.status, 200);
  assert.equal(response.headers['cache-control'], 'private, no-store');
  assert.deepEqual(calls.filter, { status: 'approved', promoted: true, label: { $regex: 'A\\.\\*', $options: 'i' } });
  assert.deepEqual(calls.countFilter, calls.filter);
  assert.deepEqual(calls.sort, { normalizedLabel: 1, _id: 1 });
  assert.equal(calls.skip, 25);
  assert.equal(calls.limit, 25);
  assert.match(response.output, /"total":76,"totalPages":4/);
});

test('chat creation requires another existing profile and reuses an existing conversation', async (t) => {
  const exists = t.mock.method(Profile, 'exists', async ({ _id }) => _id === visitor.toString());
  const thread = { _id: projectId, user1: { _id: owner }, user2: { _id: visitor }, messages: [] };
  const find = t.mock.method(Chat, 'findOne', () => ({
    populate() { return this; },
    exec: async () => thread,
  }));
  const create = t.mock.method(Chat, 'create', async () => { throw new Error('Unexpected chat creation'); });
  const unhide = t.mock.method(Chat, 'updateOne', () => ({ exec: async () => ({ modifiedCount: 1 }) }));
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
  thread.hiddenBy = [owner, visitor];
  assert.equal((await invoke(visitor.toString())).statusCode, 200);
  assert.equal(unhide.mock.callCount(), 1);
  assert.ok(unhide.mock.calls[0].arguments[1].$pull.hiddenBy.equals(owner));
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

test('moving and removing new images preserves step attachments to existing and selected images', () => {
  const form = {
    buildPictures: ['first', 'second', 'third'],
    buildSteps: [{ imageIndexes: [0, 2, 4] }, { imageIndexes: [3] }],
  };
  const moved = moveSelectedImage(form, 2, 0, 2);
  assert.deepEqual(moved.buildPictures, ['second', 'third', 'first']);
  assert.deepEqual(moved.buildSteps.map((step) => step.imageIndexes), [[0, 4, 3], [2]]);
  const removed = removeSelectedImage(moved, 2, 1);
  assert.deepEqual(removed.buildPictures, ['second', 'first']);
  assert.deepEqual(removed.buildSteps.map((step) => step.imageIndexes), [[0, 3], [2]]);
  assert.deepEqual(form.buildPictures, ['first', 'second', 'third']);
  assert.equal(moveSelectedImage(form, 2, 0, -1), form);
  assert.equal(removeSelectedImage(form, 2, 3), form);
});

test('draft recovery clears unavailable attachments and retains image placement', async (t) => {
  const steps = [{ title: 'Cut', imageIndexes: [0, 2], imagePosition: 'before' }];
  assert.deepEqual(clearMissingDraftAttachments(steps), [{ title: 'Cut', imageIndexes: [], imagePosition: 'before' }]);
  assert.deepEqual(steps[0].imageIndexes, [0, 2]);
  let saved;
  t.mock.method(ProjectDraft, 'findOneAndUpdate', (filter, update) => {
    saved = update.$set;
    return { lean() { return this; }, exec: async () => ({ _id: projectId }) };
  });
  const res = { json(body) { this.body = body; return this; }, status(code) { this.statusCode = code; return this; } };
  await saveProjectDraft({ user: { profile: { _id: owner } }, body: { buildSteps: [...steps, { title: 'Finish' }] } }, res);
  assert.equal(saved.buildSteps[0].imagePosition, 'before');
  assert.equal(saved.buildSteps[1].imagePosition, 'after');
  const draft = new ProjectDraft({ owner, buildSteps: saved.buildSteps });
  assert.equal(draft.validateSync(), undefined);
  assert.equal(draft.buildSteps[0].imagePosition, 'before');
});

test('step image indexes distinguish duplicate and punctuation-heavy filenames while old names still resolve', () => {
  const pictures = [
    'https://assets.example.invalid/projects/825d6fb9-1c6b-436f-9b19-c0b891c5fc31-same.png',
    'https://assets.example.invalid/projects/412d6fb9-1c6b-436f-9b19-c0b891c5fc31-same.png',
    'https://assets.example.invalid/projects/212d6fb9-1c6b-436f-9b19-c0b891c5fc31-side%2C%20%28left%29.png',
  ];
  const stored = sanitizeRichText('Cut: <p>Mark first.</p> (Images: same.png; Indexes: 1, 2; Position: before)');
  const indexed = parseInstruction(stored);
  assert.deepEqual(indexed.imageIndexes, [1, 2]);
  assert.deepEqual(resolveInstructionImageIndexes(indexed, pictures), [1, 2]);
  assert.equal(indexed.imagePosition, 'before');
  const legacy = parseInstruction('Cut: Mark first. (Images: same.png; Position: after)');
  assert.equal(legacy.imageIndexes, null);
  assert.deepEqual(resolveInstructionImageIndexes(legacy, pictures), [0, 1]);
  assert.deepEqual(resolveInstructionImageIndexes(parseInstruction('Cut: Work. (Images: ; Indexes: 2, 999; Position: after)'), pictures), [2]);
});
