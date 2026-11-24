import 'dotenv/config.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import createError from 'http-errors';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import logger from 'morgan';
import passport from 'passport';
import { passUserToView } from './middleware/middleware.js';

import './config/passport.js';

// require routes
import { router as authRouter } from './routes/auth.js';
import { router as apiRouter } from './routes/api.js';
import { router as frontendRouter } from './routes/frontend.js';

// create the express app
const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET;
const databaseUrl = process.env.DATABASE_URL;
const sessionMaxAgeMs = 7 * 24 * 60 * 60 * 1000;

if (isProduction && !databaseUrl) {
  throw new Error('DATABASE_URL is required in production to persist sessions.');
}
if (
  isProduction &&
  (!sessionSecret || sessionSecret === 'replace-me' || Buffer.byteLength(sessionSecret, 'utf8') < 32)
) {
  throw new Error('SESSION_SECRET must be a unique value of at least 32 bytes in production.');
}

const sessionStore = databaseUrl
  ? MongoStore.create({
      mongoUrl: databaseUrl,
      collectionName: 'sessions',
      ttl: Math.floor(sessionMaxAgeMs / 1000),
      autoRemove: 'native',
    })
  : undefined;
const allowedOrigins = new Set(
  [
    process.env.FRONTEND_URL,
    process.env.CLIENT_ORIGIN,
    process.env.API_BASE_URL,
    !isProduction && 'http://localhost:3001',
    !isProduction && 'http://localhost:3000',
  ].filter(Boolean),
);
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(createError(403, 'Origin is not allowed'));
  },
  credentials: true,
};

const proxyHops = Number(process.env.TRUST_PROXY_HOPS);
if (Number.isInteger(proxyHops) && proxyHops > 0) app.set('trust proxy', proxyHops);

// view engine setup
app.set('view engine', 'ejs');
app.set(
  'views',
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'views'),
);

// middleware
logger.token('pathname', (req) => req.originalUrl.split('?', 1)[0]);
app.use(cors(corsOptions));
app.use(logger(':method :pathname :status :response-time ms', {
  // OAuth callback query strings can contain credentials.
  skip: (req) => /^\/auth(?:\/|$)/i.test(req.originalUrl),
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  express.static(
    path.join(path.dirname(fileURLToPath(import.meta.url)), 'public'),
  ),
);

// session middleware
const sessionMiddleware = session({
  secret: sessionSecret,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: sessionMaxAgeMs,
  },
});
app.use(sessionMiddleware);

// passport middleware
app.use(passport.initialize());
app.use(passport.session());

//custom middleware
app.use(passUserToView);

app.use(['/api', '/auth'], (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();

  const origin = req.get('origin');
  const fetchSite = req.get('sec-fetch-site');
  if ((origin && allowedOrigins.has(origin)) || (!origin && !fetchSite)) return next();

  res.status(403).json({ error: 'Origin is not allowed' });
});

// router middleware
app.use('/auth', authRouter);
app.use('/api', apiRouter);
app.use(frontendRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (/^\/(?:api|auth)(?:\/|$)/i.test(req.path)) {
    if (err.name === 'MulterError') {
      const tooLarge = err.code === 'LIMIT_FILE_SIZE';
      res.status(tooLarge ? 413 : 400).json({
        error: tooLarge ? 'Each image must be 5 MB or smaller.' : 'The upload exceeds the allowed limits.',
      });
      return;
    }

    const status = err.status || 500;
    if (status >= 500) console.error(err.name || 'RequestError');
    res.status(status).json({ error: status < 500 ? err.message : 'Unable to complete the request.' });
    return;
  }

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error', {
    title: `🎊 ${err.status || 500} Error`,
  });
});

export { app };
