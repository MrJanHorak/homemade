import { cookies } from 'next/headers';
import { fetchApi } from './api';

const fetchForViewer = async (path) => {
  const session = (await cookies()).get('connect.sid');
  return fetchApi(path, {
    cache: 'no-store',
    headers: session ? { Cookie: `${session.name}=${encodeURIComponent(session.value)}` } : {},
  });
};

export { fetchForViewer };
