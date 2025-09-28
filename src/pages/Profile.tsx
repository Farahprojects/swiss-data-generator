import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, Heart, Sparkles, MessageCircle, ChevronRight, User, Calendar, MapPin } from 'lucide-react';
import { AstroDataForm } from '@/components/chat/AstroDataForm';
import { ReportFormData } from '@/types/public-report';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import Footer from '@/components/Footer';

const Profile: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'intro' | 'astro-form' | 'profile'>('intro');
  const [profileData, setProfileData] = useState<ReportFormData | null>(null);
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const handleAstroFormSubmit = (data: ReportFormData) => {
    setProfileData(data);
    setCurrentStep('profile');
  };

  const handleStartOver = () => {
    setCurrentStep('intro');
    setProfileData(null);
  };

  const profileSections = [
    {
      id: 'cognitive',
      title: 'Cognitive',
      description: 'Your mental patterns and thinking style',
      icon: Brain,
      color: 'bg-blue-50 border-blue-200',
      iconColor: 'text-blue-600',
      placeholder: 'Explore your cognitive patterns and mental frameworks...'
    },
    {
      id: 'relationship',
      title: 'Relationship',
      description: 'How you connect and relate to others',
      icon: Heart,
      color: 'bg-pink-50 border-pink-200',
      iconColor: 'text-pink-600',
      placeholder: 'Discover your relationship dynamics and connection patterns...'
    },
    {
      id: 'spiritual',
      title: 'Spiritual',
      description: 'Your inner journey and higher purpose',
      icon: Sparkles,
      color: 'bg-purple-50 border-purple-200',
      iconColor: 'text-purple-600',
      placeholder: 'Explore your spiritual path and inner wisdom...'
    }
  ];

  if (currentStep === 'intro') {
    return (
      <div className="min-h-screen bg-gray-50">
        <UnifiedNavigation />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-8"
          >
            <div className="space-y-4">
              <h1 className="text-4xl font-light text-gray-900 tracking-tight">
                Create Your Profile
              </h1>
              <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
                Begin your journey of self-discovery with personalized AI insights across cognitive, relationship, and spiritual dimensions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {profileSections.map((section, index) => {
                const IconComponent = section.icon;
                return (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="text-center space-y-3"
                  >
                    <div className={`w-16 h-16 mx-auto rounded-2xl ${section.color} flex items-center justify-center`}>
                      <IconComponent className={`w-8 h-8 ${section.iconColor}`} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
                    <p className="text-sm text-gray-600">{section.description}</p>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="pt-8"
            >
              <Button
                onClick={() => setCurrentStep('astro-form')}
                className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 rounded-xl font-light text-lg"
              >
                Get Started
              </Button>
            </motion.div>
          </motion.div>
        </div>

        <Footer />
      </div>
    );
  }

  if (currentStep === 'astro-form') {
    return (
      <div className="min-h-screen bg-gray-50">
        <UnifiedNavigation />
        
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-light text-gray-900 tracking-tight">
                Your Birth Details
              </h1>
              <p className="text-lg text-gray-600 font-light">
                We need your birth information to create your personalized profile
              </p>
            </div>

            <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <AstroDataForm
                  onClose={() => setCurrentStep('intro')}
                  onSubmit={handleAstroFormSubmit}
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  if (currentStep === 'profile' && profileData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UnifiedNavigation />
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Profile Header */}
            <div className="text-center space-y-4">
              <div className="w-24 h-24 mx-auto rounded-full bg-gray-900 flex items-center justify-center">
                <User className="w-12 h-12 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-light text-gray-900 tracking-tight">
                  {profileData.name}
                </h1>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-600 mt-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{profileData.birthDate}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{profileData.birthLocation}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Sections */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {profileSections.map((section, index) => {
                const IconComponent = section.icon;
                return (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className={`border-0 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-200 ${section.color}`}>
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl ${section.color} flex items-center justify-center`}>
                            <IconComponent className={`w-6 h-6 ${section.iconColor}`} />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
                            <p className="text-sm text-gray-600">{section.description}</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="text-sm text-gray-700 bg-white/50 rounded-lg p-3">
                            {section.placeholder}
                          </div>
                          
                          <Button
                            variant="outline"
                            className="w-full justify-between bg-white/50 hover:bg-white/70 border-gray-200"
                          >
                            <div className="flex items-center gap-2">
                              <MessageCircle className="w-4 h-4" />
                              <span>Chat about this</span>
                            </div>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex justify-center gap-4 pt-8"
            >
              <Button
                onClick={handleStartOver}
                variant="outline"
                className="px-6 py-2 rounded-xl border-gray-200 hover:bg-gray-50"
              >
                Start Over
              </Button>
              <Button
                onClick={() => setCurrentStep('astro-form')}
                className="px-6 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white"
              >
                Edit Details
              </Button>
            </motion.div>
          </motion.div>
        </div>

        <Footer />
      </div>
    );
  }

  return null;
};

export default Profile;
