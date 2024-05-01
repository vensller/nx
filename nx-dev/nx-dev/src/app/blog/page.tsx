import { blogApi } from '../../../lib/blog.api';
import { BlogContainer } from '@nx/nx-dev/ui-blog';

async function getBlogs() {
  return await blogApi.getBlogPosts();
}

export default async function Page() {
  const blogs = await getBlogs();
  return <BlogContainer blogPosts={blogs} />;
}
