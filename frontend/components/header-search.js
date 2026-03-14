'use client';

import { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '@/lib/api';

const HeaderSearch = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

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
    const query = inputRef.current?.value?.trim();

    if (!query) {
      event.preventDefault();
      inputRef.current?.focus();
      return;
    }

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
      action='/search'
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
