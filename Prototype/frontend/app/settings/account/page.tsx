"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { http, ApiException } from "@/lib/http";
import { useUser } from "@/context/UserContext";

type NameFormFields = {
  newName: string;
  currentPassword: string;
};

type EmailFormFields = {
  newEmail: string;
  currentPassword: string;
};

type PasswordFormFields = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function AccountSettingsPage() {
  const { user, refreshUser } = useUser();
  const [isNameLoading, setIsNameLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  // Name form
  const nameForm = useForm<NameFormFields>({
    defaultValues: {
      newName: user?.name || "",
      currentPassword: "",
    },
  });

  // Email form
  const emailForm = useForm<EmailFormFields>({
    defaultValues: {
      newEmail: user?.email || "",
      currentPassword: "",
    },
  });

  // Password form
  const passwordForm = useForm<PasswordFormFields>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function handleNameSubmit(data: NameFormFields) {
    if (!data.currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (!data.newName.trim()) {
      toast.error("Please enter a name");
      return;
    }
    if (data.newName === user?.name) {
      toast.error("New name is the same as current name");
      return;
    }

    setIsNameLoading(true);
    try {
      await http.put("/users/name", {
        newName: data.newName,
        currentPassword: data.currentPassword,
      });
      toast.success("Name updated successfully");
      await refreshUser();
      nameForm.setValue("currentPassword", "");
    } catch (error) {
      const message = error instanceof ApiException ? error.message : "Failed to update name";
      toast.error(message);
    } finally {
      setIsNameLoading(false);
    }
  }

  async function handleEmailSubmit(data: EmailFormFields) {
    if (!data.currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (!data.newEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    if (data.newEmail === user?.email) {
      toast.error("New email is the same as current email");
      return;
    }

    setIsEmailLoading(true);
    try {
      await http.put("/users/email", {
        newEmail: data.newEmail,
        currentPassword: data.currentPassword,
      });
      toast.success("Email updated successfully");
      await refreshUser();
      emailForm.setValue("currentPassword", "");
    } catch (error) {
      const message = error instanceof ApiException ? error.message : "Failed to update email";
      toast.error(message);
    } finally {
      setIsEmailLoading(false);
    }
  }

  async function handlePasswordSubmit(data: PasswordFormFields) {
    if (!data.currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (!data.newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (data.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (data.newPassword !== data.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsPasswordLoading(true);
    try {
      await http.put("/users/password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success("Password updated successfully");
      passwordForm.reset();
    } catch (error) {
      const message = error instanceof ApiException ? error.message : "Failed to update password";
      toast.error(message);
    } finally {
      setIsPasswordLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Change Name */}
      <div className="bg-card rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.2)] border border-transparent hover:border-primary/20 transition-colors overflow-hidden">
        <div className="p-6 border-b border-border/50">
          <h2 className="text-2xl font-bold tracking-tight">Change Name</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Update your display name. This will be visible across the application.
          </p>
        </div>
        <div className="p-6">
          <form onSubmit={nameForm.handleSubmit(handleNameSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="newName" className="text-label-caps text-muted-foreground block">FULL NAME</Label>
              <Input
                id="newName"
                type="text"
                placeholder="Your name"
                className="bg-muted border-b-2 border-border border-x-0 border-t-0 focus:ring-0 focus:border-primary outline-none font-mono text-base rounded-t-md rounded-b-none"
                {...nameForm.register("newName")}
              />
            </div>
            <Separator className="my-6 opacity-50" />
            <div className="space-y-2">
              <Label htmlFor="nameCurrentPassword" className="text-label-caps text-muted-foreground block">CURRENT PASSWORD</Label>
              <Input
                id="nameCurrentPassword"
                type="password"
                placeholder="Enter your current password"
                autoComplete="current-password"
                className="bg-muted border-b-2 border-border border-x-0 border-t-0 focus:ring-0 focus:border-primary outline-none font-mono text-base rounded-t-md rounded-b-none"
                {...nameForm.register("currentPassword")}
              />
              <p className="text-xs font-mono text-muted-foreground mt-1">
                Required to confirm changes
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isNameLoading} className="text-label-caps">
                {isNameLoading ? "UPDATING..." : "UPDATE NAME"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Change Email */}
      <div className="bg-card rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.2)] border border-transparent hover:border-primary/20 transition-colors overflow-hidden">
        <div className="p-6 border-b border-border/50">
          <h2 className="text-2xl font-bold tracking-tight">Change Email</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Update your email address. This is used for login and notifications.
          </p>
        </div>
        <div className="p-6">
          <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="newEmail" className="text-label-caps text-muted-foreground block">EMAIL ADDRESS</Label>
              <Input
                id="newEmail"
                type="email"
                placeholder="your@email.com"
                autoComplete="email"
                className="bg-muted border-b-2 border-border border-x-0 border-t-0 focus:ring-0 focus:border-primary outline-none font-mono text-base rounded-t-md rounded-b-none"
                {...emailForm.register("newEmail", {
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Please enter a valid email address",
                  },
                })}
              />
              {emailForm.formState.errors.newEmail && (
                <p className="text-xs text-[#eb5757]">
                  {emailForm.formState.errors.newEmail.message}
                </p>
              )}
            </div>
            <Separator className="my-6 opacity-50" />
            <div className="space-y-2">
              <Label htmlFor="emailCurrentPassword" className="text-label-caps text-muted-foreground block">CURRENT PASSWORD</Label>
              <Input
                id="emailCurrentPassword"
                type="password"
                placeholder="Enter your current password"
                autoComplete="current-password"
                className="bg-muted border-b-2 border-border border-x-0 border-t-0 focus:ring-0 focus:border-primary outline-none font-mono text-base rounded-t-md rounded-b-none"
                {...emailForm.register("currentPassword")}
              />
              <p className="text-xs font-mono text-muted-foreground mt-1">
                Required to confirm changes
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isEmailLoading} className="text-label-caps">
                {isEmailLoading ? "UPDATING..." : "UPDATE EMAIL"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-card rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.2)] border border-transparent hover:border-primary/20 transition-colors overflow-hidden">
        <div className="p-6 border-b border-border/50">
          <h2 className="text-2xl font-bold tracking-tight">Change Password</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Update your password. Use a strong password with at least 8 characters.
          </p>
        </div>
        <div className="p-6">
          <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="currentPasswordField" className="text-label-caps text-muted-foreground block">CURRENT PASSWORD</Label>
              <Input
                id="currentPasswordField"
                type="password"
                placeholder="Enter your current password"
                autoComplete="current-password"
                className="bg-muted border-b-2 border-border border-x-0 border-t-0 focus:ring-0 focus:border-primary outline-none font-mono text-base rounded-t-md rounded-b-none"
                {...passwordForm.register("currentPassword")}
              />
            </div>
            <Separator className="my-6 opacity-50" />
            <div className="space-y-2">
              <Label htmlFor="newPasswordField" className="text-label-caps text-muted-foreground block">NEW PASSWORD</Label>
              <Input
                id="newPasswordField"
                type="password"
                placeholder="Enter your new password"
                autoComplete="new-password"
                className="bg-muted border-b-2 border-border border-x-0 border-t-0 focus:ring-0 focus:border-primary outline-none font-mono text-base rounded-t-md rounded-b-none"
                {...passwordForm.register("newPassword", {
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters",
                  },
                })}
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-xs text-[#eb5757]">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPasswordField" className="text-label-caps text-muted-foreground block">CONFIRM NEW PASSWORD</Label>
              <Input
                id="confirmPasswordField"
                type="password"
                placeholder="Confirm your new password"
                autoComplete="new-password"
                className="bg-muted border-b-2 border-border border-x-0 border-t-0 focus:ring-0 focus:border-primary outline-none font-mono text-base rounded-t-md rounded-b-none"
                {...passwordForm.register("confirmPassword")}
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isPasswordLoading} className="text-label-caps">
                {isPasswordLoading ? "UPDATING..." : "UPDATE PASSWORD"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
