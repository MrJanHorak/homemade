import 'dotenv/config.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import createError from 'http-errors';
import cors from 'cors';
import session from 'express-session';
import logger from 'morgan';
import methodOverride from 'method-override';
import passport from 'passport';
import { passUserToView } from './middleware/middleware.js';

// connect to MongoDB with mongoose
import('./config/database.js');

// load passport
import('./config/passport.js');

// require routes
import { router as indexRouter } from './routes/index.js';
import { router as authRouter } from './routes/auth.js';
import { router as projectRouter } from './routes/projects.js';
import { router as profileRouter } from './routes/profiles.js';
import { router as searchRouter } from './routes/search.js';
import { router as chatRouter } from './routes/chats.js';
import { router as apiRouter } from './routes/api.js';

// create the express app
const app = express();
const allowedOrigins = new Set(
  [
    process.env.FRONTEND_URL,
    process.env.CLIENT_ORIGIN,
    'http://localhost:3001',
  ].filter(Boolean),
);
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

// view engine setup
app.set('view engine', 'ejs');
app.set(
  'views',
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'views'),
);

// middleware
app.use(cors(corsOptions));
app.use(methodOverride('_method'));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  express.static(
    path.join(path.dirname(fileURLToPath(import.meta.url)), 'public'),
  ),
);

// session middleware
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: 'lax',
  },
});
app.use(sessionMiddleware); // Use the middleware

// passport middleware
app.use(passport.initialize());
app.use(passport.session());

//custom middleware
app.use(passUserToView);

// router middleware
app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/projects', projectRouter);
app.use('/profiles', profileRouter);
app.use('/search', searchRouter);
app.use('/chats', chatRouter);
app.use('/api', apiRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error', {
    title: `🎊 ${err.status || 500} Error`,
  });
});

export { app, sessionMiddleware };
