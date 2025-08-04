import React from 'react';
import { motion } from 'framer-motion';

const testimonials = [
  {
    quote: "Honestly, I didn't expect it to go that deep. It didn't just tell me things — it made me feel seen.",
    name: "Jess M.",
    title: "Creative Director",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face"
  },
  {
    quote: "Way more insightful than a horoscope. It broke down patterns I've struggled with for years, in minutes.",
    name: "Andre R.",
    title: "Startup Founder", 
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
  },
  {
    quote: "It was like a mirror to my inner world. Logical, accurate, and nothing fluffy. I've already recommended it to five friends.",
    name: "Tanya S.",
    title: "Therapist",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
  }
];

const TestimonialsSection = () => {
  return (
    <section className="py-16 bg-gradient-to-b from-background to-muted/20">
      <div className="w-full md:px-4 md:container md:mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
                          <h2 className="text-3xl md:text-4xl font-light mb-4">
            What People Are Saying
          </h2>
          <p className="text-lg text-muted-foreground">
            Real insights from real people
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-border/50 hover:shadow-xl transition-shadow duration-300"
            >
              <div className="flex items-start gap-4">
                <img
                  src={testimonial.avatar}
                  alt={`${testimonial.name} profile`}
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1">
                  <blockquote className="text-foreground italic text-sm leading-relaxed mb-3">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="text-gray-900 font-normal text-sm">
                    — {testimonial.name}, {testimonial.title}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;