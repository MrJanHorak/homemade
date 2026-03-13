'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import categories from '@/lib/categories';
import { API_BASE_URL } from '@/lib/api';

const emptySession = {
  authenticated: false,
  user: null,
  links: {
    login: `${API_BASE_URL}/auth/google`,
    logout: `${API_BASE_URL}/auth/logout`,
  },
};

const EditProjectForm = ({ projectId }) => {
  const router = useRouter();
  const [session, setSession] = useState(emptySession);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [existingPictures, setExistingPictures] = useState([]);
  const [newPictures, setNewPictures] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    buildTime: '',
    difficulty: '',
    estimatedCost: '',
    categories: [],
    materialsNeeded: [''],
    toolsNeeded: [''],
    buildInstructions: [''],
    externalLinks: [''],
    visible: true,
  });

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [sessionResponse, projectResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/session/current`, {
            credentials: 'include',
          }),
          fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
            credentials: 'include',
          }),
        ]);

        const sessionData = await sessionResponse
          .json()
          .catch(() => emptySession);
        const projectData = await projectResponse.json();

        if (!isMounted) {
          return;
        }

        const ownsProject = Boolean(
          sessionData.user?.profile?.id &&
          projectData.project?.owner &&
          sessionData.user.profile.id === projectData.project.owner,
        );

        setSession(sessionData);
        setIsOwner(ownsProject);

        const project = projectData.project;
        setExistingPictures(project.buildPictures || []);
        setForm({
          title: project.title || '',
          description: project.description || '',
          buildTime: project.buildTime ?? '',
          difficulty: project.difficulty ?? '',
          estimatedCost: project.estimatedCost ?? '',
          categories: project.categories || [],
          materialsNeeded: project.materialsNeeded?.length
            ? project.materialsNeeded
            : [''],
          toolsNeeded: project.toolsNeeded?.length ? project.toolsNeeded : [''],
          buildInstructions: project.buildInstructions?.length
            ? project.buildInstructions
            : [''],
          externalLinks: project.externalLinks?.length
            ? project.externalLinks
            : [''],
          visible: project.visible !== false,
        });
      } catch {
        if (isMounted) {
          setError('Unable to load project');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const loginHref = useMemo(
    () =>
      `${session.links.login}?returnTo=${encodeURIComponent(`/projects/${projectId}/edit`)}`,
    [projectId, session.links.login],
  );

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateListField = (field, index, value) => {
    setForm((current) => ({
      ...current,
      [field]: current[field].map((entry, entryIndex) =>
        entryIndex === index ? value : entry,
      ),
    }));
  };

  const addListField = (field) => {
    setForm((current) => ({
      ...current,
      [field]: [...current[field], ''],
    }));
  };

  const removeListField = (field, index) => {
    setForm((current) => ({
      ...current,
      [field]:
        current[field].length === 1
          ? ['']
          : current[field].filter((_, entryIndex) => entryIndex !== index),
    }));
  };

  const toggleCategory = (value) => {
    setForm((current) => ({
      ...current,
      categories: current.categories.includes(value)
        ? current.categories.filter((category) => category !== value)
        : [...current.categories, value],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const payload = new FormData();

      payload.append('title', form.title);
      payload.append('description', form.description);
      payload.append('buildTime', form.buildTime);
      payload.append('difficulty', form.difficulty);
      payload.append('estimatedCost', form.estimatedCost);
      payload.append('visible', String(form.visible));

      form.categories.forEach((category) =>
        payload.append('categories', category),
      );
      form.materialsNeeded
        .filter((value) => value.trim())
        .forEach((value) => payload.append('materialsNeeded', value.trim()));
      form.toolsNeeded
        .filter((value) => value.trim())
        .forEach((value) => payload.append('toolsNeeded', value.trim()));
      form.buildInstructions
        .filter((value) => value.trim())
        .forEach((value) => payload.append('buildInstructions', value.trim()));
      form.externalLinks
        .filter((value) => value.trim())
        .forEach((value) => payload.append('externalLinks', value.trim()));
      newPictures.forEach((file) => payload.append('buildPictures', file));

      const response = await fetch(
        `${API_BASE_URL}/api/projects/${projectId}`,
        {
          method: 'PUT',
          credentials: 'include',
          body: payload,
        },
      );

      if (response.status === 401) {
        window.location.href = loginHref;
        return;
      }

      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responseData.error || 'Unable to update project');
      }

      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderListField = (field, label, placeholder) => (
    <div className='project-form__section'>
      <h2>{label}</h2>
      <div className='project-form__stack'>
        {form[field].map((entry, index) => (
          <div key={`${field}-${index}`} className='project-form__inline'>
            <input
              type='text'
              value={entry}
              placeholder={placeholder}
              onChange={(event) =>
                updateListField(field, index, event.target.value)
              }
            />
            <button
              type='button'
              className='button button--ghost'
              onClick={() => removeListField(field, index)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type='button'
        className='button button--ghost'
        onClick={() => addListField(field)}
      >
        Add another
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <section className='section-panel section-panel--tight'>
        <p className='eyebrow'>Edit project</p>
        <h1>Loading project...</h1>
      </section>
    );
  }

  if (!session.authenticated) {
    return (
      <section className='section-panel section-panel--tight'>
        <p className='eyebrow'>Edit project</p>
        <h1>Sign in to edit this project.</h1>
        <div className='page-actions'>
          <a href={loginHref} className='button'>
            Sign in with Google
          </a>
          <Link
            href={`/projects/${projectId}`}
            className='button button--ghost'
          >
            Back to project
          </Link>
        </div>
      </section>
    );
  }

  if (!isOwner) {
    return (
      <section className='section-panel section-panel--tight'>
        <p className='eyebrow'>Edit project</p>
        <h1>You can only edit your own projects.</h1>
        <Link href={`/projects/${projectId}`} className='button'>
          Back to project
        </Link>
      </section>
    );
  }

  return (
    <section className='section-panel'>
      <div className='section-panel__header'>
        <div>
          <p className='eyebrow'>Edit project</p>
          <h1>Update your build log</h1>
        </div>
      </div>

      <form className='project-form' onSubmit={handleSubmit}>
        <div className='project-form__section'>
          <label>
            Project title
            <input
              type='text'
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              required
            />
          </label>

          <label>
            Description
            <textarea
              rows='5'
              value={form.description}
              onChange={(event) =>
                updateField('description', event.target.value)
              }
              required
            />
          </label>
        </div>

        <div className='project-form__section'>
          <h2>Categories</h2>
          <div className='project-form__chips'>
            {categories.map((category) => (
              <label key={category.value} className='project-form__chip'>
                <input
                  type='checkbox'
                  checked={form.categories.includes(category.value)}
                  onChange={() => toggleCategory(category.value)}
                />
                <span>{category.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className='project-form__split'>
          <div className='project-form__section'>
            <label>
              Build time in hours
              <input
                type='number'
                min='0'
                value={form.buildTime}
                onChange={(event) =>
                  updateField('buildTime', event.target.value)
                }
              />
            </label>

            <label>
              Difficulty from 1 to 10
              <input
                type='number'
                min='1'
                max='10'
                value={form.difficulty}
                onChange={(event) =>
                  updateField('difficulty', event.target.value)
                }
                required
              />
            </label>

            <label>
              Estimated cost
              <input
                type='number'
                min='0'
                step='0.01'
                value={form.estimatedCost}
                onChange={(event) =>
                  updateField('estimatedCost', event.target.value)
                }
              />
            </label>
          </div>

          <div className='project-form__section'>
            {existingPictures.length ? (
              <div className='project-form__stack'>
                <h3>Current images</h3>
                {existingPictures.slice(0, 6).map((picture) => (
                  <img
                    key={picture}
                    src={picture}
                    alt='Current project'
                    className='project-form__existing-image'
                  />
                ))}
              </div>
            ) : null}

            <label>
              Add more pictures
              <input
                type='file'
                multiple
                accept='image/jpeg,image/png'
                onChange={(event) =>
                  setNewPictures(Array.from(event.target.files || []))
                }
              />
            </label>

            <label>
              Keep project visible
              <select
                value={String(form.visible)}
                onChange={(event) =>
                  updateField('visible', event.target.value === 'true')
                }
              >
                <option value='true'>Visible</option>
                <option value='false'>Hidden</option>
              </select>
            </label>
          </div>
        </div>

        {renderListField(
          'materialsNeeded',
          'Materials',
          'Birch ply, LEDs, screws, finish',
        )}
        {renderListField(
          'toolsNeeded',
          'Tools',
          'Laser cutter, clamps, drill press',
        )}
        {renderListField(
          'buildInstructions',
          'Build instructions',
          'Step 1: Cut the template pieces...',
        )}
        {renderListField(
          'externalLinks',
          'External links',
          'https://example.com/reference',
        )}

        {error ? <p className='form-error'>{error}</p> : null}

        <div className='page-actions'>
          <button type='submit' className='button' disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save project'}
          </button>
          <Link
            href={`/projects/${projectId}`}
            className='button button--ghost'
          >
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
};

export default EditProjectForm;
