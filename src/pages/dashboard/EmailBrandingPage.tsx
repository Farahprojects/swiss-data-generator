
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Upload, Save, Eye, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const EmailBrandingPage = () => {
  const [signature, setSignature] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const { toast } = useToast();

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const url = URL.createObjectURL(file);
      setLogoUrl(url);
      toast({
        title: "Logo uploaded",
        description: "Your logo has been uploaded successfully.",
      });
    }
  };

  const handleSaveSettings = () => {
    // TODO: Implement actual save functionality
    toast({
      title: "Settings saved",
      description: "Your email branding settings have been saved.",
    });
  };

  const togglePreview = () => {
    setPreviewMode(!previewMode);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Branding</h1>
          <p className="text-muted-foreground">
            Customize your email signature and logo for professional communications
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={togglePreview}>
            <Eye className="w-4 h-4 mr-2" />
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
          <Button onClick={handleSaveSettings}>
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>

      {previewMode ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Preview
            </CardTitle>
            <CardDescription>
              This is how your emails will appear to recipients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-6 bg-white">
              <div className="mb-4">
                <p className="text-sm text-gray-600">From: you@example.com</p>
                <p className="text-sm text-gray-600">To: client@example.com</p>
                <p className="text-sm text-gray-600 mb-4">Subject: Sample Email</p>
              </div>
              <div className="mb-6">
                <p className="mb-4">Dear Client,</p>
                <p className="mb-4">This is a sample email to show how your branding will appear.</p>
                <p className="mb-6">Best regards,</p>
              </div>
              <Separator className="my-4" />
              <div className="flex items-start gap-4">
                {logoUrl && (
                  <img 
                    src={logoUrl} 
                    alt="Company Logo" 
                    className="w-16 h-16 object-contain"
                  />
                )}
                <div className="flex-1">
                  <div 
                    className="text-sm whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: signature.replace(/\n/g, '<br>') }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Email Signature Section */}
          <Card>
            <CardHeader>
              <CardTitle>Email Signature</CardTitle>
              <CardDescription>
                Create a professional signature that will be automatically added to your emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="signature">Signature Content</Label>
                <Textarea
                  id="signature"
                  placeholder="Enter your email signature here...&#10;&#10;Example:&#10;John Doe&#10;CEO, Your Company&#10;Phone: (555) 123-4567&#10;Email: john@company.com&#10;Website: www.company.com"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  rows={8}
                  className="mt-2"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                <p>💡 Tips for a great signature:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Keep it concise and professional</li>
                  <li>Include your name, title, and contact info</li>
                  <li>Add your website or social media links</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Logo Section */}
          <Card>
            <CardHeader>
              <CardTitle>Company Logo</CardTitle>
              <CardDescription>
                Upload your company logo to include in email signatures
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="logo-upload">Logo Upload</Label>
                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {logoUrl ? (
                    <div className="space-y-4">
                      <img 
                        src={logoUrl} 
                        alt="Uploaded Logo" 
                        className="mx-auto w-24 h-24 object-contain"
                      />
                      <p className="text-sm text-gray-600">Logo uploaded successfully</p>
                      <Button variant="outline" onClick={() => document.getElementById('logo-upload')?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        Change Logo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="mx-auto w-12 h-12 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">Upload your logo</p>
                        <p className="text-sm text-gray-500">PNG, JPG up to 2MB</p>
                      </div>
                      <Button variant="outline" onClick={() => document.getElementById('logo-upload')?.click()}>
                        Choose File
                      </Button>
                    </div>
                  )}
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>💡 Logo guidelines:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Use high-quality images (300+ DPI)</li>
                  <li>Square or rectangular formats work best</li>
                  <li>Keep file size under 2MB</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EmailBrandingPage;
