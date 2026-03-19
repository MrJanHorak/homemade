import ProjectsBrowser from './projects-browser';
import { getJson } from '@/lib/api';

export const dynamic = 'force-dynamic';
const INITIAL_PROJECT_LIMIT = 12;
const VALID_SORTS = new Set(['newest', 'oldest', 'rating', 'difficulty']);

const getSingleSearchParam = (value) => {
  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return typeof value === 'string' ? value : '';
};

const normalizeSort = (value) => {
  const normalized = `${value || ''}`.trim().toLowerCase();

  return VALID_SORTS.has(normalized) ? normalized : 'newest';
};

const normalizeCategory = (value) => {
  const normalized = `${value || ''}`.trim();

  if (!normalized || normalized.toLowerCase() === 'all') {
    return 'all';
  }

  return normalized.slice(0, 80);
};

const normalizeQuery = (value) => `${value || ''}`.trim().slice(0, 120);

const normalizePage = (value) => {
  const parsed = Number.parseInt(`${value || ''}`, 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

const normalizeSaved = (value) => {
  const normalized = `${value || ''}`.trim().toLowerCase();

  return normalized === '1' || normalized === 'true';
};

const ProjectsPage = async ({ searchParams }) => {
  const params = await searchParams;
  const initialSort = normalizeSort(getSingleSearchParam(params?.sort));
  const initialCategory = normalizeCategory(
    getSingleSearchParam(params?.category),
  );
  const initialQuery = normalizeQuery(getSingleSearchParam(params?.query));
  const initialPage = normalizePage(getSingleSearchParam(params?.page));
  const initialSavedOnly = normalizeSaved(getSingleSearchParam(params?.saved));
  const requestParams = new URLSearchParams();

  requestParams.set('sort', initialSort);
  requestParams.set('limit', `${INITIAL_PROJECT_LIMIT}`);
  requestParams.set('page', `${initialPage}`);

  if (initialCategory !== 'all') {
    requestParams.set('category', initialCategory);
  }

  if (initialQuery) {
    requestParams.set('query', initialQuery);
  }

  const { projects, pagination } = await getJson(
    `/api/projects?${requestParams.toString()}`,
    {
      next: { revalidate: 30 },
    },
  );

  return (
    <div className='page-stack'>
      <section className='section-panel section-panel--tight'>
        <div className='section-panel__header'>
          <div>
            <p className='eyebrow'>Projects</p>
            <h1>Build logs, prototypes, and finished work</h1>
          </div>
          <p className='section-copy'>
            Browse the latest maker projects and open any build for the full
            process.
          </p>
        </div>

        <ProjectsBrowser
          initialProjects={projects}
          initialPagination={pagination}
          initialPageSize={INITIAL_PROJECT_LIMIT}
          initialControls={{
            sortBy: initialSort,
            categoryFilter: initialCategory,
            searchQuery: initialQuery,
            page: initialPage,
            savedOnly: initialSavedOnly,
          }}
        />
      </section>
    </div>
  );
};

export default ProjectsPage;
