import BlogSeoComponent from './blog-seo';

export default async function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BlogSeoComponent />
      {children}
    </>
  );
}
