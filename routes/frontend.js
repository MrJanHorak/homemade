import { Router } from 'express';

const router = Router();
const pagePaths = [
  '/',
  '/projects', '/projects/new', '/projects/:id', '/projects/:id/edit',
  '/profiles', '/profiles/:id', '/profiles/:id/edit',
  '/search', '/chats', '/chats/:id',
];

router.get(pagePaths, (req, res, next) => {
  const origin = process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN ||
    (process.env.NODE_ENV === 'production' ? null : 'http://localhost:3001');

  if (!origin) {
    res.status(503).send('The frontend URL is not configured.');
    return;
  }

  try {
    const destination = new URL(origin);
    destination.pathname = req.path;
    const queryIndex = req.originalUrl.indexOf('?');
    destination.search = queryIndex === -1 ? '' : req.originalUrl.slice(queryIndex);
    res.redirect(302, destination.toString());
  } catch (error) {
    next(error);
  }
});

router.all(['/projects', '/projects/*', '/profiles', '/profiles/*', '/chats', '/chats/*'], (req, res) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    res.sendStatus(404);
    return;
  }

  res.set('Allow', 'GET, HEAD').status(405).json({
    error: 'Use the frontend or the JSON API for this action.',
  });
});

export { router };
