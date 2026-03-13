import { Router } from 'express';
import passport from 'passport';

const router = Router();

const getFrontendBaseUrl = () => process.env.FRONTEND_URL || '/';

const sanitizeReturnTo = (returnTo) => {
  if (typeof returnTo !== 'string') {
    return null;
  }

  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) {
    return null;
  }

  return returnTo;
};

const buildFrontendRedirect = (returnTo = '/') => {
  const frontendBaseUrl = getFrontendBaseUrl();

  if (frontendBaseUrl === '/') {
    return returnTo;
  }

  return new URL(returnTo, frontendBaseUrl).toString();
};

router.get(
  '/google',
  (req, res, next) => {
    const returnTo = sanitizeReturnTo(req.query.returnTo);

    if (returnTo) {
      req.session.returnTo = returnTo;
    }

    next();
  },
  passport.authenticate('google', { scope: ['profile', 'email'] }),
);

router.get(
  '/google/oauth2callback',
  passport.authenticate('google', {
    failureRedirect: '/auth/google',
  }),
  (req, res) => {
    const returnTo = sanitizeReturnTo(req.session.returnTo) || '/';
    delete req.session.returnTo;
    res.redirect(buildFrontendRedirect(returnTo));
  },
);

router.get('/logout', function (req, res) {
  req.logout(() => res.redirect(buildFrontendRedirect('/')));
});

export { router };
