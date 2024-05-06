import { blogApi } from '../../../../lib/blog.api';
import { BlogDetails } from '@nx/nx-dev/ui-blog';
import BlogDetailHeader from './header';

interface BlogPostDetailProps {
  params: { slug: string };
}

export default async function BlogPostDetail({
  params: { slug },
}: BlogPostDetailProps) {
  const blog = await blogApi.getBlogPostBySlug(slug);

  return blog ? (
    <>
      <BlogDetailHeader post={blog} />
      <BlogDetails post={blog} />
    </>
  ) : null;
}
