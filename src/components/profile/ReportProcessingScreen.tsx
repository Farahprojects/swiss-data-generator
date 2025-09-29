import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, Sparkles, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ReportProcessingScreenProps {
  userName: string;
  reportType: string;
  userId: string;
  onReportReady: () => void;
}

export const ReportProcessingScreen: React.FC<ReportProcessingScreenProps> = ({
  userName,
  reportType,
  userId,
  onReportReady,
}) => {
  const [dots, setDots] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [reportStatus, setReportStatus] = useState<'processing' | 'ready'>('processing');

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // WebSocket listener for report_logs
  useEffect(() => {
    if (!userId) return;

    console.log('[ReportProcessing] Setting up WebSocket listener for user:', userId);
    
    const channel = supabase
      .channel(`report_logs:user:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'report_logs',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('[ReportProcessing] Report log received:', payload);
          
          const reportLog = payload.new;
          
          // Check if this is a completed report
          if (reportLog.status === 'success' && reportLog.report_type === reportType) {
            console.log('[ReportProcessing] Report completed! Switching to ready state');
            setReportStatus('ready');
            
            // Small delay before calling onReportReady for smooth transition
            setTimeout(() => {
              onReportReady();
            }, 1500);
          }
        }
      )
      .subscribe((status) => {
        console.log('[ReportProcessing] WebSocket status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      console.log('[ReportProcessing] Cleaning up WebSocket listener');
      supabase.removeChannel(channel);
    };
  }, [userId, reportType, onReportReady]);

  const processingSteps = [
    {
      id: 'analyzing',
      title: 'Analyzing Your Birth Chart',
      description: 'Mapping planetary positions and aspects',
      icon: Brain,
      completed: true
    },
    {
      id: 'processing',
      title: 'Generating Your Report',
      description: 'Creating personalized insights',
      icon: Sparkles,
      completed: reportStatus === 'ready'
    },
    {
      id: 'finalizing',
      title: 'Finalizing Your Profile',
      description: 'Preparing your personalized dashboard',
      icon: CheckCircle,
      completed: reportStatus === 'ready'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            {reportStatus === 'ready' ? (
              <CheckCircle className="w-8 h-8 text-white" />
            ) : (
              <Clock className="w-8 h-8 text-white animate-spin" />
            )}
          </motion.div>
          
          <h1 className="text-3xl font-light text-gray-900 mb-2">
            {reportStatus === 'ready' ? 'Your Report is Ready!' : 'Creating Your Profile'}
          </h1>
          
          <p className="text-lg text-gray-600">
            {reportStatus === 'ready' 
              ? `Welcome to your personalized astrological profile, ${userName}!`
              : `Analyzing your unique astrological blueprint${dots}`
            }
          </p>
          
          {!isConnected && (
            <p className="text-sm text-amber-600 mt-2">
              Connecting to live updates...
            </p>
          )}
        </motion.div>

        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="space-y-6">
              {processingSteps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.2 }}
                  className="flex items-center space-x-4"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step.completed 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className={`font-medium ${
                      step.completed ? 'text-gray-900' : 'text-gray-600'
                    }`}>
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {step.description}
                    </p>
                  </div>
                  
                  {step.completed && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200 }}
                    >
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
            
            {reportStatus === 'ready' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-6 pt-6 border-t border-gray-100"
              >
                <p className="text-center text-sm text-gray-500">
                  Redirecting you to your personalized profile...
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
