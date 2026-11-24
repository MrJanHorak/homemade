'use client';

import { useEffect, useRef } from 'react';

const GlobalError = () => {
  const headingRef = useRef(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  return (
  <html lang='en'>
    <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', lineHeight: 1.5 }}>
      <main>
        <h1 ref={headingRef} tabIndex={-1}>HomeMade couldn’t load.</h1>
        <p>Please reload the page to try again.</p>
        <button type='button' onClick={() => window.location.reload()}>Reload page</button>
      </main>
    </body>
  </html>
  );
};

export default GlobalError;
