'use client';

import DOMPurify from 'dompurify';
import { useMemo, useState } from 'react';
import CommentForm from './comment-form';
import ProjectActions from './project-actions';

const sanitizeRichText = (value) =>
  DOMPurify.sanitize(`${value || ''}`, {
    ALLOWED_TAGS: [
      'a',
      'blockquote',
      'br',
      'code',
      'em',
      'h2',
      'h3',
      'li',
      'ol',
      'p',
      'pre',
      's',
      'strong',
      'table',
      'tbody',
      'td',
      'th',
      'thead',
      'tr',
      'ul',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'colspan', 'rowspan', 'class'],
  });

const formatDate = (value) => {
  if (!value) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
};

const ProjectDetailView = ({ project, parsedInstructions }) => {
  const [heroIndex, setHeroIndex] = useState(0);
  const [lightbox, setLightbox] = useState({
    isOpen: false,
    images: [],
    index: 0,
    title: '',
  });

  const allProjectImages = useMemo(
    () => (Array.isArray(project.buildPictures) ? project.buildPictures : []),
    [project.buildPictures],
  );
  const heroImages =
    allProjectImages.length > 0
      ? allProjectImages
      : ['https://placehold.co/1200x800?text=Homemade'];
  const sanitizedDescription = useMemo(
    () => sanitizeRichText(project.description),
    [project.description],
  );
  const sanitizedInstructions = useMemo(
    () =>
      parsedInstructions.map((instruction) => ({
        ...instruction,
        content: sanitizeRichText(instruction.content),
      })),
    [parsedInstructions],
  );

  const openLightbox = (images, index, title) => {
    if (!images.length) {
      return;
    }

    setLightbox({
      isOpen: true,
      images,
      index,
      title,
    });
  };

  const closeLightbox = () => {
    setLightbox((current) => ({
      ...current,
      isOpen: false,
    }));
  };

  const showPrevious = () => {
    setLightbox((current) => {
      if (!current.images.length) {
        return current;
      }

      const nextIndex =
        current.index === 0 ? current.images.length - 1 : current.index - 1;

      return {
        ...current,
        index: nextIndex,
      };
    });
  };

  const showNext = () => {
    setLightbox((current) => {
      if (!current.images.length) {
        return current;
      }

      const nextIndex =
        current.index === current.images.length - 1 ? 0 : current.index + 1;

      return {
        ...current,
        index: nextIndex,
      };
    });
  };

  const showHeroPrevious = () => {
    setHeroIndex((current) =>
      current === 0 ? heroImages.length - 1 : current - 1,
    );
  };

  const showHeroNext = () => {
    setHeroIndex((current) =>
      current === heroImages.length - 1 ? 0 : current + 1,
    );
  };

  return (
    <div className='page-stack'>
      <section className='detail-hero'>
        <button
          type='button'
          className='detail-hero__media detail-hero__media-button'
          onClick={() => openLightbox(heroImages, heroIndex, project.title)}
        >
          <img src={heroImages[heroIndex]} alt={project.title} />
          <span className='detail-hero__zoom-hint'>Click to enlarge</span>

          {heroImages.length > 1 ? (
            <>
              <button
                type='button'
                className='detail-hero__nav detail-hero__nav--prev'
                onClick={(event) => {
                  event.stopPropagation();
                  showHeroPrevious();
                }}
                aria-label='Previous reference photo'
              >
                Prev
              </button>
              <button
                type='button'
                className='detail-hero__nav detail-hero__nav--next'
                onClick={(event) => {
                  event.stopPropagation();
                  showHeroNext();
                }}
                aria-label='Next reference photo'
              >
                Next
              </button>
              <div className='detail-hero__dots'>
                {heroImages.map((_, index) => (
                  <button
                    key={`hero-dot-${index}`}
                    type='button'
                    className={`detail-hero__dot ${
                      heroIndex === index ? 'detail-hero__dot--active' : ''
                    }`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setHeroIndex(index);
                    }}
                    aria-label={`Show reference photo ${index + 1}`}
                  />
                ))}
              </div>
            </>
          ) : null}
        </button>

        <div className='detail-hero__content'>
          <p className='eyebrow'>Project detail</p>
          <h1>{project.title}</h1>
          <div
            className='detail-copy rich-content'
            dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
          />

          <div className='metric-grid'>
            <div className='metric-card'>
              <span className='metric-card__label'>Difficulty</span>
              <strong>{project.difficulty || 'N/A'}/5</strong>
            </div>
            <div className='metric-card'>
              <span className='metric-card__label'>Build time</span>
              <strong>{project.buildTime || 'N/A'} hours</strong>
            </div>
            <div className='metric-card'>
              <span className='metric-card__label'>Estimated cost</span>
              <strong>
                {project.estimatedCost
                  ? `$${project.estimatedCost}`
                  : 'Not listed'}
              </strong>
            </div>
            <div className='metric-card'>
              <span className='metric-card__label'>Community rating</span>
              <strong>
                {project.averageRating}/5 from {project.ratingCount} ratings
              </strong>
            </div>
          </div>

          <div className='tag-row'>
            {project.categories.map((category) => (
              <span key={category} className='tag'>
                {category}
              </span>
            ))}
          </div>

          <ProjectActions projectId={project.id} ownerId={project.owner} />
        </div>
      </section>

      <section className='detail-grid'>
        <article className='section-panel'>
          <h2>Build instructions</h2>
          <ol className='step-list'>
            {sanitizedInstructions.map((instruction, index) => {
              const stepNumber = index + 1;
              const hasImages = instruction.images.length > 0;

              return (
                <li
                  key={`${instruction.label}-${instruction.content}-${index}`}
                >
                  <article
                    className={`step-card step-card--${instruction.type}`}
                  >
                    <div className='step-card__heading'>
                      <span className='step-card__index'>
                        Step {stepNumber}
                      </span>
                      {instruction.type !== 'instruction' ? (
                        <span className='step-card__type'>
                          {instruction.type}
                        </span>
                      ) : null}
                    </div>

                    {hasImages && instruction.imagePosition === 'before' ? (
                      <div className='step-card__media'>
                        {instruction.images.map((imageUrl, imageIndex) => (
                          <button
                            key={`${imageUrl}-${imageIndex}`}
                            type='button'
                            className='step-card__image-button'
                            onClick={() =>
                              openLightbox(
                                instruction.images,
                                imageIndex,
                                `Step ${stepNumber}`,
                              )
                            }
                          >
                            <img
                              src={imageUrl}
                              alt={`Build step ${stepNumber} progress image ${imageIndex + 1}`}
                              className='step-card__image'
                            />
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {instruction.label ? (
                      <strong className='step-card__title'>
                        {instruction.label}
                      </strong>
                    ) : null}
                    <div
                      className='step-card__content rich-content'
                      dangerouslySetInnerHTML={{ __html: instruction.content }}
                    />

                    {hasImages && instruction.imagePosition !== 'before' ? (
                      <div className='step-card__media'>
                        {instruction.images.map((imageUrl, imageIndex) => (
                          <button
                            key={`${imageUrl}-${imageIndex}`}
                            type='button'
                            className='step-card__image-button'
                            onClick={() =>
                              openLightbox(
                                instruction.images,
                                imageIndex,
                                `Step ${stepNumber}`,
                              )
                            }
                          >
                            <img
                              src={imageUrl}
                              alt={`Build step ${stepNumber} progress image ${imageIndex + 1}`}
                              className='step-card__image'
                            />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </article>
                </li>
              );
            })}
          </ol>
        </article>

        <aside className='section-panel'>
          <h2>Maker notes</h2>
          <p>
            Built by <strong>{project.ownerName || 'Unknown maker'}</strong>
          </p>
          <p>Published {formatDate(project.createdAt)}</p>

          <div className='list-block'>
            <h3>Materials</h3>
            <ul>
              {project.materialsNeeded.length ? (
                project.materialsNeeded.map((item) => (
                  <li key={item}>{item}</li>
                ))
              ) : (
                <li>No materials listed yet.</li>
              )}
            </ul>
          </div>

          <div className='list-block'>
            <h3>Tools</h3>
            <ul>
              {project.toolsNeeded.length ? (
                project.toolsNeeded.map((item) => <li key={item}>{item}</li>)
              ) : (
                <li>No tools listed yet.</li>
              )}
            </ul>
          </div>

          <CommentForm projectId={project.id} />
        </aside>
      </section>

      <section className='section-panel'>
        <div className='section-panel__header'>
          <div>
            <p className='eyebrow'>Discussion</p>
            <h2>Community feedback</h2>
          </div>
        </div>

        <div className='comment-list'>
          {project.comments.length ? (
            project.comments.map((comment) => (
              <article key={comment.id} className='comment-card'>
                <div className='comment-card__header'>
                  <img
                    src={comment.avatar}
                    alt={comment.name}
                    className='comment-card__avatar'
                  />
                  <div>
                    <strong>{comment.name}</strong>
                    <p>{formatDate(comment.createdAt)}</p>
                  </div>
                </div>
                <p>{comment.content}</p>
              </article>
            ))
          ) : (
            <p className='empty-copy'>
              No feedback yet. Be the first to add some context.
            </p>
          )}
        </div>
      </section>

      {lightbox.isOpen ? (
        <div
          className='lightbox'
          role='dialog'
          aria-modal='true'
          aria-label='Image preview'
          onClick={closeLightbox}
        >
          <div
            className='lightbox__content'
            onClick={(event) => event.stopPropagation()}
          >
            <div className='lightbox__toolbar'>
              <p>
                {lightbox.title} - {lightbox.index + 1} /{' '}
                {lightbox.images.length}
              </p>
              <button
                type='button'
                className='button button--ghost'
                onClick={closeLightbox}
              >
                Close
              </button>
            </div>

            <div className='lightbox__stage'>
              {lightbox.images.length > 1 ? (
                <button
                  type='button'
                  className='lightbox__nav lightbox__nav--prev'
                  onClick={showPrevious}
                >
                  Prev
                </button>
              ) : null}

              <img
                src={lightbox.images[lightbox.index]}
                alt={`${lightbox.title} full screen image ${lightbox.index + 1}`}
                className='lightbox__image'
              />

              {lightbox.images.length > 1 ? (
                <button
                  type='button'
                  className='lightbox__nav lightbox__nav--next'
                  onClick={showNext}
                >
                  Next
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ProjectDetailView;
