
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { logToSupabase } from '@/utils/batchedLogManager';
import { useBatchedLogging } from '@/hooks/use-batched-logging';

const ZohoAuth = () => {
  const location = useLocation();
  const { logAction } = useBatchedLogging();
  
  useEffect(() => {
    // Get code from URL
    const searchParams = new URLSearchParams(location.search);
    const authCode = searchParams.get('code');
    
    if (authCode) {
      // Log the code to console so it can be copied
      console.log('Zoho Authorization Code:', authCode);
      
      // Log to our tracking system
      logAction('Received Zoho authorization code', 'info', {
        codeLength: authCode.length,
        hasCode: true
      });
    } else {
      console.error('No authorization code found in URL');
      logAction('No Zoho authorization code found in URL', 'error');
    }
  }, [location.search, logAction]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white shadow-md rounded-lg p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Authorization Complete</h1>
        <p className="text-gray-600 mb-4">
          The authorization code has been logged to the browser console.
        </p>
        <div className="bg-gray-100 p-4 rounded-md text-sm font-mono text-left mb-4">
          <p>Please check the browser console (F12 or Right Click &gt; Inspect &gt; Console)</p>
        </div>
        <p className="text-sm text-gray-500">
          You can close this window once you've copied the code.
        </p>
      </div>
    </div>
  );
};

export default ZohoAuth;
