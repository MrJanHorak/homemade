const passUserToView = (req, res, next) => {
  res.locals.user = req.user ? req.user : null;
  next();
};

const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.redirect('/auth/google');
};

const isApiLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Authentication required' });
};

export { isApiLoggedIn, passUserToView, isLoggedIn };
