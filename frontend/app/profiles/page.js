import Link from 'next/link';
import { getJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

const ProfilesPage = async () => {
  const { profiles } = await getJson('/api/profiles', {
    next: { revalidate: 60 },
  });

  return (
    <div className='page-stack'>
      <section className='section-panel section-panel--tight'>
        <div className='section-panel__header'>
          <div>
            <p className='eyebrow'>Profiles</p>
            <h1>The makers behind the work</h1>
          </div>
          <p className='section-copy'>
            Find people by their projects, follow their work, and start a
            conversation.
          </p>
        </div>

        <div className='profile-grid'>
          {profiles.map((profile) => (
            <Link
              key={profile.id}
              href={`/profiles/${profile.id}`}
              className='profile-card'
            >
              <img
                src={profile.avatar}
                alt={profile.name}
                className='profile-card__avatar'
              />
              <div>
                <h2>{profile.name}</h2>
                <p>{profile.location || 'Location not listed'}</p>
                <span>{profile.projectCount} public projects</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ProfilesPage;
