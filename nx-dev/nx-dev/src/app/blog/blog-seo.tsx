'use client';
import { NextSeo } from 'next-seo';
import { usePathname } from 'next/navigation';

export default function BlogSeoComponent() {
  return (
    <NextSeo
      title="Nx Blog - Updates from the Nx & Nx Cloud team"
      description="Latest news from the Nx & Nx Cloud core team"
      useAppDir={true}
      openGraph={{
        url: `https://nx.dev ${usePathname()}`,
        title: 'Nx Blog - Updates from the Nx & Nx Cloud team',
        description:
          'Stay updated with the latest news, articles, and updates from the Nx & Nx Cloud team.',
        images: [
          {
            url: 'https://nx.dev/socials/nx-media.png',
            width: 800,
            height: 421,
            alt: 'Nx: Smart Monorepos · Fast CI',
            type: 'image/jpeg',
          },
        ],
        siteName: 'NxDev',
        type: 'website',
      }}
    />
  );
}
