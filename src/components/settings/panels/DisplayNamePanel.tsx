import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserData } from '@/hooks/useUserData';
import { Loader, Check } from 'lucide-react';
import { toast } from 'sonner';

const DisplayNamePanel: React.FC = () => {
  const { profile, displayName, updateDisplayName, loading } = useUserData();
  const [isEditing, setIsEditing] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(profile?.display_name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!newDisplayName.trim()) {
      toast.error('Display name cannot be empty');
      return;
    }

    setSaving(true);
    try {
      const { error } = await updateDisplayName(newDisplayName.trim());
      if (error) {
        toast.error('Failed to update display name');
      } else {
        toast.success('Display name updated successfully');
        setIsEditing(false);
      }
    } catch (err) {
      toast.error('Failed to update display name');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setNewDisplayName(profile?.display_name || '');
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex items-center justify-center">
          <Loader className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-6">Display Name</h2>

      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="display-name" className="text-sm font-medium">
              Display Name
            </Label>
            <p className="text-sm text-gray-500 mb-3">
              This name will be shown in the sidebar and throughout the app. If not set, your email prefix will be used.
            </p>
            
            {isEditing ? (
              <div className="space-y-3">
                <Input
                  id="display-name"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  className="max-w-md"
                  disabled={saving}
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSave} 
                    disabled={saving}
                    size="sm"
                  >
                    {saving ? (
                      <Loader className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Save
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleCancel}
                    disabled={saving}
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="text-lg font-medium text-gray-900 min-w-0 flex-1">
                  {displayName}
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditing(true)}
                  size="sm"
                >
                  Edit
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Current Display</h4>
          <p className="text-sm text-gray-600">
            Your display name appears in the left sidebar settings button and throughout the app.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DisplayNamePanel;
