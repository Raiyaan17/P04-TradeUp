'use client';

import { useRef } from "react";
import { toast } from "sonner";
import { Camera, Trophy } from "lucide-react";
import { AppShell } from "@/components/layout";
import { PageHeader } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadFile, ApiException } from "@/lib/http";
import { useUser } from "@/context/UserContext";
import { FriendsSection } from "@/components/profile/FriendsSection";

export default function Profile() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, refreshUser } = useUser();

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

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
        title="Profile"
        description="View your profile and manage friends"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
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
            <div className="text-center space-y-1">
              <h3 className="text-xl font-semibold">{user?.name || 'User'}</h3>
              {user?.username && (
                <p className="text-sm text-muted-foreground">@{user.username}</p>
              )}
              <p className="text-sm text-muted-foreground">{user?.email || ''}</p>
              
              <div className="pt-4 pb-2">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-full font-bold">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span>{user?.tournamentScore || 0} ELO</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Friends Section */}
        <FriendsSection />
      </div>
    </AppShell>
  );
}

