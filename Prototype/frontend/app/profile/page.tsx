'use client';

import { useRef } from "react";
import { toast } from "sonner";
import { Camera, Trophy } from "lucide-react";
import { AppShell } from "@/components/layout";
import { PageHeader } from "@/components/common";

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
        <div className="h-fit bg-card rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.2)] border border-transparent hover:border-primary/20 transition-colors overflow-hidden">
          <div className="p-6 border-b border-border/50">
            <h2 className="text-label-caps text-foreground">MY PROFILE</h2>
          </div>
          <div className="p-8 flex flex-col items-center gap-6">
            <div className="relative group">
              <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                {user?.profileImageUrl ? (
                  <AvatarImage src={user.profileImageUrl} alt={user.name || "User"} className="object-cover" />
                ) : null}
                <AvatarFallback className="text-4xl bg-primary/20 text-primary font-bold">
                  {getInitials(user?.name, user?.email)}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-primary hover:bg-[#5a9aff] shadow-[0_0_12px_rgba(74,142,255,0.4)] text-primary-foreground transition-transform group-hover:scale-110"
                onClick={handleButtonClick}
              >
                <Camera className="h-5 w-5" />
              </Button>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-3xl font-bold tracking-tight">{user?.name || 'USER'}</h3>
              <div className="space-y-1">
                {user?.username && (
                  <p className="text-sm font-mono text-muted-foreground tracking-wide">@{user.username}</p>
                )}
                <p className="text-sm font-mono text-muted-foreground">{user?.email || ''}</p>
              </div>
              
              <div className="pt-6">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-5 py-2 rounded-full font-bold shadow-sm">
                  <Trophy className="w-5 h-5 text-primary" />
                  <span className="text-label-caps">{user?.tournamentScore || 0} ELO</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Friends Section */}
        <FriendsSection />
      </div>
    </AppShell>
  );
}

