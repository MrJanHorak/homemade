'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ProjectCard from '@/components/project-card';
import { API_BASE_URL } from '@/lib/api';

const SavedProjectsPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadSavedProjects = async () => {
      try {
        const sessionResponse = await fetch(
          `${API_BASE_URL}/api/session/current`,
          {
            credentials: 'include',
          },
        );

        if (!sessionResponse.ok) {
          throw new Error('Unable to verify your session');
        }

        const session = await sessionResponse.json();

        if (!session.authenticated) {
          if (isMounted) {
            setIsAuthenticated(false);
            setProjects([]);
          }
          return;
        }

        const savedResponse = await fetch(
          `${API_BASE_URL}/api/profiles/me/saved-projects`,
          {
            credentials: 'include',
          },
        );

        if (!savedResponse.ok) {
          const payload = await savedResponse.json().catch(() => ({}));
          throw new Error(payload.error || 'Unable to load saved projects');
        }

        const payload = await savedResponse.json();

        if (isMounted) {
          setIsAuthenticated(true);
          setProjects(Array.isArray(payload.projects) ? payload.projects : []);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSavedProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className='page-stack'>
        <section className='section-panel'>
          <p className='empty-copy'>Loading your saved projects...</p>
        </section>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className='page-stack'>
        <section className='section-panel'>
          <div className='section-panel__header'>
            <div>
              <p className='eyebrow'>Saved projects</p>
              <h1>Sign in to see your bookmarks</h1>
            </div>
          </div>
          <p className='section-copy'>
            Save projects you want to revisit and they will appear here.
          </p>
          <Link href='/auth/sign-in' className='button'>
            Sign in
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className='page-stack'>
      <section className='section-panel section-panel--tight'>
        <div className='section-panel__header'>
          <div>
            <p className='eyebrow'>Saved projects</p>
            <h1>Your bookmarked builds</h1>
          </div>
          <p className='section-copy'>
            Keep track of projects you want to reference later.
          </p>
        </div>

        {error ? <p className='form-error'>{error}</p> : null}

        <div className='project-grid'>
          {projects.length ? (
            projects.map((project) => (
              <ProjectCard key={project.id} project={project} isSaved />
            ))
          ) : (
            <p className='empty-copy'>You have no saved projects yet.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default SavedProjectsPage;
