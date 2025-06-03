
import React, { useState } from "react";
import { useWebsiteBuilder } from "@/hooks/useWebsiteBuilder";
import { TemplatePreview } from "@/components/website-builder/TemplatePreview";
import { PublishingModal } from "@/components/website-builder/PublishingModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Eye, Globe, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Publish() {
  const { selectedTemplate, customizationData, website, isLoading } = useWebsiteBuilder();
  const navigate = useNavigate();
  const [showPreview, setShowPreview] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]">Loading...</div>;
  }

  if (!selectedTemplate) {
    navigate('/dashboard/website-builder/templates');
    return null;
  }

  const completionChecks = [
    { 
      label: 'Template selected', 
      completed: !!selectedTemplate,
      description: 'Choose a template that represents your style'
    },
    { 
      label: 'Basic information added', 
      completed: !!(customizationData.coachName && customizationData.tagline),
      description: 'Your name and tagline are set'
    },
    { 
      label: 'Services configured', 
      completed: !!(customizationData.services && customizationData.services.length > 0),
      description: 'At least one service is added'
    },
    { 
      label: 'Design customized', 
      completed: !!(customizationData.themeColor && customizationData.fontFamily),
      description: 'Colors and fonts are selected'
    },
    { 
      label: 'SEO optimized', 
      completed: !!(customizationData.metaTitle && customizationData.metaDescription),
      description: 'Title and description are set'
    },
  ];

  const completedCount = completionChecks.filter(check => check.completed).length;
  const completionPercentage = Math.round((completedCount / completionChecks.length) * 100);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Preview & Publish</h2>
            <p className="text-gray-600">Review your website and make it live</p>
          </div>
          
          <Button 
            variant="outline"
            onClick={() => navigate('/dashboard/website-builder/seo')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>SEO Settings</span>
          </Button>
        </div>

        <div className="space-y-6">
          {/* Completion Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Website Completion</span>
                <span className="text-2xl font-bold text-green-600">{completionPercentage}%</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {completionChecks.map((check, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                      check.completed ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {check.completed && <CheckCircle className="w-3 h-3 text-green-600" />}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${check.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                        {check.label}
                      </p>
                      <p className="text-xs text-gray-500">{check.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Preview Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Preview Your Website</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Take a final look at your website before publishing. You can make changes anytime after publishing.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => setShowPreview(true)}
                    className="flex items-center space-x-2 flex-1"
                    variant="outline"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Full Screen Preview</span>
                  </Button>
                  
                  <Button
                    onClick={() => setShowPublishModal(true)}
                    disabled={completionPercentage < 60}
                    className="flex items-center space-x-2 flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Globe className="h-4 w-4" />
                    <span>{website?.is_published ? 'Update Website' : 'Publish Website'}</span>
                  </Button>
                </div>
                
                {completionPercentage < 60 && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                    Complete at least 60% of your website setup to publish. You're at {completionPercentage}%.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Current Status */}
          {website && (
            <Card>
              <CardHeader>
                <CardTitle>Current Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${website.is_published ? 'text-green-600' : 'text-gray-500'}`}>
                      {website.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Website URL:</span>
                    <span className="font-medium text-blue-600">
                      {website.site_slug}.therai-astro.com
                    </span>
                  </div>
                  {website.is_published && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Updated:</span>
                      <span className="font-medium">
                        {new Date().toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Live preview for desktop - will be positioned in the right column by the layout */}
        <div className="hidden lg:block lg:fixed lg:top-24 lg:right-6 lg:w-96">
          <TemplatePreview
            template={selectedTemplate}
            customizationData={customizationData}
          />
        </div>
      </div>

      {/* Modals */}
      {showPreview && (
        <TemplatePreview
          template={selectedTemplate}
          customizationData={customizationData}
          isFullScreen={true}
          onClose={() => setShowPreview(false)}
        />
      )}

      {showPublishModal && website && (
        <PublishingModal
          website={website}
          onClose={() => setShowPublishModal(false)}
          onPublished={() => {
            setShowPublishModal(false);
            // Reload the website data to reflect publishing status
          }}
        />
      )}
    </>
  );
}
