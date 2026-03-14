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

const isApiAdmin = (req, res, next) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user?.profile?.role === 'admin') {
    next();
    return;
  }

  res.status(403).json({ error: 'Admin role required' });
};

export { isApiAdmin, isApiLoggedIn, passUserToView, isLoggedIn };
