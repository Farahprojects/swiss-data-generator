import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, Heart, Sparkles, MessageCircle, ChevronRight, User, Calendar, MapPin, Loader2 } from 'lucide-react';
import { AstroDataForm } from '@/components/chat/AstroDataForm';
import { ReportProcessingScreen } from '@/components/profile/ReportProcessingScreen';
import { ReportFormData } from '@/types/public-report';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useProfileState } from '@/contexts/ProfileContext';

const Profile: React.FC = () => {
  // Default to loading, then decide profile vs onboarding after DB check
  const [currentStep, setCurrentStep] = useState<'loading' | 'intro' | 'astro-form' | 'processing' | 'profile'>('loading');
  const [profileData, setProfileData] = useState<ReportFormData | null>(null);
  const [preselectedMode, setPreselectedMode] = useState<'self' | null>(null);
  const [reportType, setReportType] = useState<string>('');
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { hasProfileSetup, profileId, setProfileSetupCompleted, refresh } = useProfileState();

  // React to global profile state rather than re-query here
  useEffect(() => {
    if (hasProfileSetup === null) {
      // Kick a gentle refresh; ProfileContext will short-circuit if cached
      setCurrentStep('loading');
      refresh();
      return;
    }
    if (hasProfileSetup === true || !!profileId) {
      setCurrentStep('profile');
    } else {
      setCurrentStep('intro');
    }
  }, [hasProfileSetup, profileId, refresh]);

  const handleAstroFormSubmit = (data: ReportFormData) => {
    setProfileData(data);
    setReportType(data.reportType || 'essence_personal');
    setCurrentStep('processing');
  };

  const handleReportReady = useCallback(() => {
    console.log('[Profile] Report is ready, transitioning to profile view');
    setProfileSetupCompleted(profileId || user?.id || undefined);
    setCurrentStep('profile');
  }, []);


  const handleGetStarted = () => {
    setPreselectedMode('self');
    setCurrentStep('astro-form');
  };

  const profileSections = [
    {
      id: 'mindset',
      title: 'Mindset',
      description: 'Your mental patterns and thinking style',
      icon: Brain,
      color: 'bg-blue-50 border-blue-200',
      iconColor: 'text-blue-600',
      placeholder: 'Explore your mindset patterns and mental frameworks...'
    },
    {
      id: 'connections',
      title: 'Connections',
      description: 'How you connect and relate to others',
      icon: Heart,
      color: 'bg-pink-50 border-pink-200',
      iconColor: 'text-pink-600',
      placeholder: 'Discover your connection dynamics and relationship patterns...'
    },
    {
      id: 'purpose',
      title: 'Purpose',
      description: 'Your inner journey and higher purpose',
      icon: Sparkles,
      color: 'bg-purple-50 border-purple-200',
      iconColor: 'text-purple-600',
      placeholder: 'Explore your purpose and inner wisdom...'
    }
  ];

  if (currentStep === 'intro') {
    return (
      <div className="min-h-screen bg-gray-50">
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
                Your journey to self-discovery starts here—mindset, connections, purpose.
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-4 md:grid md:grid-cols-3 md:gap-6 md:space-y-0">
              {profileSections.map((section, index) => {
                const IconComponent = section.icon;
                const rowClass = index % 2 === 1 ? 'flex-row-reverse' : 'flex-row';
                return (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="md:block"
                  >
                    <div className={`flex ${rowClass} items-center gap-4 p-4 rounded-2xl bg-white md:flex-col`}>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 md:mx-auto">
                        <IconComponent className={`w-6 h-6 ${section.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0 md:mt-3 text-left">
                        <h3 className="text-lg font-medium text-gray-900 truncate md:truncate-none">{section.title}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2 md:line-clamp-none">{section.description}</p>
                      </div>
                    </div>
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
                onClick={handleGetStarted}
                className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 rounded-xl font-light text-lg"
              >
                Get Started
              </Button>
            </motion.div>
          </motion.div>
        </div>

      </div>
    );
  }

  if (currentStep === 'loading') {
    // Minimal branded loader
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-700">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-light">Loading your profile…</span>
        </div>
      </div>
    );
  }

  if (currentStep === 'processing') {
    return (
      <ReportProcessingScreen
        reportType={reportType}
        userName={profileData?.name || 'Friend'}
        userId={user?.id || ''}
        onReportReady={handleReportReady}
      />
    );
  }

  if (currentStep === 'astro-form') {
    return (
      <div className="min-h-screen bg-gray-50">
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
                  preselectedType={preselectedMode === 'self' ? 'essence' : undefined}
                  reportType="essence_personal"
                  contextId={user?.id}
                  isProfileFlow={true}
                  mode="astro"
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  if (currentStep === 'profile') {
    const displayName = profileData?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Friend';
    return (
      <div className="min-h-screen bg-gray-50">
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
                  {displayName}
                </h1>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-600 mt-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{profileData?.birthDate || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{profileData?.birthLocation || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Sections */}
            {isMobile ? (
              <div className="space-y-4">
                {profileSections.map((section, index) => {
                  const IconComponent = section.icon;
                  const rowClass = index % 2 === 1 ? 'flex-row-reverse' : 'flex-row';
                  return (
                    <motion.div
                      key={section.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className={`flex ${rowClass} items-start gap-4 p-4 rounded-2xl bg-white flex-nowrap`}> 
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                          <IconComponent className={`w-6 h-6 ${section.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-gray-900 truncate">{section.title}</h3>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {section.placeholder}
                          </p>
                          <Button
                            variant="ghost"
                            className="mt-3 px-0 h-auto text-gray-700 hover:text-gray-900"
                          >
                            <span className="inline-flex items-center gap-2">
                              <MessageCircle className="w-4 h-4" />
                              Chat about this
                            </span>
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
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
            )}

          </motion.div>
        </div>

      </div>
    );
  }

  return null;
};

export default Profile;
