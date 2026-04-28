'use client'

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User, HelpCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { getFriendRequests } from "@/lib/friendsService";

export function TopBar() {
  const { user, refreshUser } = useUser();
  const router = useRouter();
  const [hasRequests, setHasRequests] = useState(false);

  const handleSignOut = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
    }
    try {
      await refreshUser();
    } catch {}
    router.push("/");
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

  useEffect(() => {
    const checkRequests = async () => {
      try {
        const requests = await getFriendRequests();
        setHasRequests(requests.length > 0);
      } catch {}
    };

    checkRequests();
    const interval = setInterval(checkRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-border bg-background h-16 sticky top-0 z-40">
      <div className="h-full px-6 flex items-center justify-between md:justify-end">
        {/* Mobile Logo */}
        <div className="md:hidden">
          <Link href="/dashboard" className="text-primary text-label-caps font-bold">
            ↗ TRADEUP
          </Link>
        </div>

        {/* Right side Actions */}
        <div className="flex items-center gap-4">
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  {user?.profileImageUrl ? (
                    <AvatarImage src={user.profileImageUrl} alt={user.name || "User"} />
                  ) : null}
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-label-caps">
                    {getInitials(user?.name, user?.email)}
                  </AvatarFallback>
                </Avatar>
                {hasRequests && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-background" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || ''}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer text-label-caps">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/account" className="cursor-pointer text-label-caps">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/help" className="cursor-pointer text-label-caps">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Help</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer text-destructive focus:text-destructive text-label-caps"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default TopBar;
