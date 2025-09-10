import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import Footer from '@/components/Footer';
import { BlogPost as BlogPostComponent } from '@/components/blog/BlogPost';
import { TheraLoader } from '@/components/ui/TheraLoader';

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      if (!slug) throw new Error('No slug provided');
      
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Always render the UI with lazy loading - no spinners

  if (error || !post) {
    return <Navigate to="/blog" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <UnifiedNavigation />

      <main className="flex-grow py-16">
        <div className="max-w-7xl mx-auto px-4">
          <BlogPostComponent post={post} />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BlogPost;