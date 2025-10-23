import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Generate: React.FC = () => {
  const { user } = useAuth();
  const { isSubscribed, loading: subLoading } = useSubscription();
  
  const [formData, setFormData] = useState({
    birthDate: '',
    birthTime: '',
    location: '',
    request: 'natal'
  });
  
  const [generating, setGenerating] = useState(false);
  const [jsonOutput, setJsonOutput] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!user || !isSubscribed) {
      toast.error('Subscription required');
      return;
    }

    if (!formData.birthDate || !formData.birthTime || !formData.location) {
      toast.error('Please fill in all fields');
      return;
    }

    setGenerating(true);
    try {
      // Call translator-edge function
      const { data, error } = await supabase.functions.invoke('translator-edge', {
        body: {
          request: formData.request,
          birth_date: formData.birthDate,
          birth_time: formData.birthTime,
          location: formData.location,
        }
      });

      if (error) throw error;

      // Format the output as pretty JSON
      const formatted = JSON.stringify(data, null, 2);
      setJsonOutput(formatted);
      toast.success('Data generated successfully!');
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate data');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonOutput);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (subLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isSubscribed) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-light">Subscription Required</CardTitle>
            <CardDescription>Get access for just $30/year</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/subscription'}
              className="w-full bg-gray-900 hover:bg-gray-800"
            >
              Subscribe Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        
        {/* Header */}
        <div className="space-y-2 mb-12">
          <h1 className="text-4xl font-light italic text-gray-900">
            Generate Swiss Data
          </h1>
          <p className="text-gray-600 font-light">
            Generate accurate astrological data in JSON format
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-light">Birth Details</CardTitle>
              <CardDescription>Enter the information to generate data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-2">
                <Label htmlFor="birthDate" className="font-light">Birth Date</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthTime" className="font-light">Birth Time</Label>
                <Input
                  id="birthTime"
                  type="time"
                  value={formData.birthTime}
                  onChange={(e) => setFormData({ ...formData, birthTime: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="font-light">Location</Label>
                <Input
                  id="location"
                  type="text"
                  placeholder="e.g., New York, USA"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="request" className="font-light">Chart Type</Label>
                <select
                  id="request"
                  value={formData.request}
                  onChange={(e) => setFormData({ ...formData, request: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="natal">Natal Chart</option>
                  <option value="transits">Transits</option>
                  <option value="progressions">Progressions</option>
                  <option value="return">Solar Return</option>
                </select>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white py-6 rounded-xl text-lg font-light"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Data'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* JSON Output */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-light">JSON Output</CardTitle>
                <CardDescription>Copy and paste into your AI app</CardDescription>
              </div>
              {jsonOutput && (
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {jsonOutput ? (
                <pre className="bg-gray-50 p-4 rounded-xl overflow-auto max-h-[600px] text-sm font-mono">
                  {jsonOutput}
                </pre>
              ) : (
                <div className="bg-gray-50 p-12 rounded-xl text-center">
                  <p className="text-gray-400 font-light">
                    Generated data will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default Generate;

