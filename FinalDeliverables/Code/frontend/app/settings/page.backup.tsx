'use client';

import { useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { AppShell } from "@/components/layout";
import { PageHeader } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadFile, http, ApiException } from "@/lib/http";
import { useUser } from "@/context/UserContext";

type SettingsFormFields = {
  name: string;
  email: string;
  password: string;
  confirm: string;
};

export default function Settings() {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<SettingsFormFields>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, refreshUser } = useUser();

  // Initialize form with user data
  if (user && !errors.name && !errors.email) {
    setValue('name', user.name || '');
    setValue('email', user.email || '');
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  async function changeData(data: SettingsFormFields) {
    try {
      if (!data.confirm && (data.name !== user?.name || data.email !== user?.email || data.password)) {
        toast.error("Please enter your current password to make changes.");
        return;
      }
      
      if (data.name && data.name !== user?.name) {
        await http.put('/users/name', { newName: data.name, currentPassword: data.confirm });
        toast.success("Name updated successfully");
      }
      
      if (data.email && data.email !== user?.email) {
        await http.put('/users/email', { newEmail: data.email, currentPassword: data.confirm });
        toast.success("Email updated successfully");
      }
      
      if (data.password) {
        await http.put('/users/password', { currentPassword: data.confirm, newPassword: data.password });
        toast.success("Password updated successfully");
      }
      
      await refreshUser();
      setValue('password', '');
      setValue('confirm', '');
    } catch (error) {
      const message = error instanceof ApiException ? error.message : "Failed to update profile";
      toast.error(message);
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        await uploadFile('/users/profile-picture', file, 'file');
        await refreshUser();
        toast.success("Profile picture updated");
      } catch (error) {
        const message = error instanceof ApiException ? error.message : "Failed to upload profile image";
        toast.error(message);
      }
    }
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <AppShell>
      <PageHeader 
        title="Settings" 
        description="Manage your account settings and profile"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                {user?.profileImageUrl ? (
                  <AvatarImage src={user.profileImageUrl} alt={user.name || "User"} />
                ) : null}
                <AvatarFallback className="text-2xl">
                  {getInitials(user?.name, user?.email)}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="secondary"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                onClick={handleButtonClick}
              >
                <Camera className="h-4 w-4" />
              </Button>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold">{user?.name || 'User'}</h3>
              <p className="text-sm text-muted-foreground">{user?.email || ''}</p>
            </div>
          </CardContent>
        </Card>

        {/* Account Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(changeData)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name"
                  {...register('name')} 
                  type="text" 
                  placeholder="Your name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email"
                  {...register('email', {
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Please enter a valid email address.",
                    },
                  })} 
                  type="email" 
                  placeholder="your@email.com"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input 
                  id="password"
                  {...register('password', {
                    minLength: {
                      value: 8,
                      message: "Password should be at least 8 characters long",
                    },
                  })} 
                  type="password" 
                  placeholder="Leave blank to keep current"
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm">Current Password</Label>
                <Input 
                  id="confirm"
                  {...register('confirm')} 
                  type="password" 
                  placeholder="Required to make changes"
                />
              </div>
              
              <div className="flex justify-between pt-4">
                <Button type="submit">
                  Update Info
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setValue('name', user?.name || '');
                    setValue('email', user?.email || '');
                    setValue('password', '');
                    setValue('confirm', '');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
