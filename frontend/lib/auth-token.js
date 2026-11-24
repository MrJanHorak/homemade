const removeTokenFromAddress = (browser) => {
  const url = new URL(browser.location.href);
  if (!url.searchParams.has('token')) return;
  url.searchParams.delete('token');
  browser.history.replaceState(browser.history.state, '', `${url.pathname}${url.search}${url.hash}`);
};

export { removeTokenFromAddress };
