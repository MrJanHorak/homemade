import Link from 'next/link';
import { notFound } from 'next/navigation';
import StartChatButton from './start-chat-button';
import ProjectCard from '@/components/project-card';
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

const ProfileDetailPage = async ({ params }) => {
  const { id } = await params;

  const response = await fetchApi(`/api/profiles/${id}`, {
    cache: 'no-store',
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error('Unable to load profile');
  }

  const { profile, projects, isSelf } = await response.json();

  return (
    <div className='page-stack'>
      <section className='detail-hero detail-hero--profile detail-hero--diy-minimal'>
        <div className='profile-hero-card profile-hero-card--diy-minimal'>
          <img
            src={profile.avatar}
            alt={profile.name}
            className='profile-hero-card__avatar'
          />
          <div>
            <p className='eyebrow'>Creator profile</p>
            <h1>{profile.name}</h1>
            <p className='detail-copy'>
              {profile.description || 'No bio added yet.'}
            </p>
          </div>
        </div>

        <div className='metric-grid'>
          <div className='metric-card metric-card--diy-minimal'>
            <span className='metric-card__label'>Joined</span>
            <strong>{formatDate(profile.createdAt)}</strong>
          </div>
          <div className='metric-card metric-card--diy-minimal'>
            <span className='metric-card__label'>Public projects</span>
            <strong>{profile.projectCount}</strong>
          </div>
          <div className='metric-card metric-card--diy-minimal'>
            <span className='metric-card__label'>Location</span>
            <strong>{profile.location || 'Unknown'}</strong>
          </div>
          <div className='metric-card metric-card--diy-minimal'>
            <span className='metric-card__label'>Website</span>
            <strong>
              {profile.website ? (
                <a href={profile.website} target='_blank' rel='noreferrer'>
                  Visit
                </a>
              ) : (
                'None listed'
              )}
            </strong>
          </div>
        </div>
      </section>

      <section className='detail-grid'>
        <article className='section-panel'>
          <h2>Skills</h2>
          <div className='tag-row'>
            {profile.skills.length ? (
              profile.skills.map((skill) => (
                <span key={skill} className='tag'>
                  {skill}
                </span>
              ))
            ) : (
              <p className='empty-copy'>No skills listed yet.</p>
            )}
          </div>
        </article>

        <aside className='section-panel'>
          <h2>Actions</h2>
          {isSelf ? (
            <Link href={`/profiles/${profile.id}/edit`} className='button'>
              Edit profile
            </Link>
          ) : (
            <StartChatButton profileId={profile.id} />
          )}

          <div className='social-links'>
            {Object.entries(profile.social)
              .filter(([, value]) => Boolean(value))
              .map(([platform, value]) => (
                <a key={platform} href={value} target='_blank' rel='noreferrer'>
                  {platform}
                </a>
              ))}
          </div>
        </aside>
      </section>

      <section className='section-panel'>
        <div className='section-panel__header'>
          <div>
            <p className='eyebrow'>Projects</p>
            <h2>Published by {isSelf ? 'you' : profile.name}</h2>
          </div>
        </div>

        <div className='project-grid'>
          {projects.length ? (
            projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                diyTone='minimal'
              />
            ))
          ) : (
            <p className='empty-copy'>No public projects yet.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProfileDetailPage;
