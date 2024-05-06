'use client';
import { BlogPostDataEntry } from '@nx/nx-dev/data-access-documents/node-only';
import { NextSeo } from 'next-seo';

export default function BlogDetailHeader({
  post,
}: {
  post: BlogPostDataEntry;
}) {
  return (
    <NextSeo
      title={`${post.title} | Nx Blog`}
      description="Latest news from the Nx & Nx Cloud core team"
      useAppDir={true}
      openGraph={{
        url: 'https://nx.dev', // + router.asPath,
        title: post.title,
        description: post.description,
        images: [
          {
            url: post.cover_image
              ? `https://nx.dev${post.cover_image}`
              : 'https://nx.dev/socials/nx-media.png',
            width: 800,
            height: 421,
            alt: 'Nx: Smart, Fast and Extensible Build System',
            type: 'image/jpeg',
          },
        ],
        siteName: 'NxDev',
        type: 'website',
      }}
    />
  );
}
