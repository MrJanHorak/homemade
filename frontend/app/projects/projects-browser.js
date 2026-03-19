'use client';

import { useEffect, useState } from 'react';
import ProjectCard from '@/components/project-card';
import { API_BASE_URL } from '@/lib/api';

const ProjectsBrowser = ({ initialProjects }) => {
  const [projects, setProjects] = useState(initialProjects);
  const [savedProjectIds, setSavedProjectIds] = useState(new Set());
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [error, setError] = useState('');

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
          }
        }
      } catch {
        if (isMounted) {
          setIsAuthenticated(false);
        }
      }
    };

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadSavedProjects = async () => {
    if (!isAuthenticated) {
      setError('Sign in to filter by saved projects.');
      setShowSavedOnly(false);
      return;
    }

    setError('');
    setIsLoadingSaved(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/profiles/me/saved-projects`,
        {
          credentials: 'include',
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to load saved projects');
      }

      const payload = await response.json();
      const saved = Array.isArray(payload.projects) ? payload.projects : [];

      setProjects(saved);
      setSavedProjectIds(new Set(saved.map((project) => project.id)));
    } catch (requestError) {
      setShowSavedOnly(false);
      setError(requestError.message);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const handleSavedOnlyToggle = async (event) => {
    const nextValue = event.target.checked;
    setShowSavedOnly(nextValue);

    if (nextValue) {
      await loadSavedProjects();
      return;
    }

    setError('');
    setProjects(initialProjects);
  };

  return (
    <>
      <div className='projects-filter-row'>
        <label className='projects-filter-row__toggle'>
          <input
            type='checkbox'
            checked={showSavedOnly}
            onChange={handleSavedOnlyToggle}
            disabled={isLoadingSaved}
          />
          <span>{isLoadingSaved ? 'Loading saved...' : 'Show saved only'}</span>
        </label>
      </div>

      {error ? <p className='form-error'>{error}</p> : null}

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
    </>
  );
};

export default ProjectsBrowser;
