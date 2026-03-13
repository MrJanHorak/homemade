import { notFound } from 'next/navigation';
import CommentForm from './comment-form';
import ProjectActions from './project-actions';
import { fetchApi } from '@/lib/api';

export const dynamic = 'force-dynamic';

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

const ProjectDetailPage = async ({ params }) => {
  const response = await fetchApi(`/api/projects/${params.id}`, {
    cache: 'no-store',
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error('Unable to load project');
  }

  const { project } = await response.json();

  return (
    <div className='page-stack'>
      <section className='detail-hero'>
        <div className='detail-hero__media'>
          <img
            src={
              project.buildPictures[0] ||
              'https://placehold.co/1200x800?text=Homemade'
            }
            alt={project.title}
          />
        </div>

        <div className='detail-hero__content'>
          <p className='eyebrow'>Project detail</p>
          <h1>{project.title}</h1>
          <p className='detail-copy'>{project.description}</p>

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
            {project.buildInstructions.map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
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
    </div>
  );
};

export default ProjectDetailPage;
