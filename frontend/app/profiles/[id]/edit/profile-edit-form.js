'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';
import profileSkills from '@/lib/profile-skills';

const emptySession = {
  authenticated: false,
  user: null,
  links: {
    login: `${API_BASE_URL}/auth/google`,
    logout: `${API_BASE_URL}/auth/logout`,
  },
};

const emptySocial = {
  facebook: '',
  twitter: '',
  linkedin: '',
  instagram: '',
  youtube: '',
  pinterest: '',
  reddit: '',
  tiktok: '',
  discord: '',
  github: '',
  other: '',
};

const ProfileEditForm = ({ profileId }) => {
  const router = useRouter();
  const [session, setSession] = useState(emptySession);
  const [profile, setProfile] = useState(null);
  const [isSelf, setIsSelf] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    location: '',
    website: '',
    skills: [],
    social: emptySocial,
  });

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [sessionResponse, profileResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/session/current`, {
            credentials: 'include',
          }),
          fetch(`${API_BASE_URL}/api/profiles/${profileId}`, {
            credentials: 'include',
          }),
        ]);

        const sessionData = await sessionResponse.json();
        const profileData = await profileResponse.json();

        if (!isMounted) {
          return;
        }

        setSession(sessionData);
        setProfile(profileData.profile);
        setIsSelf(Boolean(profileData.isSelf));
        setForm({
          name: profileData.profile.name || '',
          description: profileData.profile.description || '',
          location: profileData.profile.location || '',
          website: profileData.profile.website || '',
          skills: profileData.profile.skills || [],
          social: {
            ...emptySocial,
            ...(profileData.profile.social || {}),
          },
        });
      } catch {
        if (isMounted) {
          setError('Unable to load profile');
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
  }, [profileId]);

  const loginHref = useMemo(
    () =>
      `${session.links.login}?returnTo=${encodeURIComponent(`/profiles/${profileId}/edit`)}`,
    [profileId, session.links.login],
  );

  const avatarPreview = useMemo(() => {
    if (avatarFile) {
      return URL.createObjectURL(avatarFile);
    }

    return profile?.avatar || '';
  }, [avatarFile, profile?.avatar]);

  useEffect(() => {
    return () => {
      if (avatarFile && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarFile, avatarPreview]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateSocialField = (field, value) => {
    setForm((current) => ({
      ...current,
      social: {
        ...current.social,
        [field]: value,
      },
    }));
  };

  const toggleSkill = (value) => {
    setForm((current) => ({
      ...current,
      skills: current.skills.includes(value)
        ? current.skills.filter((skill) => skill !== value)
        : [...current.skills, value],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const payload = new FormData();
      payload.append('name', form.name);
      payload.append('description', form.description);
      payload.append('location', form.location);
      payload.append('website', form.website);
      payload.append('social', JSON.stringify(form.social));
      form.skills.forEach((skill) => payload.append('skills', skill));

      if (avatarFile) {
        payload.append('avatar', avatarFile);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/profiles/${profileId}`,
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
        throw new Error(responseData.error || 'Unable to update profile');
      }

      router.push(`/profiles/${profileId}`);
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
        <p className='eyebrow'>Profile edit</p>
        <h1>Loading profile...</h1>
      </section>
    );
  }

  if (!session.authenticated) {
    return (
      <section className='section-panel section-panel--tight'>
        <p className='eyebrow'>Profile edit</p>
        <h1>Sign in to edit your profile.</h1>
        <div className='page-actions'>
          <a href={loginHref} className='button'>
            Sign in with Google
          </a>
          <Link
            href={`/profiles/${profileId}`}
            className='button button--ghost'
          >
            Back to profile
          </Link>
        </div>
      </section>
    );
  }

  if (!isSelf) {
    return (
      <section className='section-panel section-panel--tight'>
        <p className='eyebrow'>Profile edit</p>
        <h1>You can only edit your own profile.</h1>
        <Link href={`/profiles/${profileId}`} className='button'>
          Back to profile
        </Link>
      </section>
    );
  }

  return (
    <section className='section-panel'>
      <div className='section-panel__header'>
        <div>
          <p className='eyebrow'>Profile edit</p>
          <h1>Update your maker profile</h1>
        </div>
        <p className='section-copy'>
          Refresh your bio, links, skills, and avatar without dropping back to
          the legacy Express form.
        </p>
      </div>

      <form className='project-form' onSubmit={handleSubmit}>
        <div className='project-form__section'>
          <div className='profile-form__avatar-row'>
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt={form.name || 'Profile avatar'}
                className='profile-form__avatar-preview'
              />
            ) : null}

            <label>
              Avatar
              <input
                type='file'
                accept='image/*'
                onChange={(event) =>
                  setAvatarFile(event.target.files?.[0] || null)
                }
              />
            </label>
          </div>
        </div>

        <div className='project-form__section'>
          <label>
            Name
            <input
              type='text'
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              required
            />
          </label>

          <label>
            About me
            <textarea
              rows='5'
              value={form.description}
              onChange={(event) =>
                updateField('description', event.target.value)
              }
            />
          </label>

          <div className='project-form__split'>
            <label>
              Location
              <input
                type='text'
                value={form.location}
                onChange={(event) =>
                  updateField('location', event.target.value)
                }
              />
            </label>

            <label>
              Website
              <input
                type='text'
                value={form.website}
                onChange={(event) => updateField('website', event.target.value)}
              />
            </label>
          </div>
        </div>

        <div className='project-form__section'>
          <h2>Social links</h2>
          <div className='profile-form__social-grid'>
            {Object.keys(emptySocial).map((platform) => (
              <label key={platform}>
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
                <input
                  type='text'
                  value={form.social[platform] || ''}
                  onChange={(event) =>
                    updateSocialField(platform, event.target.value)
                  }
                />
              </label>
            ))}
          </div>
        </div>

        <div className='project-form__section'>
          <h2>Skills</h2>
          <div className='project-form__chips'>
            {profileSkills.map((skill) => (
              <label key={skill.value} className='project-form__chip'>
                <input
                  type='checkbox'
                  checked={form.skills.includes(skill.value)}
                  onChange={() => toggleSkill(skill.value)}
                />
                <span>{skill.label}</span>
              </label>
            ))}
          </div>
        </div>

        {error ? <p className='form-error'>{error}</p> : null}

        <div className='page-actions'>
          <button type='submit' className='button' disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save profile'}
          </button>
          <Link
            href={`/profiles/${profileId}`}
            className='button button--ghost'
          >
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
};

export default ProfileEditForm;
