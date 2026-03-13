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
      <section className='hero-panel'>
        <div className='hero-panel__copy'>
          <p className='eyebrow'>Featured this week</p>
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
            <Link href='/profiles' className='button button--ghost'>
              Meet creators
            </Link>
          </div>
        </div>

        <div className='hero-panel__stats'>
          <div className='stat-card'>
            <span className='stat-card__value'>{projects.length}</span>
            <span className='stat-card__label'>Featured builds right now</span>
          </div>
          <div className='stat-card'>
            <span className='stat-card__value'>Build</span>
            <span className='stat-card__label'>
              Instructions, materials, and tools
            </span>
          </div>
          <div className='stat-card'>
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

        <div className='project-grid'>
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
