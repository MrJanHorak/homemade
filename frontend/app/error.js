'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startTransition, useEffect, useRef } from 'react';

const PageError = ({ reset }) => {
  const router = useRouter();
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const retry = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <section className='section-panel section-panel--tight'>
      <p className='eyebrow'>Something went wrong</p>
      <h1 ref={headingRef} tabIndex={-1}>We couldn’t load this page.</h1>
      <p>Please try again. If the problem continues, you can return to the home page.</p>
      <div className='page-actions'>
        <button type='button' className='button' onClick={retry}>Try again</button>
        <Link href='/' className='button button--ghost'>Go home</Link>
      </div>
    </section>
  );
};

export default PageError;
