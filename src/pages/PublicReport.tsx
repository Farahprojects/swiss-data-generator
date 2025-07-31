import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import HeroSection from '@/components/public-report/HeroSection';
import FeaturesSection from '@/components/public-report/FeaturesSection';
import TestsSection from '@/components/public-report/TestsSection';
import TheraiChatGPTSection from '@/components/public-report/TheraiChatGPTSection';
import { ReportForm } from '@/components/shared/ReportForm';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/Logo';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { storeGuestReportId } from '@/utils/urlHelpers';
import { log } from '@/utils/logUtils';

const PublicReport = () => {
  // ALL HOOKS MUST BE DECLARED FIRST - NEVER INSIDE TRY-CATCH
  const [scrollY, setScrollY] = useState(0);
  const [showCancelledMessage, setShowCancelledMessage] = useState(false);
  const [activeGuestId, setActiveGuestId] = useState<string | null>(null);
  const [isGuestIdLoading, setIsGuestIdLoading] = useState(true);
  const location = useLocation();

  // Direct URL parsing fix for hydration issue - reliable guest_id detection
  useEffect(() => {
    log('debug', 'window.location.search', { search: window.location.search }, 'publicReport');
    
    const search = new URLSearchParams(window.location.search);
    const id = search.get("guest_id");
    
    log('debug', 'URL param guest_id', { id }, 'publicReport');
    
    if (id) {
      log('info', 'Guest ID found, storing and setting state', { id }, 'publicReport');
      storeGuestReportId(id);
      setActiveGuestId(id);
    } else {
      // Check localStorage for existing session
      const storedGuestId = localStorage.getItem('currentGuestReportId');
      log('debug', 'Stored guest_id from localStorage', { storedGuestId }, 'publicReport');
      if (storedGuestId) {
        setActiveGuestId(storedGuestId);
      }
    }
    
    setIsGuestIdLoading(false);
    log('debug', 'Final activeGuestId will be', { finalId: id || localStorage.getItem('currentGuestReportId') }, 'publicReport');
  }, []);

  // Check for cancelled payment status
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('status') === 'cancelled') {
      setShowCancelledMessage(true);
    }
  }, [location.search]);

  // Scroll position tracking
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGetReportClick = () => {
    if (typeof window !== 'undefined') {
      // Scroll to form
      const reportSection = document.querySelector('#report-form');
      if (reportSection) {
        reportSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleDismissCancelMessage = () => {
    setShowCancelledMessage(false);
    // Clear the status from URL
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('status');
    window.history.replaceState({}, '', newUrl.toString());
  };

  // Calculate text opacity based on scroll position
  const textOpacity = Math.max(0, 1 - (scrollY / 100)); // Fade out over 100px scroll

  // Show loading spinner while determining guest ID
  if (isGuestIdLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-6">
          <div className="w-12 h-12 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto"></div>
          <p className="text-xl text-gray-600 font-light">Loading...</p>
        </div>
      </div>
    );
  }

  try {
    return (
      <div className="min-h-screen bg-background">
        {/* Show cancelled payment message */}
        {showCancelledMessage && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">Payment Cancelled</p>
                    <p className="text-xs text-amber-700">Your payment was cancelled. You can try again anytime.</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleDismissCancelMessage}
                    className="text-amber-600 hover:text-amber-800 hover:bg-amber-100"
                  >
                    ×
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Animated header with logo */}
        <header className="fixed top-0 left-0 z-50 p-6">
          <div 
            className="transition-opacity duration-300 ease-out"
            style={{ opacity: textOpacity }}
          >
            <Logo size="md" asLink={false} />
          </div>
        </header>
        
        <HeroSection onGetReportClick={handleGetReportClick} />
        
        {/* Sample Report Section */}
        <section className="py-24 bg-gradient-to-b from-white to-gray-50/30">
          <div className="w-full md:px-4 md:container md:mx-auto">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-20">
                <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 tracking-tight">
                  See What You'll Get
                </h2>
                <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
                  Real psychological profiles with actionable insights - see the depth and precision you'll receive.
                </p>
              </div>

              {/* Sync Pro Compatibility Preview */}
              <div className="mb-24">
                <div className="flex flex-col md:grid md:grid-cols-2 gap-0 md:gap-12 mb-16">
                  {/* Peter's Profile */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-none md:rounded-2xl p-0 md:p-8 border-0 md:border border-gray-200/50 hover:border-gray-300/60 transition-all duration-500 hover:translate-y-[-2px] group mb-4 md:mb-0">
                    <div className="p-3 md:p-0">
                      <div className="text-center mb-8">
                        <h3 className="text-2xl font-light text-gray-900 mb-2 tracking-tight">Peter Farah</h3>
                        <p className="text-gray-600 font-normal">Creative Visionary • Structured Strategist</p>
                      </div>
                      
                      <div className="space-y-6">
                      <div className="transform group-hover:translate-x-1 transition-transform duration-300">
                        <h4 className="font-medium text-gray-900 mb-2 text-sm tracking-wide uppercase">Communication Style</h4>
                        <p className="text-gray-600 text-sm leading-relaxed">Expressive and conceptual, prefers big-picture discussions with room for structured planning.</p>
                      </div>
                      
                      <div className="transform group-hover:translate-x-1 transition-transform duration-500">
                        <h4 className="font-medium text-gray-900 mb-2 text-sm tracking-wide uppercase">Decision Making</h4>
                        <p className="text-gray-600 text-sm leading-relaxed">Balances intuitive insights with methodical analysis, values both innovation and process.</p>
                      </div>
                      
                      <div className="transform group-hover:translate-x-1 transition-transform duration-700">
                        <h4 className="font-medium text-gray-900 mb-2 text-sm tracking-wide uppercase">Relationship Needs</h4>
                        <p className="text-gray-600 text-sm leading-relaxed">Thrives with partners who appreciate both creative freedom and collaborative planning.</p>
                      </div>
                      </div>
                    </div>
                  </div>

                  {/* Olivia's Profile */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-none md:rounded-2xl p-0 md:p-8 border-0 md:border border-gray-200/50 hover:border-gray-300/60 transition-all duration-500 hover:translate-y-[-2px] group">
                    <div className="p-3 md:p-0">
                      <div className="text-center mb-8">
                        <h3 className="text-2xl font-light text-gray-900 mb-2 tracking-tight">Olivia Patten</h3>
                        <p className="text-gray-600 font-normal">Intuitive Connector • Detail Orchestrator</p>
                      </div>
                      
                      <div className="space-y-6">
                      <div className="transform group-hover:translate-x-1 transition-transform duration-300">
                        <h4 className="font-medium text-gray-900 mb-2 text-sm tracking-wide uppercase">Communication Style</h4>
                        <p className="text-gray-600 text-sm leading-relaxed">Empathetic and thorough, excels at reading between the lines and organizing details.</p>
                      </div>
                      
                      <div className="transform group-hover:translate-x-1 transition-transform duration-500">
                        <h4 className="font-medium text-gray-900 mb-2 text-sm tracking-wide uppercase">Decision Making</h4>
                        <p className="text-gray-600 text-sm leading-relaxed">Combines emotional intelligence with systematic execution, values harmony and efficiency.</p>
                      </div>
                      
                      <div className="transform group-hover:translate-x-1 transition-transform duration-700">
                        <h4 className="font-medium text-gray-900 mb-2 text-sm tracking-wide uppercase">Relationship Needs</h4>
                        <p className="text-gray-600 text-sm leading-relaxed">Values partners who bring vision while appreciating her attention to emotional nuances.</p>
                      </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Their Sync Dynamic */}
                <div className="relative overflow-hidden bg-white/60 backdrop-blur-sm rounded-none md:rounded-2xl p-4 md:p-12 border-0 md:border border-gray-200/50">
                  {/* Subtle background elements */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-6 left-12 w-1 h-1 bg-gray-400 rounded-full animate-pulse"></div>
                    <div className="absolute top-12 right-16 w-0.5 h-0.5 bg-gray-500 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
                    <div className="absolute bottom-8 left-1/4 w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
                    <div className="absolute bottom-12 right-1/3 w-0.5 h-0.5 bg-gray-500 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
                  </div>

                  <h3 className="text-3xl md:text-4xl font-light text-gray-900 mb-12 text-center relative z-10 tracking-tight">
                    Their Sync Dynamic
                    <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-16 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent"></div>
                  </h3>
                  
                  <div className="grid md:grid-cols-3 gap-12 relative z-10">
                    <div className="text-center group">
                      <div className="w-24 h-24 bg-gray-50 border border-gray-200/50 rounded-full flex items-center justify-center mx-auto mb-6 hover:scale-105 transition-all duration-500 hover:border-gray-300/60">
                        <span className="text-3xl font-light text-gray-700 group-hover:scale-110 transition-transform duration-300">92%</span>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-3 text-sm tracking-wide uppercase group-hover:text-gray-700 transition-colors duration-300">Vision Alignment</h4>
                      <p className="text-gray-600 text-sm leading-relaxed">Both value growth and structured progress toward shared goals.</p>
                    </div>
                    
                    <div className="text-center group">
                      <div className="w-24 h-24 bg-gray-50 border border-gray-200/50 rounded-full flex items-center justify-center mx-auto mb-6 hover:scale-105 transition-all duration-500 hover:border-gray-300/60" style={{animationDelay: '0.2s'}}>
                        <span className="text-3xl font-light text-gray-700 group-hover:scale-110 transition-transform duration-300">88%</span>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-3 text-sm tracking-wide uppercase group-hover:text-gray-700 transition-colors duration-300">Communication Flow</h4>
                      <p className="text-gray-600 text-sm leading-relaxed">Peter's big picture thinking complements Olivia's detail orientation perfectly.</p>
                    </div>
                    
                    <div className="text-center group">
                      <div className="w-24 h-24 bg-gray-50 border border-gray-200/50 rounded-full flex items-center justify-center mx-auto mb-6 hover:scale-105 transition-all duration-500 hover:border-gray-300/60" style={{animationDelay: '0.4s'}}>
                        <span className="text-3xl font-light text-gray-700 group-hover:scale-110 transition-transform duration-300">95%</span>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-3 text-sm tracking-wide uppercase group-hover:text-gray-700 transition-colors duration-300">Growth Potential</h4>
                      <p className="text-gray-600 text-sm leading-relaxed">Their different strengths create a powerful dynamic for mutual development.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Examples Grid */}
              <div className="flex flex-col md:grid md:grid-cols-2 gap-0 md:gap-12 mb-16">
                {/* Cognitive Processing Profile Card */}
                <div className="bg-white/80 backdrop-blur-sm rounded-none md:rounded-2xl p-0 md:p-8 border-0 md:border border-gray-200/50 hover:border-gray-300/60 transition-all duration-500 hover:translate-y-[-2px] group mb-4 md:mb-0">
                  <div className="p-3 md:p-0">
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-light text-gray-900 mb-2 tracking-tight">Cognitive Processing Profile</h3>
                      <p className="text-gray-600 font-normal">Personal Essence Report • Generated in 2 minutes</p>
                    </div>
                    
                    <div className="space-y-6">
                    <div className="transform group-hover:translate-x-1 transition-transform duration-300">
                      <h4 className="font-medium text-gray-900 mb-2 text-sm tracking-wide uppercase">Primary Style</h4>
                      <p className="text-gray-600 text-sm leading-relaxed">Creative Visionary (Big-Picture) - Naturally gravitates towards seeing the grand scheme and weaving ideas into cohesive visions.</p>
                    </div>
                    
                    <div className="transform group-hover:translate-x-1 transition-transform duration-500">
                      <h4 className="font-medium text-gray-900 mb-2 text-sm tracking-wide uppercase">Secondary Style</h4>
                      <p className="text-gray-600 text-sm leading-relaxed">Structured Strategist (Process) - Brings methodical execution to innovative ideas.</p>
                    </div>
                    
                    <div className="transform group-hover:translate-x-1 transition-transform duration-700">
                      <h4 className="font-medium text-gray-900 mb-2 text-sm tracking-wide uppercase">Key Insight</h4>
                      <p className="text-gray-600 text-sm leading-relaxed">A harmonious blend of creativity and structure that enables navigating challenges with agility while bringing visionary ideas to fruition.</p>
                    </div>
                    </div>
                  </div>
                </div>

                {/* Astro Data Card */}
                <div className="bg-white/80 backdrop-blur-sm rounded-none md:rounded-2xl p-0 md:p-8 border-0 md:border border-gray-200/50 hover:border-gray-300/60 transition-all duration-500 hover:translate-y-[-2px] group">
                  <div className="p-3 md:p-0">
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-light text-gray-900 mb-2 tracking-tight">Raw Astro Data</h3>
                      <p className="text-gray-600 font-normal">Precise astronomical calculations • Powered by Therai Swiss</p>
                    </div>
                    
                    <div className="space-y-6">
                    <div className="transform group-hover:translate-x-1 transition-transform duration-300">
                      <h4 className="font-medium text-gray-900 mb-2 text-sm tracking-wide uppercase">What This Shows</h4>
                      <p className="text-gray-600 text-sm leading-relaxed">The exact astronomical positions at your birth moment - the foundation for all astrological interpretation.</p>
                    </div>
                    
                    <div className="transform group-hover:translate-x-1 transition-transform duration-500">
                      <h4 className="font-medium text-gray-900 mb-2 text-sm tracking-wide uppercase">Sample Data</h4>
                      <p className="text-gray-600 text-sm leading-relaxed">Sun: Gemini 15°42' • Moon: Scorpio 28°13' • Rising: Virgo 3°51'</p>
                    </div>
                    
                    <div className="transform group-hover:translate-x-1 transition-transform duration-700">
                      <h4 className="font-medium text-gray-900 mb-2 text-sm tracking-wide uppercase">Why It Matters</h4>
                      <p className="text-gray-600 text-sm leading-relaxed">These precise coordinates create your unique cosmic blueprint - no two people born at different times have identical data.</p>
                    </div>
                    </div>

                    <div className="mt-6 p-4 bg-gray-50/60 rounded-xl border border-gray-200/30">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                        <span className="text-xs font-medium text-gray-700 tracking-wide uppercase">Therai Swiss</span>
                      </div>
                      <p className="text-xs text-gray-600 text-center leading-relaxed">
                        Swiss-precision astronomical calculations in seconds
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center mt-16">
                <button 
                  onClick={handleGetReportClick}
                  className="bg-gray-900 text-white px-12 py-4 rounded-xl text-lg font-normal hover:bg-gray-800 transition-all duration-300 hover:scale-105 border border-gray-800/20 shadow-lg hover:shadow-xl"
                >
                  Unlock
                </button>
                <p className="text-gray-500 mt-4 font-light">Takes 2 minutes • Instant results</p>
              </div>
            </div>
          </div>
        </section>

        <TestsSection />
        <div id="report-form">
          <ReportForm guestId={activeGuestId} />
        </div>
        <TheraiChatGPTSection />
        <FeaturesSection onGetReportClick={handleGetReportClick} />
        <Footer />
      </div>
    );
  } catch (err: any) {
    return <div>Sorry, something went wrong.</div>;
  }
};

export default PublicReport;
