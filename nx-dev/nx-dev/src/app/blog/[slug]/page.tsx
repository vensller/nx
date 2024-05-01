import { blogApi } from '../../../../lib/blog.api';
import { BlogDetails } from '@nx/nx-dev/ui-blog';

export default async function BlogPostDetail({ params: { slug } }) {
  const blog = await blogApi.getBlogPostBySlug(slug);
  return blog ? <BlogDetails post={blog} /> : null;
}
