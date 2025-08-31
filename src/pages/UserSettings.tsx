
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const UserSettings = () => {
  const { user, signOut } = useAuth();
  const { profile, isLoading } = useProfile();

  const handleSignOut = async () => {
    await signOut();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your account details and verification status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <p className="text-sm text-muted-foreground">{user?.email || 'Not set'}</p>
              </div>

              <div>
                <label className="text-sm font-medium">Verification Status</label>
                <div className="mt-1">
                  <Badge variant={profile?.email_verified ? "default" : "secondary"}>
                    {profile?.email_verified ? "Verified" : "Pending Verification"}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Subscription Plan</label>
                <p className="text-sm text-muted-foreground capitalize">
                  {profile?.subscription_plan || 'Free'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <CardDescription>Manage your account</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleSignOut} variant="outline">
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
