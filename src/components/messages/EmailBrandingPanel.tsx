
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Eye, Save, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmailBrandingPanelProps {
  onBack: () => void;
}

export const EmailBrandingPanel = ({ onBack }: EmailBrandingPanelProps) => {
  const [signature, setSignature] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const url = URL.createObjectURL(file);
      setLogoUrl(url);
    }
  };

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your email branding settings have been saved successfully.",
    });
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header with back button */}
      <div className="flex items-center gap-4 p-6 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Messages
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Email Branding</h1>
          <p className="text-muted-foreground">
            Customize your email signature and logo to maintain consistent branding across all communications.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl">
          <Tabs defaultValue="signature" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signature">Email Signature</TabsTrigger>
              <TabsTrigger value="logo">Logo Management</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="signature" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Email Signature Editor</CardTitle>
                  <CardDescription>
                    Create a professional email signature that will be automatically added to your outgoing emails.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="signature">Signature Content</Label>
                    <Textarea
                      id="signature"
                      placeholder="Enter your email signature here..."
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      rows={8}
                      className="mt-2"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Signature
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logo" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Logo Upload & Management</CardTitle>
                  <CardDescription>
                    Upload your company logo to include in email signatures and templates.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="logo-upload">Upload Logo</Label>
                    <div className="mt-2 flex items-center gap-4">
                      <Input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                      />
                      <Button variant="outline">
                        <Upload className="w-4 h-4 mr-2" />
                        Browse
                      </Button>
                    </div>
                  </div>
                  
                  {logoUrl && (
                    <div className="space-y-2">
                      <Label>Current Logo</Label>
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <img
                          src={logoUrl}
                          alt="Company Logo"
                          className="max-w-xs max-h-32 object-contain"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={handleSave}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Logo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Eye className="w-5 h-5 mr-2 inline" />
                    Email Preview
                  </CardTitle>
                  <CardDescription>
                    See how your emails will look with the current branding settings.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="space-y-4">
                      <div className="border-b pb-2">
                        <p className="text-sm text-gray-600">To: client@example.com</p>
                        <p className="text-sm text-gray-600">Subject: Sample Email</p>
                      </div>
                      
                      <div className="space-y-4">
                        <p>Hello,</p>
                        <p>This is a sample email to show how your branding will appear.</p>
                        
                        {signature && (
                          <div className="border-t pt-4 mt-4">
                            <div className="flex items-start gap-4">
                              {logoUrl && (
                                <img
                                  src={logoUrl}
                                  alt="Logo"
                                  className="w-16 h-16 object-contain"
                                />
                              )}
                              <div className="whitespace-pre-wrap text-sm">
                                {signature}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
