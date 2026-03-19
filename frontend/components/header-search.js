'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';

const HeaderSearch = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const buildProjectsUrl = (query) => {
    const params = new URLSearchParams();

    if (pathname === '/projects') {
      const sort = searchParams.get('sort');
      const category = searchParams.get('category');
      const saved = searchParams.get('saved');

      if (sort) {
        params.set('sort', sort);
      }

      if (category) {
        params.set('category', category);
      }

      if (saved === '1' || saved === 'true') {
        params.set('saved', '1');
      }
    }

    params.set('query', query);

    return `/projects?${params.toString()}`;
  };

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();

    const query = inputRef.current?.value?.trim();

    if (!query) {
      inputRef.current?.focus();
      return;
    }

    router.push(buildProjectsUrl(query));
    setIsOpen(false);
  };

  const handleBlur = () => {
    const query = inputRef.current?.value?.trim();

    if (!query) {
      setIsOpen(false);
    }
  };

  return (
    <form
      ref={containerRef}
      className={`inline-search ${isOpen ? 'inline-search--open' : ''}`}
      onSubmit={handleSubmit}
    >
      <button
        type='button'
        className='site-nav__item inline-search__toggle'
        aria-label='Search'
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <img
          src={`${API_BASE_URL}/images/nav/search-svgrepo-com.svg`}
          alt='Search'
          className='site-nav__icon'
        />
        <span>Search</span>
      </button>
      <input
        ref={inputRef}
        type='search'
        name='query'
        className='inline-search__input'
        placeholder='Search projects'
        aria-label='Search projects'
        onBlur={handleBlur}
      />
    </form>
  );
};

export default HeaderSearch;
