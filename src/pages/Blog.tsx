import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import Footer from '@/components/Footer';
import { BlogGrid } from '@/components/blog/BlogGrid';
import { TheraLoader } from '@/components/ui/TheraLoader';

const Blog = () => {
  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Always render the UI with lazy loading - no spinners

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <UnifiedNavigation />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-light text-gray-900">Something went wrong</h2>
            <p className="text-gray-600 font-light">Please try again later.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <UnifiedNavigation />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16 space-y-6"
            >
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-light text-gray-900 leading-tight">
                Insights & <span className="italic font-medium">Stories</span>
              </h1>
              <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto leading-relaxed">
                Discover the latest thoughts, insights, and stories from our community of professionals
              </p>
            </motion.div>
          </div>
        </section>

        {/* Blog Grid */}
        <section className="py-16 bg-gradient-to-b from-white to-gray-50/30">
          <div className="max-w-7xl mx-auto px-4">
            <BlogGrid posts={posts || []} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;