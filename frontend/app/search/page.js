import ProjectCard from '@/components/project-card';
import { getJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

const SearchPage = async ({ searchParams }) => {
  const query =
    typeof searchParams.query === 'string' ? searchParams.query : '';
  const { results } = await getJson(
    `/api/search?query=${encodeURIComponent(query)}`,
    {
      cache: 'no-store',
    },
  );

  return (
    <div className='page-stack'>
      <section className='section-panel section-panel--tight'>
        <div className='section-panel__header'>
          <div>
            <p className='eyebrow'>Search</p>
            <h1>{query ? `Results for “${query}”` : 'Search the workshop'}</h1>
          </div>
          <p className='section-copy'>
            Search titles and descriptions to find a build, technique, or
            toolchain.
          </p>
        </div>

        {results.length ? (
          <div className='project-grid'>
            {results.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <p className='empty-copy'>No matching projects yet.</p>
        )}
      </section>
    </div>
  );
};

export default SearchPage;
