import { redirect } from 'next/navigation';

const SearchPage = async ({ searchParams }) => {
  const params = await searchParams;
  const value = Array.isArray(params?.query) ? params.query[0] : params?.query;
  const query = typeof value === 'string' ? value.trim().slice(0, 120) : '';
  const destination = new URLSearchParams();
  if (query) destination.set('query', query);
  redirect(destination.size ? `/projects?${destination}` : '/projects');
};

export default SearchPage;
