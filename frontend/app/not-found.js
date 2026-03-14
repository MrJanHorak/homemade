import Link from 'next/link';
import { API_BASE_URL } from '@/lib/api';

const NotFoundPage = () => {
  const tape404Background = `${API_BASE_URL}/images/404.png`;

  return (
    <section
      className='section-panel section-panel--tight not-found-tape'
      style={{
        backgroundImage: `linear-gradient(rgba(246, 201, 1, 0.78), rgba(246, 201, 1, 0.83)), url(${tape404Background})`,
      }}
    >
      <div className='not-found-tape__card'>
        <p className='eyebrow'>404 | Missing Piece</p>
        <h1>That page is not on the workbench.</h1>
        <p className='empty-copy'>
          Looks like this route got moved, retired, or never made it out of
          prototype.
        </p>
        <div className='page-actions'>
          <Link href='/projects' className='button'>
            Browse projects
          </Link>
          <Link href='/' className='button button--ghost'>
            Return home
          </Link>
        </div>
      </div>
    </section>
  );
};

export default NotFoundPage;
