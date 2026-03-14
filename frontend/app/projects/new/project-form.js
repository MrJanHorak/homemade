'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import fallbackCategories from '@/lib/categories';
import { API_BASE_URL } from '@/lib/api';

const LOCAL_DRAFT_FALLBACK_KEY = 'homemade.project-form-draft.v1';
const CATEGORY_BLOCKLIST = ['porn', 'xxx', 'nsfw', 'racist', 'hate', 'nazi'];
const CATEGORY_ALLOWED_CHARS = /^[a-z0-9][a-z0-9 &+/'-]{1,38}$/i;
const STEP_TYPES = [
  { value: 'instruction', label: 'Instruction' },
  { value: 'tip', label: 'Tip' },
  { value: 'warning', label: 'Warning' },
  { value: 'checkpoint', label: 'Checkpoint' },
];

const createEmptyStep = () => ({
  type: 'instruction',
  title: '',
  content: '',
  imageIndexes: [],
});

const fallbackStandardOptions = fallbackCategories.map((entry) => ({
  type: 'standard',
  value: entry.value,
  label: entry.label,
}));

const emptySession = {
  authenticated: false,
  user: null,
  links: {
    login: `${API_BASE_URL}/auth/google`,
    logout: `${API_BASE_URL}/auth/logout`,
  },
};

const ProjectFormPage = () => {
  const router = useRouter();
  const [session, setSession] = useState(emptySession);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [draftState, setDraftState] = useState('');
  const [hasInitializedDraft, setHasInitializedDraft] = useState(false);
  const [dragStepIndex, setDragStepIndex] = useState(null);
  const [dragOverStepIndex, setDragOverStepIndex] = useState(null);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [categoryOptions, setCategoryOptions] = useState(
    fallbackStandardOptions,
  );
  const [form, setForm] = useState({
    title: '',
    description: '',
    buildTime: '',
    difficulty: '',
    estimatedCost: '',
    categories: [],
    otherCategory: [],
    materialsNeeded: [''],
    toolsNeeded: [''],
    buildInstructions: [''],
    externalLinks: [''],
    buildPictures: [],
    buildSteps: [createEmptyStep()],
    visible: true,
  });
  const [imagePreviews, setImagePreviews] = useState([]);

  const categoryValueToLabel = useMemo(
    () =>
      new Map(
        categoryOptions
          .filter((entry) => entry.type === 'standard')
          .map((entry) => [entry.value, entry.label]),
      ),
    [categoryOptions],
  );
  const categoryLabelToValue = useMemo(
    () =>
      new Map(
        categoryOptions
          .filter((entry) => entry.type === 'standard')
          .map((entry) => [entry.label.toLowerCase(), entry.value]),
      ),
    [categoryOptions],
  );

  const filteredCategories = useMemo(() => {
    const needle = categoryQuery.trim().toLowerCase();

    if (!needle) {
      return categoryOptions;
    }

    return categoryOptions.filter((entry) =>
      entry.label.toLowerCase().includes(needle),
    );
  }, [categoryOptions, categoryQuery]);

  const normalizeSteps = (steps) => {
    if (!Array.isArray(steps) || steps.length === 0) {
      return [createEmptyStep()];
    }

    return steps.map((step) => ({
      ...createEmptyStep(),
      ...step,
      type: STEP_TYPES.some((entry) => entry.value === step?.type)
        ? step.type
        : 'instruction',
      imageIndexes: Array.isArray(step?.imageIndexes)
        ? step.imageIndexes.filter(
            (value) => Number.isInteger(value) && value >= 0,
          )
        : [],
    }));
  };

  const buildDraftPayload = (sourceForm) => ({
    title: sourceForm.title,
    description: sourceForm.description,
    buildTime: sourceForm.buildTime,
    difficulty: sourceForm.difficulty,
    estimatedCost: sourceForm.estimatedCost,
    categories: sourceForm.categories,
    otherCategory: sourceForm.otherCategory,
    materialsNeeded: sourceForm.materialsNeeded,
    toolsNeeded: sourceForm.toolsNeeded,
    externalLinks: sourceForm.externalLinks,
    visible: sourceForm.visible,
    buildSteps: normalizeSteps(sourceForm.buildSteps),
    buildPictures: [],
  });

  const saveDraftToApi = async (draftPayload) => {
    const response = await fetch(`${API_BASE_URL}/api/projects/draft`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(draftPayload),
    });

    if (!response.ok) {
      throw new Error(`Draft save failed: ${response.status}`);
    }
  };

  const loadDraftFromApi = async () => {
    const response = await fetch(`${API_BASE_URL}/api/projects/draft`, {
      credentials: 'include',
    });

    if (response.status === 401) {
      throw new Error('AUTH_REQUIRED');
    }

    if (!response.ok) {
      throw new Error(`Draft load failed: ${response.status}`);
    }

    const data = await response.json();
    return data.draft || null;
  };

  const clearDraftInApi = async () => {
    const response = await fetch(`${API_BASE_URL}/api/projects/draft`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Draft delete failed: ${response.status}`);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/session/current`, {
          credentials: 'include',
        });
        const data = await response.json();

        if (isMounted) {
          setSession(data);
        }
      } catch {
        if (isMounted) {
          setSession(emptySession);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadCategoryOptions = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/categories`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Could not load categories');
        }

        const data = await response.json();
        const standard = Array.isArray(data.categories) ? data.categories : [];
        const promoted = Array.isArray(data.promotedCategories)
          ? data.promotedCategories
          : [];

        if (!isMounted) {
          return;
        }

        if (standard.length || promoted.length) {
          setCategoryOptions([...standard, ...promoted]);
        }
      } catch {
        if (isMounted) {
          setCategoryOptions(fallbackStandardOptions);
        }
      }
    };

    loadCategoryOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  const loginHref = useMemo(
    () =>
      `${session.links.login}?returnTo=${encodeURIComponent('/projects/new')}`,
    [session.links.login],
  );

  useEffect(() => {
    const previews = form.buildPictures.map((file) => ({
      url: URL.createObjectURL(file),
      name: file.name,
    }));

    setImagePreviews(previews);

    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [form.buildPictures]);

  useEffect(() => {
    if (isLoading || !session.authenticated || hasInitializedDraft) {
      return;
    }

    let isMounted = true;

    const loadDraft = async () => {
      try {
        const serverDraft = await loadDraftFromApi();

        if (serverDraft && isMounted) {
          setForm((current) => ({
            ...current,
            ...serverDraft,
            otherCategory: Array.isArray(serverDraft.otherCategory)
              ? serverDraft.otherCategory
              : [],
            buildPictures: [],
            buildSteps: normalizeSteps(serverDraft.buildSteps),
          }));
          setDraftState(
            'Draft restored from cloud (images need re-selection).',
          );
          return;
        }

        const localDraft = window.localStorage.getItem(
          LOCAL_DRAFT_FALLBACK_KEY,
        );

        if (localDraft && isMounted) {
          const parsedDraft = JSON.parse(localDraft);
          setForm((current) => ({
            ...current,
            ...parsedDraft,
            otherCategory: Array.isArray(parsedDraft.otherCategory)
              ? parsedDraft.otherCategory
              : [],
            buildPictures: [],
            buildSteps: normalizeSteps(parsedDraft.buildSteps),
          }));
          setDraftState(
            'Restored local fallback draft (images need re-selection).',
          );
        }
      } catch (draftError) {
        if (draftError.message !== 'AUTH_REQUIRED' && isMounted) {
          setDraftState('Could not load cloud draft.');
        }
      } finally {
        if (isMounted) {
          setHasInitializedDraft(true);
        }
      }
    };

    loadDraft();

    return () => {
      isMounted = false;
    };
  }, [isLoading, session.authenticated, hasInitializedDraft]);

  useEffect(() => {
    if (!hasInitializedDraft || !session.authenticated) {
      return;
    }

    const timeout = setTimeout(() => {
      const draftPayload = buildDraftPayload(form);

      saveDraftToApi(draftPayload)
        .then(() => {
          window.localStorage.removeItem(LOCAL_DRAFT_FALLBACK_KEY);
          setDraftState('Draft saved to cloud.');
        })
        .catch(() => {
          try {
            window.localStorage.setItem(
              LOCAL_DRAFT_FALLBACK_KEY,
              JSON.stringify(draftPayload),
            );
            setDraftState('Cloud save failed. Draft saved locally.');
          } catch {
            setDraftState('Could not save draft to cloud or local storage.');
          }
        });
    }, 500);

    return () => clearTimeout(timeout);
  }, [form, hasInitializedDraft, session.authenticated]);

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
    setCategoryError('');

    setForm((current) => ({
      ...current,
      categories: current.categories.includes(value)
        ? current.categories.filter((category) => category !== value)
        : [...current.categories, value],
    }));
  };

  const togglePromotedCategory = (label) => {
    setCategoryError('');

    setForm((current) => ({
      ...current,
      otherCategory: current.otherCategory.some(
        (entry) => entry.toLowerCase() === label.toLowerCase(),
      )
        ? current.otherCategory.filter(
            (entry) => entry.toLowerCase() !== label.toLowerCase(),
          )
        : [...current.otherCategory, label],
    }));
  };

  const removeCustomCategory = (label) => {
    setForm((current) => ({
      ...current,
      otherCategory: current.otherCategory.filter((entry) => entry !== label),
    }));
  };

  const addCustomCategory = () => {
    const nextLabel = customCategoryInput.trim();
    const normalized = nextLabel.toLowerCase();

    if (!nextLabel) {
      setCategoryError('Enter a custom category name first.');
      return;
    }

    if (!CATEGORY_ALLOWED_CHARS.test(nextLabel)) {
      setCategoryError(
        'Use 2-39 characters with letters, numbers, spaces, and & + / - only.',
      );
      return;
    }

    if (CATEGORY_BLOCKLIST.some((word) => normalized.includes(word))) {
      setCategoryError('That category is blocked by safety policy.');
      return;
    }

    const existingBuiltin = categoryLabelToValue.get(normalized);

    if (existingBuiltin) {
      setCategoryError('That already exists as a standard category.');
      toggleCategory(existingBuiltin);
      setCustomCategoryInput('');
      return;
    }

    setForm((current) => {
      if (
        current.otherCategory.some(
          (entry) => entry.toLowerCase() === normalized,
        )
      ) {
        return current;
      }

      return {
        ...current,
        otherCategory: [...current.otherCategory, nextLabel],
      };
    });

    setCategoryError('');
    setCustomCategoryInput('');
  };

  const handleFileChange = (event) => {
    const nextFiles = Array.from(event.target.files || []);

    setForm((current) => ({
      ...current,
      buildPictures: nextFiles,
      buildSteps: current.buildSteps.map((step) => ({
        ...step,
        imageIndexes: step.imageIndexes.filter(
          (imageIndex) => imageIndex < nextFiles.length,
        ),
      })),
    }));
  };

  const updateStepField = (stepIndex, field, value) => {
    setForm((current) => ({
      ...current,
      buildSteps: current.buildSteps.map((step, entryIndex) =>
        entryIndex === stepIndex ? { ...step, [field]: value } : step,
      ),
    }));
  };

  const addBuildStep = () => {
    setForm((current) => ({
      ...current,
      buildSteps: [...current.buildSteps, createEmptyStep()],
    }));
  };

  const removeBuildStep = (stepIndex) => {
    setForm((current) => ({
      ...current,
      buildSteps:
        current.buildSteps.length === 1
          ? [createEmptyStep()]
          : current.buildSteps.filter(
              (_, entryIndex) => entryIndex !== stepIndex,
            ),
    }));
  };

  const moveBuildStep = (stepIndex, direction) => {
    setForm((current) => {
      const swapIndex = stepIndex + direction;

      if (swapIndex < 0 || swapIndex >= current.buildSteps.length) {
        return current;
      }

      const nextSteps = [...current.buildSteps];
      const currentStep = nextSteps[stepIndex];
      nextSteps[stepIndex] = nextSteps[swapIndex];
      nextSteps[swapIndex] = currentStep;

      return {
        ...current,
        buildSteps: nextSteps,
      };
    });
  };

  const toggleStepImage = (stepIndex, imageIndex) => {
    setForm((current) => ({
      ...current,
      buildSteps: current.buildSteps.map((step, entryIndex) => {
        if (entryIndex !== stepIndex) {
          return step;
        }

        const hasImage = step.imageIndexes.includes(imageIndex);

        return {
          ...step,
          imageIndexes: hasImage
            ? step.imageIndexes.filter((entry) => entry !== imageIndex)
            : [...step.imageIndexes, imageIndex],
        };
      }),
    }));
  };

  const clearSavedDraft = async () => {
    try {
      await clearDraftInApi();
    } catch {
      // Keep local cleanup even if cloud delete fails.
    }

    window.localStorage.removeItem(LOCAL_DRAFT_FALLBACK_KEY);
    setDraftState('Saved draft cleared.');
  };

  const reorderSteps = (fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
      return;
    }

    setForm((current) => {
      if (
        fromIndex >= current.buildSteps.length ||
        toIndex >= current.buildSteps.length
      ) {
        return current;
      }

      const nextSteps = [...current.buildSteps];
      const [dragged] = nextSteps.splice(fromIndex, 1);
      nextSteps.splice(toIndex, 0, dragged);

      return {
        ...current,
        buildSteps: nextSteps,
      };
    });
  };

  const handleStepDrop = (toIndex) => {
    if (dragStepIndex === null) {
      return;
    }

    reorderSteps(dragStepIndex, toIndex);
    setDragStepIndex(null);
    setDragOverStepIndex(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const payload = new FormData();
      const structuredInstructions = form.buildSteps
        .map((step, index) => {
          const cleanedTitle = step.title.trim();
          const cleanedContent = step.content.trim();

          if (!cleanedTitle && !cleanedContent) {
            return '';
          }

          const imageLabels = step.imageIndexes
            .map((imageIndex) => form.buildPictures[imageIndex]?.name)
            .filter(Boolean);
          const imageSuffix = imageLabels.length
            ? ` (Images: ${imageLabels.join(', ')})`
            : '';
          const header = cleanedTitle || `Step ${index + 1}`;
          const typePrefix =
            step.type && step.type !== 'instruction'
              ? `[${step.type.toUpperCase()}] `
              : '';

          return `${typePrefix}${header}: ${cleanedContent}${imageSuffix}`.trim();
        })
        .filter(Boolean);
      const fallbackInstructions = form.buildInstructions
        .filter((value) => value.trim())
        .map((value) => value.trim());
      const instructionsToSend =
        structuredInstructions.length > 0
          ? structuredInstructions
          : fallbackInstructions;

      payload.append('title', form.title);
      payload.append('description', form.description);
      payload.append('buildTime', form.buildTime);
      payload.append('difficulty', form.difficulty);
      payload.append('estimatedCost', form.estimatedCost);
      payload.append('visible', String(form.visible));

      form.categories.forEach((category) =>
        payload.append('categories', category),
      );
      form.otherCategory.forEach((category) =>
        payload.append('otherCategory', category.trim()),
      );
      form.materialsNeeded
        .filter((value) => value.trim())
        .forEach((value) => payload.append('materialsNeeded', value.trim()));
      form.toolsNeeded
        .filter((value) => value.trim())
        .forEach((value) => payload.append('toolsNeeded', value.trim()));
      instructionsToSend.forEach((value) =>
        payload.append('buildInstructions', value),
      );
      form.externalLinks
        .filter((value) => value.trim())
        .forEach((value) => payload.append('externalLinks', value.trim()));
      form.buildPictures.forEach((file) =>
        payload.append('buildPictures', file),
      );

      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        credentials: 'include',
        body: payload,
      });

      if (response.status === 401) {
        window.location.href = loginHref;
        return;
      }

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(responseData.error || 'Unable to create project');
      }

      try {
        await clearDraftInApi();
      } catch {
        // Do not block publish redirect if draft cleanup fails.
      }
      window.localStorage.removeItem(LOCAL_DRAFT_FALLBACK_KEY);

      router.push(`/projects/${responseData.project.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section className='section-panel section-panel--tight'>
        <p className='eyebrow'>New project</p>
        <h1>Loading your workspace...</h1>
      </section>
    );
  }

  if (!session.authenticated) {
    return (
      <section className='section-panel section-panel--tight'>
        <p className='eyebrow'>New project</p>
        <h1>Sign in to publish a build.</h1>
        <p className='empty-copy'>
          Use your Google account to post a project, then come straight back to
          this page.
        </p>
        <div className='page-actions'>
          <a href={loginHref} className='button'>
            Sign in with Google
          </a>
          <Link href='/projects' className='button button--ghost'>
            Back to projects
          </Link>
        </div>
      </section>
    );
  }

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

  return (
    <section className='section-panel'>
      <div className='section-panel__header'>
        <div>
          <p className='eyebrow'>New project</p>
          <h1>Publish a build log</h1>
        </div>
        <p className='section-copy'>
          Add the materials, process, pictures, and useful links so someone else
          can actually build it.
        </p>
      </div>

      {draftState ? (
        <div className='draft-indicator'>
          <p>{draftState}</p>
          <button
            type='button'
            className='button button--ghost'
            onClick={clearSavedDraft}
          >
            Clear draft
          </button>
        </div>
      ) : null}

      <form className='project-form' onSubmit={handleSubmit}>
        <div className='project-form__section'>
          <div className='project-form__group'>
            <label>
              Project title
              <input
                type='text'
                value={form.title}
                onChange={(event) => updateField('title', event.target.value)}
                placeholder='Desk lamp from reclaimed oak'
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
                placeholder='What did you make, why did you make it, and what should people know before starting?'
                required
              />
            </label>
          </div>
        </div>

        <div className='project-form__section'>
          <h2>Categories</h2>
          <p className='helper-copy'>
            Pick one or more standard categories, then add custom ones if
            needed.
          </p>

          <div className='category-picker'>
            <button
              type='button'
              className='button button--ghost category-picker__toggle'
              onClick={() => setCategoryMenuOpen((open) => !open)}
            >
              {form.categories.length
                ? `${form.categories.length} standard selected`
                : 'Select standard categories'}
            </button>

            {categoryMenuOpen ? (
              <div className='category-picker__menu'>
                <input
                  type='search'
                  placeholder='Search categories'
                  value={categoryQuery}
                  onChange={(event) => setCategoryQuery(event.target.value)}
                />
                <div className='category-picker__options'>
                  {filteredCategories.map((category) => {
                    const isStandard = category.type === 'standard';
                    const isChecked = isStandard
                      ? form.categories.includes(category.value)
                      : form.otherCategory.some(
                          (entry) =>
                            entry.toLowerCase() ===
                            category.label.toLowerCase(),
                        );

                    return (
                      <label
                        key={`${category.type}-${category.value || category.label}`}
                        className='project-form__chip'
                      >
                        <input
                          type='checkbox'
                          checked={isChecked}
                          onChange={() =>
                            isStandard
                              ? toggleCategory(category.value)
                              : togglePromotedCategory(category.label)
                          }
                        />
                        <span>
                          {category.label}
                          {isStandard ? '' : ' (community)'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className='project-form__chips'>
              {form.categories.map((value) => (
                <button
                  key={`selected-${value}`}
                  type='button'
                  className='project-form__chip project-form__chip--selected'
                  onClick={() => toggleCategory(value)}
                >
                  {categoryValueToLabel.get(value) || value} x
                </button>
              ))}
              {form.otherCategory.map((label) => (
                <button
                  key={`custom-${label}`}
                  type='button'
                  className='project-form__chip project-form__chip--custom'
                  onClick={() => removeCustomCategory(label)}
                >
                  {label} x
                </button>
              ))}
            </div>

            <div className='category-picker__custom'>
              <input
                type='text'
                value={customCategoryInput}
                placeholder='Suggest or create subcategory'
                onChange={(event) => {
                  setCustomCategoryInput(event.target.value);
                  setCategoryError('');
                }}
              />
              <button
                type='button'
                className='button button--ghost'
                onClick={addCustomCategory}
              >
                Add custom
              </button>
            </div>

            {categoryError ? (
              <p className='form-error'>{categoryError}</p>
            ) : null}
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
            <label>
              Image library
              <input
                type='file'
                multiple
                accept='image/jpeg,image/png'
                onChange={handleFileChange}
              />
            </label>
            <p className='helper-copy'>
              Upload JPG or PNG images once, then place them inside individual
              build steps.
            </p>
            <p className='helper-copy'>
              Note: image files are not persisted in cloud drafts and must be
              re-selected.
            </p>

            {imagePreviews.length ? (
              <div className='project-media-library'>
                {imagePreviews.map((preview, imageIndex) => (
                  <div key={`${preview.name}-${imageIndex}`}>
                    <img
                      src={preview.url}
                      alt={preview.name}
                      className='project-media-library__image'
                    />
                    <p className='project-media-library__name'>
                      {preview.name}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

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

        <div className='project-form__section'>
          <h2>Build steps</h2>
          <p className='helper-copy'>
            Add steps in order. Each step can include selected images from your
            image library.
          </p>

          <div className='project-step-list'>
            {form.buildSteps.map((step, stepIndex) => (
              <article
                key={`build-step-${stepIndex}`}
                className={`project-step project-step--${step.type} ${
                  dragOverStepIndex === stepIndex
                    ? 'project-step--drag-over'
                    : ''
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverStepIndex(stepIndex);
                }}
                onDragLeave={() => setDragOverStepIndex(null)}
                onDrop={() => handleStepDrop(stepIndex)}
              >
                <div className='project-step__header'>
                  <div className='project-step__meta'>
                    <button
                      type='button'
                      className='project-step__drag-handle'
                      draggable
                      onDragStart={() => setDragStepIndex(stepIndex)}
                      onDragEnd={() => {
                        setDragStepIndex(null);
                        setDragOverStepIndex(null);
                      }}
                      aria-label={`Drag step ${stepIndex + 1}`}
                      title='Drag to reorder'
                    >
                      ::
                    </button>
                    <h3>Step {stepIndex + 1}</h3>
                  </div>
                  <div className='project-step__actions'>
                    <button
                      type='button'
                      className='button button--ghost'
                      onClick={() => moveBuildStep(stepIndex, -1)}
                      disabled={stepIndex === 0}
                    >
                      Up
                    </button>
                    <button
                      type='button'
                      className='button button--ghost'
                      onClick={() => moveBuildStep(stepIndex, 1)}
                      disabled={stepIndex === form.buildSteps.length - 1}
                    >
                      Down
                    </button>
                    <button
                      type='button'
                      className='button button--ghost'
                      onClick={() => removeBuildStep(stepIndex)}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className='project-form__group'>
                  <label>
                    Step type
                    <select
                      value={step.type}
                      onChange={(event) =>
                        updateStepField(stepIndex, 'type', event.target.value)
                      }
                    >
                      {STEP_TYPES.map((stepType) => (
                        <option key={stepType.value} value={stepType.value}>
                          {stepType.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Step title
                    <input
                      type='text'
                      value={step.title}
                      placeholder='Cut and prep the base pieces'
                      onChange={(event) =>
                        updateStepField(stepIndex, 'title', event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Instructions
                    <textarea
                      rows='4'
                      value={step.content}
                      placeholder='Mark and cut all base pieces, then dry-fit before glue-up.'
                      onChange={(event) =>
                        updateStepField(
                          stepIndex,
                          'content',
                          event.target.value,
                        )
                      }
                    />
                  </label>
                </div>

                {imagePreviews.length ? (
                  <div className='project-step__gallery'>
                    {imagePreviews.map((preview, imageIndex) => {
                      const isSelected = step.imageIndexes.includes(imageIndex);

                      return (
                        <button
                          key={`${preview.name}-${imageIndex}-step-${stepIndex}`}
                          type='button'
                          className={`project-step__image-toggle ${
                            isSelected
                              ? 'project-step__image-toggle--active'
                              : ''
                          }`}
                          onClick={() => toggleStepImage(stepIndex, imageIndex)}
                        >
                          <img
                            src={preview.url}
                            alt={preview.name}
                            className='project-step__image'
                          />
                          <span>{preview.name}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className='helper-copy'>
                    Upload images above to place them in this step.
                  </p>
                )}
              </article>
            ))}
          </div>

          <button
            type='button'
            className='button button--ghost'
            onClick={addBuildStep}
          >
            Add step
          </button>
        </div>

        {renderListField(
          'externalLinks',
          'External links',
          'https://example.com/reference',
        )}

        {error ? <p className='form-error'>{error}</p> : null}

        <div className='page-actions'>
          <button type='submit' className='button' disabled={isSubmitting}>
            {isSubmitting ? 'Publishing...' : 'Publish project'}
          </button>
          <Link href='/projects' className='button button--ghost'>
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
};

export default ProjectFormPage;
