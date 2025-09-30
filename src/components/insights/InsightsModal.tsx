import React, { useState } from 'react';
import { X, User, Users, Briefcase, Heart, UserCheck, Users2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AstroDataForm } from '@/components/chat/AstroDataForm';
import { ReportFormData } from '@/types/public-report';
import { useAuth } from '@/contexts/AuthContext';

interface InsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ReportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  isDualPerson: boolean;
  onClick: () => void;
}

const ReportCard: React.FC<ReportCardProps> = ({ title, description, icon, isDualPerson, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full p-4 text-left bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 group"
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-gray-900 mb-0.5">{title}</h3>
          <p className="text-xs text-gray-500 leading-snug">{description}</p>
        </div>
      </div>
    </button>
  );
};

export const InsightsModal: React.FC<InsightsModalProps> = ({ isOpen, onClose }) => {
  const [showAstroForm, setShowAstroForm] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<string>('');
  const [selectedRequest, setSelectedRequest] = useState<string>('');
  const { user } = useAuth();

  if (!isOpen) return null;

  const handleReportClick = (reportType: string, request: string) => {
    setSelectedReportType(reportType);
    setSelectedRequest(request);
    setShowAstroForm(true);
  };

  const handleFormSubmit = (data: ReportFormData) => {
    console.log('Form submitted with data:', data);
    // TODO: Handle form submission logic
    setShowAstroForm(false);
    onClose();
  };

  const handleFormClose = () => {
    setShowAstroForm(false);
  };

  // Show AstroDataForm if a report type is selected
  if (showAstroForm) {
    return (
      <AstroDataForm
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        preselectedType={selectedRequest}
        reportType={selectedReportType}
        contextId={user?.id}
        isProfileFlow={false}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-light text-gray-900">Insights</h2>
            <p className="text-sm text-gray-500 mt-1">Generate personalized astrological reports</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-3">
            {/* Solo Reports */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
                Personal Reports
              </h3>
              <div className="space-y-2">
                <ReportCard
                  title="Personal"
                  description="Deep dive into your personality, strengths, and life patterns based on your birth chart."
                  icon={<User className="w-6 h-6" />}
                  isDualPerson={false}
                  onClick={() => handleReportClick('essence_personal', 'essence')}
                />
                
                <ReportCard
                  title="Professional"
                  description="Career guidance and professional development insights tailored to your astrological profile."
                  icon={<Briefcase className="w-6 h-6" />}
                  isDualPerson={false}
                  onClick={() => handleReportClick('essence_professional', 'essence')}
                />
                
                <ReportCard
                  title="Relationship"
                  description="Understanding your relationship patterns, love language, and romantic compatibility."
                  icon={<Heart className="w-6 h-6" />}
                  isDualPerson={false}
                  onClick={() => handleReportClick('essence_relationship', 'essence')}
                />
              </div>
            </div>

            {/* Dual Reports */}
            <div className="pt-2">
              <h3 className="text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
                Comparative Reports
              </h3>
              <div className="space-y-2">
                <ReportCard
                  title="Compatibility"
                  description="Analyze romantic compatibility, communication styles, and relationship dynamics between two people."
                  icon={<Users className="w-6 h-6" />}
                  isDualPerson={true}
                  onClick={() => handleReportClick('sync_personal', 'sync')}
                />
                
                <ReportCard
                  title="Co-working"
                  description="Team dynamics, collaboration styles, and professional synergy between colleagues or partners."
                  icon={<Users2 className="w-6 h-6" />}
                  isDualPerson={true}
                  onClick={() => handleReportClick('sync_professional', 'sync')}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-3 h-3 text-gray-500" />
                </div>
                <div>
                  <h4 className="text-xs font-medium text-gray-900 mb-0.5">Need help getting started?</h4>
                  <p className="text-xs text-gray-600 leading-snug">
                    Each report requires your birth information. For comparative reports, you'll need birth details for both people.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
