'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ProjectCard from '@/components/project-card';
import { API_BASE_URL } from '@/lib/api';
import categoryCatalog from '@/lib/categories';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'rating', label: 'Top rated' },
  { value: 'difficulty', label: 'Most difficult' },
];
const DEFAULT_CATEGORIES = [
  { value: 'all', label: 'All categories' },
  ...categoryCatalog.map(({ value, label }) => ({ value, label })),
];

const ProjectsBrowser = ({ initialProjects, initialPagination, initialPageSize = 12 }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.toString();
  const params = new URLSearchParams(urlQuery);
  const sort = SORT_OPTIONS.some((option) => option.value === params.get('sort'))
    ? params.get('sort') : 'newest';
  const category = (params.get('category') || '').trim().slice(0, 80) || 'all';
  const query = (params.get('query') || '').trim().slice(0, 120);
  const parsedPage = Number.parseInt(params.get('page'), 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const savedOnly = ['1', 'true'].includes(params.get('saved'));
  const requestKey = JSON.stringify([sort, category, query, page, savedOnly]);
  const [searchInput, setSearchInput] = useState(query);
  const [projects, setProjects] = useState(initialProjects);
  const [pagination, setPagination] = useState(initialPagination);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [savedIds, setSavedIds] = useState(new Set());
  const [loading, setLoading] = useState(savedOnly);
  const [resultKey, setResultKey] = useState(savedOnly ? '' : requestKey);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  const navigate = (changes) => {
    const next = new URLSearchParams(urlQuery);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === '' || value === null || value === false || (key === 'page' && value === 1)) next.delete(key);
      else next.set(key, String(value));
    });
    const suffix = next.toString();
    router.push(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
  };

  useEffect(() => { setSearchInput(query); }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    const request = new URLSearchParams({ sort, page: String(page), limit: String(initialPageSize) });
    if (category !== 'all') request.set('category', category);
    if (query) request.set('query', query);
    const endpoint = savedOnly ? '/api/profiles/me/saved-projects' : '/api/projects';
    setLoading(true);
    setError('');
    fetch(`${API_BASE_URL}${endpoint}?${request}`, { credentials: 'include', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 401 && savedOnly) throw new Error('Sign in to see your saved projects.');
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || 'Unable to load projects.');
        }
        return response.json();
      })
      .then((body) => {
        if (controller.signal.aborted) return;
        setProjects(Array.isArray(body.projects) ? body.projects : []);
        setPagination(body.pagination);
        setResultKey(requestKey);
      })
      .catch((err) => { if (!controller.signal.aborted) { setError(err.message || 'Unable to load projects.'); setResultKey(requestKey); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [sort, category, query, page, savedOnly, initialPageSize, retry, requestKey]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/categories`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((body) => {
        if (!body || controller.signal.aborted) return;
        const unique = new Map();
        [...(body.categories || []), ...(body.promotedCategories || [])].forEach((entry) => {
          if (entry?.value && entry?.label) unique.set(entry.value, { value: entry.value, label: entry.label });
        });
        if (unique.size) setCategories([{ value: 'all', label: 'All categories' }, ...unique.values()]);
      }).catch(() => {});
    fetch(`${API_BASE_URL}/api/profiles/me/saved-projects`, { credentials: 'include', signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((body) => { if (body && !controller.signal.aborted) setSavedIds(new Set((body.projects || []).map((project) => project.id))); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const clearFilters = () => router.push(pathname, { scroll: false });
  const hasFilters = Boolean(query || category !== 'all' || savedOnly || sort !== 'newest');
  const isPending = loading || resultKey !== requestKey;

  return (
    <>
      <div className='projects-filter-row'>
        <form className='projects-filter-row__search' onSubmit={(event) => { event.preventDefault(); navigate({ query: searchInput.trim().slice(0, 120), page: 1 }); }}>
          <label className='projects-filter-row__field'>
            <span>Search projects</span>
            <input type='search' value={searchInput} onChange={(event) => setSearchInput(event.target.value)} maxLength={120} placeholder='Title, maker, or description' />
          </label>
          <button type='submit' className='button button--ghost button--compact'>Find</button>
          {query ? <button type='button' className='button button--ghost button--compact' onClick={() => { setSearchInput(''); navigate({ query: '', page: 1 }); }}>Clear</button> : null}
        </form>
        <label className='projects-filter-row__field'>
          <span>Sort</span>
          <select value={sort} onChange={(event) => navigate({ sort: event.target.value, page: 1 })}>
            {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className='projects-filter-row__field'>
          <span>Category</span>
          <select value={category} onChange={(event) => navigate({ category: event.target.value === 'all' ? '' : event.target.value, page: 1 })}>
            {!categories.some((option) => option.value === category) ? <option value={category}>{category}</option> : null}
            {categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className='projects-filter-row__toggle'>
          <input type='checkbox' checked={savedOnly} onChange={(event) => navigate({ saved: event.target.checked ? '1' : '', page: 1 })} />
          <span>Show saved only</span>
        </label>
      </div>
      <div aria-live='polite' aria-atomic='true'>
        {isPending ? <p className='helper-copy'>Loading projects...</p> : null}
        {!isPending && error ? <p className='form-error'>{error} {savedOnly && error === 'Sign in to see your saved projects.' ? <Link href={`/auth/sign-in?returnTo=${encodeURIComponent(`${pathname}?${urlQuery}`)}`}>Sign in</Link> : <button type='button' onClick={() => setRetry((value) => value + 1)}>Try again</button>}</p> : null}
        {!isPending && !error && pagination?.total > 0 ? <p className='helper-copy'>Showing {projects.length} of {pagination.total} projects{query ? ` for "${query}"` : ''}.</p> : null}
      </div>
      {!isPending && !error ? (
        <>
          <div className='project-grid'>
            {projects.length ? projects.map((project) => <ProjectCard key={project.id} project={project} isSaved={savedOnly || savedIds.has(project.id)} />) : <p className='empty-copy'>No projects match this filter yet. {hasFilters || page > 1 ? <button type='button' onClick={clearFilters}>Clear filters</button> : null}</p>}
          </div>
          {pagination?.totalPages > 1 || page > 1 ? (
            <div className='projects-pagination'>
              <button type='button' className='button button--ghost button--compact' onClick={() => navigate({ page: page - 1 })} disabled={page <= 1}>Previous</button>
              <p className='projects-pagination__status'>Page {pagination.page} of {pagination.totalPages}</p>
              <button type='button' className='button button--ghost button--compact' onClick={() => navigate({ page: page + 1 })} disabled={!pagination.hasNextPage}>Next</button>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
};

export default ProjectsBrowser;
