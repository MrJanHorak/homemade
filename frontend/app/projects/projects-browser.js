'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import ProjectCard from '@/components/project-card';
import { API_BASE_URL } from '@/lib/api';
import categoryCatalog from '@/lib/categories';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'rating', label: 'Top rated' },
  { value: 'difficulty', label: 'Most difficult' },
];

const DEFAULT_CATEGORY_OPTIONS = [
  { value: 'all', label: 'All categories' },
  ...categoryCatalog.map((category) => ({
    value: category.value,
    label: category.label,
  })),
];

const DEFAULT_PAGINATION = {
  page: 1,
  limit: 12,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

const buildProjectsQuery = ({ sortBy, category, query, page, limit }) => {
  const params = new URLSearchParams();
  params.set('sort', sortBy);
  params.set('page', `${page}`);
  params.set('limit', `${limit}`);

  if (category && category !== 'all') {
    params.set('category', category);
  }

  if (query) {
    params.set('query', query);
  }

  return params.toString();
};

const ProjectsBrowser = ({
  initialProjects,
  initialPagination,
  initialPageSize = 12,
  initialControls,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const initialSortBy = initialControls?.sortBy || 'newest';
  const initialCategory = initialControls?.categoryFilter || 'all';
  const initialQuery = initialControls?.searchQuery || '';
  const initialPage = initialControls?.page || 1;
  const initialSavedOnly = Boolean(initialControls?.savedOnly);

  const [projects, setProjects] = useState(initialProjects);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [page, setPage] = useState(initialPagination?.page || initialPage);
  const [pageSize] = useState(initialPageSize);
  const [pagination, setPagination] = useState(
    initialPagination || {
      ...DEFAULT_PAGINATION,
      limit: initialPageSize,
      total: initialProjects.length,
    },
  );
  const [categoryOptions, setCategoryOptions] = useState(
    DEFAULT_CATEGORY_OPTIONS,
  );
  const [savedProjectIds, setSavedProjectIds] = useState(new Set());
  const [showSavedOnly, setShowSavedOnly] = useState(initialSavedOnly);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [error, setError] = useState('');

  const updateBrowserUrl = ({ sort, category, query, page, savedOnly }) => {
    const params = new URLSearchParams();

    params.set('sort', sort);

    if (category && category !== 'all') {
      params.set('category', category);
    }

    if (query) {
      params.set('query', query);
    }

    if (page > 1) {
      params.set('page', `${page}`);
    }

    if (savedOnly) {
      params.set('saved', '1');
    }

    const queryString = params.toString();
    const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  const loadProjects = async ({
    savedOnly,
    sort: nextSort = sortBy,
    category: nextCategory = categoryFilter,
    query: nextQuery = searchQuery,
    page: nextPage = page,
    syncUrl = true,
    authOverride,
  } = {}) => {
    const query = buildProjectsQuery({
      sortBy: nextSort,
      category: nextCategory,
      query: nextQuery,
      page: nextPage,
      limit: pageSize,
    });
    const endpoint = savedOnly
      ? '/api/profiles/me/saved-projects'
      : '/api/projects';

    if (savedOnly && !(authOverride ?? isAuthenticated)) {
      setError('Sign in to filter by saved projects.');
      setShowSavedOnly(false);

      if (syncUrl) {
        updateBrowserUrl({
          sort: nextSort,
          category: nextCategory,
          query: nextQuery,
          page: 1,
          savedOnly: false,
        });
      }

      return;
    }

    setError('');
    setIsLoadingSaved(savedOnly);
    setIsLoadingProjects(!savedOnly);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}?${query}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to load projects');
      }

      const payload = await response.json();
      const nextProjects = Array.isArray(payload.projects)
        ? payload.projects
        : [];
      const nextPagination =
        payload.pagination && typeof payload.pagination === 'object'
          ? payload.pagination
          : {
              ...DEFAULT_PAGINATION,
              page: nextPage,
              limit: pageSize,
              total: nextProjects.length,
              totalPages: 1,
            };

      setProjects(nextProjects);
      setPagination(nextPagination);
      setPage(nextPagination.page || nextPage);

      if (syncUrl) {
        updateBrowserUrl({
          sort: nextSort,
          category: nextCategory,
          query: nextQuery,
          page: nextPagination.page || nextPage,
          savedOnly,
        });
      }
    } catch (requestError) {
      setError(requestError.message || 'Unable to load projects');

      if (savedOnly) {
        setShowSavedOnly(false);

        if (syncUrl) {
          updateBrowserUrl({
            sort: nextSort,
            category: nextCategory,
            query: nextQuery,
            page: 1,
            savedOnly: false,
          });
        }
      }
    } finally {
      setIsLoadingSaved(false);
      setIsLoadingProjects(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/session/current`, {
          credentials: 'include',
        });

        if (!response.ok) {
          return;
        }

        const session = await response.json();
        if (isMounted) {
          setIsAuthenticated(Boolean(session.authenticated));

          if (session.authenticated) {
            try {
              const savedResponse = await fetch(
                `${API_BASE_URL}/api/profiles/me/saved-projects`,
                {
                  credentials: 'include',
                },
              );

              if (savedResponse.ok) {
                const savedPayload = await savedResponse.json();
                const saved = Array.isArray(savedPayload.projects)
                  ? savedPayload.projects
                  : [];
                if (isMounted) {
                  setSavedProjectIds(
                    new Set(saved.map((project) => project.id)),
                  );
                }
              }
            } catch {
              // Silent fail - user can still see main list
            }

            if (initialSavedOnly) {
              await loadProjects({
                savedOnly: true,
                sort: initialSortBy,
                category: initialCategory,
                query: initialQuery,
                page: initialPage,
                authOverride: true,
              });
            }
          } else if (initialSavedOnly) {
            setShowSavedOnly(false);
            updateBrowserUrl({
              sort: initialSortBy,
              category: initialCategory,
              query: initialQuery,
              page: initialPage,
              savedOnly: false,
            });
          }
        }
      } catch {
        if (isMounted) {
          setIsAuthenticated(false);

          if (initialSavedOnly) {
            setShowSavedOnly(false);
            updateBrowserUrl({
              sort: initialSortBy,
              category: initialCategory,
              query: initialQuery,
              page: initialPage,
              savedOnly: false,
            });
          }
        }
      }
    };

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      const loadCategoryOptions = async () => {
        const response = await fetch(`${API_BASE_URL}/api/categories`, {
          credentials: 'include',
        });

        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        const standard = Array.isArray(payload.categories)
          ? payload.categories
          : [];
        const promoted = Array.isArray(payload.promotedCategories)
          ? payload.promotedCategories
          : [];
        const unique = new Map();

        [...standard, ...promoted].forEach((entry) => {
          if (!entry?.value || !entry?.label) {
            return;
          }

          unique.set(entry.value, {
            value: entry.value,
            label: entry.label,
          });
        });

        if (unique.size) {
          setCategoryOptions([
            { value: 'all', label: 'All categories' },
            ...Array.from(unique.values()),
          ]);
        }
      };

      loadCategoryOptions();
    } catch {
      // Silent fallback to static categories list
    }
  }, []);

  const handleSavedOnlyToggle = async (event) => {
    const nextValue = event.target.checked;
    setShowSavedOnly(nextValue);

    await loadProjects({ savedOnly: nextValue, page: 1 });
  };

  const handleSortChange = async (event) => {
    const nextSort = event.target.value;
    setSortBy(nextSort);
    await loadProjects({ savedOnly: showSavedOnly, sort: nextSort, page: 1 });
  };

  const handleCategoryChange = async (event) => {
    const nextCategory = event.target.value;
    setCategoryFilter(nextCategory);
    await loadProjects({
      savedOnly: showSavedOnly,
      category: nextCategory,
      page: 1,
    });
  };

  const handleSearchSubmit = async (event) => {
    event.preventDefault();

    const nextQuery = searchInput.trim();
    setSearchQuery(nextQuery);

    await loadProjects({
      savedOnly: showSavedOnly,
      query: nextQuery,
      page: 1,
    });
  };

  const handleClearSearch = async () => {
    setSearchInput('');
    setSearchQuery('');

    await loadProjects({
      savedOnly: showSavedOnly,
      query: '',
      page: 1,
    });
  };

  const handlePageChange = async (nextPage) => {
    await loadProjects({
      savedOnly: showSavedOnly,
      page: nextPage,
    });
  };

  return (
    <>
      <div className='projects-filter-row'>
        <form
          className='projects-filter-row__search'
          onSubmit={handleSearchSubmit}
        >
          <label className='projects-filter-row__field'>
            <span>Search projects</span>
            <input
              type='search'
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
              }}
              placeholder='Title, owner, category, or keywords'
              disabled={isLoadingProjects || isLoadingSaved}
            />
          </label>
          <button
            type='submit'
            className='button button--ghost button--compact'
            disabled={isLoadingProjects || isLoadingSaved}
          >
            Find
          </button>
          {searchQuery ? (
            <button
              type='button'
              className='button button--ghost button--compact'
              onClick={handleClearSearch}
              disabled={isLoadingProjects || isLoadingSaved}
            >
              Clear
            </button>
          ) : null}
        </form>

        <label className='projects-filter-row__field'>
          <span>Sort</span>
          <select
            value={sortBy}
            onChange={handleSortChange}
            disabled={isLoadingProjects || isLoadingSaved}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className='projects-filter-row__field'>
          <span>Category</span>
          <select
            value={categoryFilter}
            onChange={handleCategoryChange}
            disabled={isLoadingProjects || isLoadingSaved}
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className='projects-filter-row__toggle'>
          <input
            type='checkbox'
            checked={showSavedOnly}
            onChange={handleSavedOnlyToggle}
            disabled={isLoadingSaved || isLoadingProjects}
          />
          <span>{isLoadingSaved ? 'Loading saved...' : 'Show saved only'}</span>
        </label>
      </div>

      {isLoadingProjects ? (
        <p className='helper-copy'>Loading projects...</p>
      ) : null}

      {error ? <p className='form-error'>{error}</p> : null}

      {!error && pagination.total ? (
        <p className='helper-copy'>
          Showing {projects.length} of {pagination.total} projects
          {searchQuery ? ` for "${searchQuery}"` : ''}.
        </p>
      ) : null}

      <div className='project-grid'>
        {projects.length ? (
          projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isSaved={savedProjectIds.has(project.id)}
            />
          ))
        ) : (
          <p className='empty-copy'>No projects match this filter yet.</p>
        )}
      </div>

      {pagination.totalPages > 1 ? (
        <div className='projects-pagination'>
          <button
            type='button'
            className='button button--ghost button--compact'
            onClick={() => {
              handlePageChange(pagination.page - 1);
            }}
            disabled={
              !pagination.hasPrevPage || isLoadingProjects || isLoadingSaved
            }
          >
            Previous
          </button>

          <p className='projects-pagination__status'>
            Page {pagination.page} of {pagination.totalPages}
          </p>

          <button
            type='button'
            className='button button--ghost button--compact'
            onClick={() => {
              handlePageChange(pagination.page + 1);
            }}
            disabled={
              !pagination.hasNextPage || isLoadingProjects || isLoadingSaved
            }
          >
            Next
          </button>
        </div>
      ) : null}
    </>
  );
};

export default ProjectsBrowser;
