import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, ShieldCheck, UserCog } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="Settings & Security"
        description="Manage your account settings and security preferences."
      />
      <div className="grid gap-8 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline">API Key Management</CardTitle>
            <CardDescription>
              This section is protected by Role-Based Access Control (RBAC). Only users with 'Admin'
              privileges can view and manage API keys.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="api-key">Your API Key</Label>
              <div className="flex items-center gap-2">
                <Input id="api-key" readOnly value="sdi_live_******************1234" />
                <Button variant="outline">Copy</Button>
                <Button variant="destructive">Revoke</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <div className="flex items-center gap-2">
                <Input id="webhook-url" defaultValue="https://api.schooldata.com/v1/webhooks" />
                <Button>Update</Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Receive event notifications to this URL.
              </p>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-8">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 font-headline"><UserCog className="w-5 h-5 text-primary" /> Roles & Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your current role is <span className="font-bold text-foreground">Administrator</span>. You have full access to all features and settings.
              </p>
              <Button variant="link" className="px-0">Manage Roles</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 font-headline"><ShieldCheck className="w-5 h-5 text-primary" /> Two-Factor Authentication</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="2fa-switch" className="flex-grow">Enable 2FA</Label>
                <Switch id="2fa-switch" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Enhance your account security by enabling two-factor authentication.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
