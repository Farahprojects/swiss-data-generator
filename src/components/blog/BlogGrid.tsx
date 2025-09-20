import React from 'react';
import { BlogCard } from './BlogCard';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  cover_image_url?: string;
  author_name?: string;
  created_at: string;
  like_count: number;
  share_count: number;
  tags?: string[];
}

interface BlogGridProps {
  posts: BlogPost[];
}

export const BlogGrid: React.FC<BlogGridProps> = ({ posts }) => {
  if (posts.length === 0) {
    return (
      <div className="text-center py-24">
        <h3 className="text-2xl font-light text-gray-900 mb-4">No blog posts found</h3>
        <p className="text-gray-600 font-light">Check back soon for new content.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
      {posts.map((post, index) => (
        <BlogCard key={post.id} post={post} index={index} />
      ))}
    </div>
  );
};