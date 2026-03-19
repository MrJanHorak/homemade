import ProjectsBrowser from './projects-browser';
import { getJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

const ProjectsPage = async () => {
  const { projects } = await getJson('/api/projects?sort=latest', {
    next: { revalidate: 30 },
  });

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

        <ProjectsBrowser initialProjects={projects} />
      </section>
    </div>
  );
};

export default ProjectsPage;
