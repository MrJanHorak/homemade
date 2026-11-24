import Link from 'next/link';
import ProjectCard from '@/components/project-card';
import { getJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

const HomePage = async () => {
  const { projects } = await getJson('/api/projects?sort=latest&limit=6', {
    next: { revalidate: 60 },
  });

  return (
    <div className='page-stack'>
      <section className='hero-panel hero-panel--diy'>
        <div className='hero-panel__copy'>
          <p className='eyebrow'>Made by the community</p>
          <h1>Show what you built, how you built it, and what you learned.</h1>
          <p>
            Homemade is for people who care about the process as much as the
            finished piece. Share the steps, materials, tools, and context that
            help another maker build something better.
          </p>

          <div className='hero-panel__actions'>
            <Link href='/projects' className='button'>
              Explore projects
            </Link>
            <Link href='/projects/new' className='button button--ghost'>
              Share a build
            </Link>
          </div>
        </div>

        <div className='hero-panel__stats'>
          <div className='stat-card stat-card--diy'>
            <span className='stat-card__value'>Share</span>
            <span className='stat-card__label'>Your projects and what you learned</span>
          </div>
          <div className='stat-card stat-card--diy'>
            <span className='stat-card__value'>Build</span>
            <span className='stat-card__label'>
              Instructions, materials, and tools
            </span>
          </div>
          <div className='stat-card stat-card--diy'>
            <span className='stat-card__value'>Meet</span>
            <span className='stat-card__label'>
              The creators behind each project
            </span>
          </div>
        </div>
      </section>

      <section className='section-panel'>
        <div className='section-panel__header'>
          <div>
            <p className='eyebrow'>Latest builds</p>
            <h2>Recent work from the community</h2>
          </div>
          <Link href='/projects' className='button button--ghost'>
            View all projects
          </Link>
        </div>

        {projects.length ? <div className='project-grid'>
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} diyTone='bold' />
          ))}
        </div> : <p className='empty-copy'>No builds have been shared yet. <Link href='/projects/new'>Share the first build</Link>.</p>}
      </section>
    </div>
  );
};

export default HomePage;
