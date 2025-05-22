
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { logToSupabase } from '@/utils/batchedLogManager';
import { useBatchedLogging } from '@/hooks/use-batched-logging';
import { Button } from '@/components/ui/button';
import { CheckCircle, Copy } from 'lucide-react';

/**
 * Zoho authorization callback page
 * Displays the authorization code from Zoho for manual copying
 */
const ZohoAuth: React.FC = () => {
  const location = useLocation();
  const [authCode, setAuthCode] = useState<string | null>(null);
  const { logAction } = useBatchedLogging();
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    // Extract the code parameter from the URL
    const searchParams = new URLSearchParams(location.search);
    const code = searchParams.get('code');
    
    setAuthCode(code);
    
    // Log the full token to console for manual copying
    if (code) {
      // Ensure the full code is logged, not truncated
      console.log(`Zoho Authorization Code (FULL): ${code}`);
      console.log('Copy the COMPLETE code above for manual token exchange');
      
      // Also log to Supabase for tracking (but don't include the full token in logs)
      logAction('Zoho authorization code received', 'info', {
        hasCode: !!code,
        codeLength: code?.length || 0,
        path: location.pathname,
        // Only log first few characters for identification purposes
        codeSample: code ? `${code.substring(0, 10)}...` : null
      });
    } else {
      logAction('Zoho authorization callback with no code', 'warn', {
        search: location.search,
        path: location.pathname
      });
    }
  }, [location.search, logAction, location.pathname]);
  
  const copyToClipboard = () => {
    if (authCode) {
      navigator.clipboard.writeText(authCode)
        .then(() => {
          setCopied(true);
          logAction('Zoho auth code copied to clipboard', 'info', {
            success: true,
            codeLength: authCode.length
          });
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => {
          logAction('Failed to copy auth code to clipboard', 'error', { error: err.message });
        });
    }
  };
  
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
                You can copy the complete code below or from the browser console.
              </p>
            </div>
            
            <div className="bg-gray-100 rounded p-4 mb-4 overflow-x-auto relative">
              <pre className="text-sm break-all whitespace-pre-wrap">{authCode}</pre>
              <Button 
                onClick={copyToClipboard}
                className="absolute top-2 right-2 h-8 w-8 p-0"
                size="sm"
                variant="ghost"
              >
                {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="flex justify-center">
              <Button 
                onClick={copyToClipboard}
                className="mt-2"
                variant="outline"
              >
                {copied ? 'Copied to clipboard!' : 'Copy full code to clipboard'}
              </Button>
            </div>
            
            <p className="text-sm text-gray-500 mt-4 text-center">
              This code can be used to generate an access token for the Zoho API.
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
