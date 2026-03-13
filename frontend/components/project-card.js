import Link from 'next/link';

const ProjectCard = ({ project }) => {
  const heroImage =
    project.buildPictures[0] || 'https://placehold.co/800x600?text=Homemade';

  return (
    <article className='project-card'>
      <div className='project-card__visual'>
        <img
          src={heroImage}
          alt={project.title}
          className='project-card__image'
        />
        <div className='project-card__meta-bar'>
          <span>{project.difficulty || 'Open'}/5 difficulty</span>
          <span>{project.averageRating || 0}/5 rating</span>
        </div>
      </div>

      <div className='project-card__content'>
        <div className='project-card__eyebrow'>
          <span>{project.ownerName || 'Community project'}</span>
          <span>{project.likesCount} likes</span>
        </div>

        <h3>{project.title}</h3>
        <p>{project.description}</p>

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
