import React from 'react';
import { useNavigate } from 'react-router-dom';

const PublicReport = () => {
  const navigate = useNavigate();
  
  const handleGetReportClick = () => {
    // Go directly to chat page, bypassing all forms
    navigate('/chat');
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Get Your Astrological Report
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Discover insights about your personality, relationships, and life path
          </p>
          <button
            onClick={handleGetReportClick}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublicReport;
