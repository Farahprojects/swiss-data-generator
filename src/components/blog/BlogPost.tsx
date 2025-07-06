import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LikeButton } from './LikeButton';
import { ShareButton } from './ShareButton';
import { TagPill } from './TagPill';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  cover_image_url?: string;
  author_name?: string;
  created_at: string;
  like_count: number;
  share_count: number;
  tags?: string[];
}

interface BlogPostProps {
  post: BlogPost;
}

export const BlogPost: React.FC<BlogPostProps> = ({ post }) => {
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
  const defaultImage = "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=600&fit=crop";

  return (
    <article className="max-w-4xl mx-auto">
      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12"
      >
        <Link 
          to="/blog"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-light transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to blog
        </Link>
      </motion.div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-12 space-y-8"
      >
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-gray-900 leading-tight">
          {post.title}
        </h1>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4 text-gray-600 font-light">
            <span>{post.author_name || 'Anonymous'}</span>
            <span>•</span>
            <span>{timeAgo}</span>
          </div>

          <div className="flex items-center gap-4">
            <LikeButton postId={post.id} initialLikes={post.like_count || 0} />
            <ShareButton 
              postId={post.id} 
              postTitle={post.title}
              postSlug={post.slug}
              initialShares={post.share_count || 0} 
            />
          </div>
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {post.tags.map((tag) => (
              <TagPill key={tag} tag={tag} />
            ))}
          </div>
        )}
      </motion.header>

      {/* Featured Image */}
      {post.cover_image_url && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-12"
        >
          <img
            src={post.cover_image_url || defaultImage}
            alt={post.title}
            className="w-full h-96 object-cover rounded-3xl shadow-lg"
          />
        </motion.div>
      )}

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="prose prose-lg prose-gray max-w-none font-light leading-relaxed [&>h1]:text-3xl [&>h1]:font-light [&>h1]:text-gray-900 [&>h2]:text-2xl [&>h2]:font-light [&>h2]:text-gray-900 [&>h3]:text-xl [&>h3]:font-light [&>h3]:text-gray-900 [&>p]:text-gray-600 [&>a]:text-primary [&>strong]:text-gray-900 [&>blockquote]:border-gray-200 [&>blockquote]:text-gray-700"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* Footer Actions */}
      <motion.footer
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="mt-16 pt-8 border-t border-gray-200"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            <LikeButton postId={post.id} initialLikes={post.like_count || 0} />
            <ShareButton 
              postId={post.id} 
              postTitle={post.title}
              postSlug={post.slug}
              initialShares={post.share_count || 0} 
            />
          </div>

          <Link 
            to="/blog"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-light transition-colors"
          >
            ← More articles
          </Link>
        </div>
      </motion.footer>
    </article>
  );
};