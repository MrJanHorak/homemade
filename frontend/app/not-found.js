import Link from 'next/link';

const NotFoundPage = () => {
  return (
    <section className='section-panel section-panel--tight'>
      <p className='eyebrow'>404</p>
      <h1>That page does not exist.</h1>
      <p className='empty-copy'>
        The page you were looking for may have been moved or removed.
      </p>
      <Link href='/projects' className='button'>
        Browse projects
      </Link>
    </section>
  );
};

export default NotFoundPage;
