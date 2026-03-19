import Link from 'next/link';

const MAX_RATING = 5;

const getSafeRating = (value) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.min(MAX_RATING, Math.max(0, parsed));
};

const getDescriptionPreview = (value, maxLength = 180) => {
  const input = `${value || ''}`;

  const plainText = input
    .replace(/<[^>]+>/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/^\s{0,3}\d+\.\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/[#*_~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }

  const shortened = plainText.slice(0, maxLength).trim();
  const cleanEnd = shortened.replace(/\s+\S*$/, '');

  return `${cleanEnd || shortened}...`;
};

const StarRating = ({ rating, ratingCount, projectId }) => {
  const safeRating = getSafeRating(rating);
  const gradientPrefix = `project-rating-${projectId || 'card'}`;

  return (
    <div className='project-card__rating'>
      <span className='project-card__stars' aria-hidden='true'>
        {Array.from({ length: MAX_RATING }, (_, index) => {
          const fillPercent = Math.max(
            0,
            Math.min(100, (safeRating - index) * 100),
          );
          const gradientId = `${gradientPrefix}-star-${index}`;

          return (
            <svg
              key={gradientId}
              viewBox='0 0 24 24'
              className='project-card__star'
              role='presentation'
            >
              <defs>
                <linearGradient
                  id={gradientId}
                  x1='0%'
                  y1='0%'
                  x2='100%'
                  y2='0%'
                >
                  <stop offset={`${fillPercent}%`} stopColor='currentColor' />
                  <stop offset={`${fillPercent}%`} stopColor='transparent' />
                </linearGradient>
              </defs>
              <path
                d='M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z'
                fill={`url(#${gradientId})`}
                stroke='currentColor'
                strokeWidth='1.5'
              />
            </svg>
          );
        })}
      </span>
      <span className='project-card__rating-value'>
        {safeRating.toFixed(1)}/5 ({ratingCount || 0})
      </span>
    </div>
  );
};

const ProjectCard = ({ project, diyTone = 'minimal' }) => {
  const heroImage =
    project.buildPictures[0] || 'https://placehold.co/800x600?text=Homemade';
  const previewDescription = getDescriptionPreview(project.description);

  return (
    <article
      className={`project-card project-card--diy project-card--diy-${diyTone}`}
    >
      <div className='project-card__visual'>
        <img
          src={heroImage}
          alt={project.title}
          className='project-card__image'
        />
        <div className='project-card__meta-bar'>
          <span>{project.difficulty || 'Open'}/5 difficulty</span>
          <StarRating
            rating={project.averageRating}
            ratingCount={project.ratingCount}
            projectId={project.id}
          />
        </div>
      </div>

      <div className='project-card__content'>
        <div className='project-card__eyebrow'>
          <span>{project.ownerName || 'Community project'}</span>
        </div>

        <h3>{project.title}</h3>
        <p className='project-card__description'>{previewDescription}</p>

        <div className='tag-row'>
          {project.categories.slice(0, 3).map((category) => (
            <span key={category} className='tag'>
              {category}
            </span>
          ))}
        </div>

        <Link href={`/projects/${project.id}`} className='button button--ghost'>
          View build
        </Link>
      </div>
    </article>
  );
};

export default ProjectCard;
