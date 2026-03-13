const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

const buildUrl = (path) => `${API_BASE_URL}${path}`;

const fetchApi = async (path, options = {}) => {
  const { headers, ...rest } = options;

  return fetch(buildUrl(path), {
    headers: {
      Accept: 'application/json',
      ...headers,
    },
    ...rest,
  });
};

const getJson = async (path, options = {}) => {
  const response = await fetchApi(path, options);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
};

export { API_BASE_URL, buildUrl, fetchApi, getJson };
