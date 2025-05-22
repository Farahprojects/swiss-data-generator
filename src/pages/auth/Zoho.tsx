
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { logToSupabase } from '@/utils/batchedLogManager';
import { useBatchedLogging } from '@/hooks/use-batched-logging';

/**
 * Zoho authorization callback page
 * Displays the authorization code from Zoho for manual copying
 */
const ZohoAuth: React.FC = () => {
  const location = useLocation();
  const [authCode, setAuthCode] = useState<string | null>(null);
  const { logAction } = useBatchedLogging();
  
  useEffect(() => {
    // Extract the code parameter from the URL
    const searchParams = new URLSearchParams(location.search);
    const code = searchParams.get('code');
    
    setAuthCode(code);
    
    // Log to console for manual copying
    if (code) {
      console.log('Zoho Authorization Code:', code);
      console.log('Copy this code for manual token exchange');
      
      // Also log to Supabase for tracking
      logAction('Zoho authorization code received', 'info', {
        hasCode: !!code,
        codeLength: code?.length || 0,
        path: location.pathname
      });
    } else {
      logAction('Zoho authorization callback with no code', 'warn', {
        search: location.search,
        path: location.pathname
      });
    }
  }, [location.search, logAction, location.pathname]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">Zoho Authorization Complete</h1>
        
        {authCode ? (
          <>
            <div className="mb-4 text-center">
              <p className="text-green-600 font-medium mb-2">
                Authorization code received successfully!
              </p>
              <p className="text-gray-600 mb-4">
                The code has been logged to the browser console.
              </p>
            </div>
            
            <div className="bg-gray-100 rounded p-4 mb-4 overflow-x-auto">
              <code className="text-sm break-all">{authCode}</code>
            </div>
            
            <p className="text-sm text-gray-500">
              Open your browser console (F12 or right-click → Inspect → Console) to copy the code.
            </p>
          </>
        ) : (
          <div className="text-center text-red-500">
            <p>No authorization code found in the URL.</p>
            <p className="text-sm text-gray-500 mt-2">
              Make sure the URL includes a code parameter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZohoAuth;
