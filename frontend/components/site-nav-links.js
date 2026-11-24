'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';

const links = [
  { href: '/', label: 'Home', icon: 'home-button-svgrepo-com.svg' },
  { href: '/projects', label: 'Projects', icon: 'add-square-svgrepo-com.svg' },
  { href: '/profiles', label: 'Profiles', icon: 'multiple-user-profile-images-svgrepo-com.svg' },
];

const SiteNavLinks = () => {
  const pathname = usePathname();
  return links.map(({ href, label, icon }) => (
    <Link key={href} href={href} className='site-nav__item' aria-label={label} aria-current={pathname === href ? 'page' : undefined}>
      <img src={`${API_BASE_URL}/images/nav/${icon}`} alt='' className='site-nav__icon' />
      <span>{label}</span>
    </Link>
  ));
};

export default SiteNavLinks;
