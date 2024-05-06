'use client';
import { sendPageViewEvent } from '@nx/nx-dev/feature-analytics';
import { DefaultSeo } from 'next-seo';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DefaultSeoComponent({ gaMeasurementId }) {
  const pathName = usePathname();
  const searchParams = useSearchParams();
  const [lastPath, setLastPath] = useState(`${pathName}${searchParams}`);

  useEffect(() => {
    const url = `${pathName}${searchParams}`;
    if (url !== lastPath) {
      setLastPath(url);
      sendPageViewEvent({ gaId: gaMeasurementId, path: url });
    }
  }, [pathName, searchParams, lastPath, gaMeasurementId]);

  return (
    <DefaultSeo
      title="Nx: Smart Monorepos · Fast CI"
      description="Nx is a build system with built-in tooling and advanced CI capabilities. It helps you maintain and scale monorepos, both locally and on CI."
      openGraph={{
        url: 'https://nx.dev' + pathName,
        title: 'Nx: Smart Monorepos · Fast CI',
        description:
          'Nx is a build system with built-in tooling and advanced CI capabilities. It helps you maintain and scale monorepos, both locally and on CI.',
        images: [
          {
            url: 'https://nx.dev/images/nx-media.jpg',
            width: 800,
            height: 421,
            alt: 'Nx: Smart Monorepos · Fast CI',
            type: 'image/jpeg',
          },
        ],
        siteName: 'Nx',
        type: 'website',
      }}
      twitter={{
        site: '@nxdevtools',
        cardType: 'summary_large_image',
      }}
    />
  );
}
