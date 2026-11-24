import Link from 'next/link';
import { getJson } from '@/lib/api';
import categoryCatalog from '@/lib/categories';

export const dynamic = 'force-dynamic';

const ProfilesPage = async ({ searchParams }) => {
  const params = await searchParams;
  const name = typeof params?.name === 'string' ? params.name.trim().slice(0, 80) : '';
  const skill = typeof params?.skill === 'string' ? params.skill.trim().slice(0, 80) : '';
  const query = new URLSearchParams();
  if (name) query.set('name', name);
  if (skill) query.set('skill', skill);
  const { profiles } = await getJson(`/api/profiles?${query}`, {
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
            Find makers by name or skill, explore their projects, and start a
            conversation.
          </p>
        </div>

        <form key={JSON.stringify([name, skill])} action='/profiles' method='get' className='projects-filter-row'>
          <label className='projects-filter-row__field'>
            <span>Maker name</span>
            <input type='search' name='name' defaultValue={name} maxLength={80} placeholder='Search names' />
          </label>
          <label className='projects-filter-row__field'>
            <span>Skill</span>
            <select name='skill' defaultValue={skill}>
              <option value=''>All skills</option>
              {skill && !categoryCatalog.some((item) => item.value === skill) ? <option value={skill}>{skill}</option> : null}
              {categoryCatalog.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <button type='submit' className='button button--ghost button--compact'>Find makers</button>
          {name || skill ? <Link href='/profiles' className='button button--ghost button--compact'>Clear filters</Link> : null}
        </form>
        <p className='helper-copy' role='status'>{profiles.length} {profiles.length === 1 ? 'maker' : 'makers'} found.</p>
        {profiles.length ? <div className='profile-grid'>
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
        </div> : <p className='empty-copy'>{name || skill ? 'No makers match these filters. Try a different name or skill.' : 'No makers have joined yet.'}</p>}
      </section>
    </div>
  );
};

export default ProfilesPage;
