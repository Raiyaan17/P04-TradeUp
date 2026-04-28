"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Spinner } from "../spinner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useUser } from "@/context/UserContext";
import { http, ApiException } from "@/lib/http";


interface AuthFormFields {
  email: string;
  username: string;
  password: string;
  confirm: string;
}

export function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<"TRADER" | "ADMIN">("TRADER");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AuthFormFields>({ mode: "onBlur" });
  const [showPw, setShowPw] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const router = useRouter();
  const { refreshUser } = useUser();

  function browseAsGuest() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
    }
    router.push("/dashboard");
  }

  async function onSubmit(data: AuthFormFields) {
    setMessage(null);
    if (mode === "signup" && data.password !== data.confirm) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }
    if (mode === "signup" && !gender) {
      setMessage({ type: "error", text: "Please select your gender." });
      return;
    }
    setIsLoading(true);
    try {
      const url = mode === "signin" ? "/auth/login" : "/auth/signup";
      const body: Record<string, string> = { email: data.email, password: data.password };
      if (mode === "signup") {
        body.username = data.username;
        body.role = role;
        body.gender = gender!;
      }

      const result = await http.post<{ access_token?: string }>(url, body, { noAuth: true });

      if (mode === "signin") {
        const token = result?.access_token;
        if (typeof token === "string" && token.length > 0) {
          localStorage.setItem("access_token", token);
          try {
            await refreshUser();
          } catch {}
        }
        setMessage({ type: "success", text: "Signed in successfully." });
        router.push("/dashboard");
      } else {
        setMessage({
          type: "success",
          text: "Account created. You can sign in now.",
        });
        setMode("signin");
        setValue("password", "");
        setValue("confirm", "");
        setValue("username", "");
        setRole("TRADER");
        setGender(null);
      }
    } catch (e: unknown) {
      const msg = e instanceof ApiException ? e.message : "Request failed.";
      setMessage({ type: "error", text: msg });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="w-full flex flex-col gap-8">
      <header className="flex flex-col gap-2 items-center text-center">
        <span className="text-primary text-label-caps font-bold">↗ TRADEUP</span>
        <h1>
          {mode === "signin" ? "WELCOME BACK" : "CREATE ACCOUNT"}
        </h1>
        <p className="text-muted-foreground text-body-md">
          {mode === "signin"
            ? "Sign in to continue."
            : "It takes less than a minute."}
        </p>
      </header>

      <div className="flex justify-center gap-4">
        <Button
          variant={mode === "signin" ? "default" : "secondary"}
          onClick={() => setMode("signin")}
          aria-pressed={mode === "signin"}
        >
          Sign in
        </Button>
        <Button
          variant={mode === "signup" ? "default" : "secondary"}
          onClick={() => setMode("signup")}
          aria-pressed={mode === "signup"}
        >
          Sign up
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-label-caps text-muted-foreground">EMAIL</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email", {
              required: "Email is required",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Please enter a valid email address.",
              },
            })}
            placeholder="you@example.com"
          />
          {errors.email && (
            <span className="text-destructive text-xs">
              {errors.email.message}
            </span>
          )}
        </div>

        {mode === "signup" && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="username" className="text-label-caps text-muted-foreground">USERNAME</Label>
            <Input
              id="username"
              type="text"
              autoComplete="username"
              {...register("username", {
                required: "Username is required",
                minLength: {
                  value: 3,
                  message: "Username must be at least 3 characters",
                },
                maxLength: {
                  value: 20,
                  message: "Username must be at most 20 characters",
                },
                pattern: {
                  value: /^[a-zA-Z0-9_]+$/,
                  message: "Username can only contain letters, numbers, and underscores",
                },
              })}
              placeholder="your_username"
            />
            {errors.username && (
              <span className="text-destructive text-xs">
                {errors.username.message}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-label-caps text-muted-foreground">PASSWORD</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              {...register("password", {
                required: "Password is required",
                minLength: {
                  value: 8,
                  message: "Password should be at least 8 characters long",
                },
              })}
              placeholder={mode === "signin" ? "Your password" : "At least 8 characters"}
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              aria-label={showPw ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground"
            >
              {showPw ? "HIDE" : "SHOW"}
            </button>
          </div>
          {errors.password && (
            <span className="text-destructive text-xs">
              {errors.password.message}
            </span>
          )}
        </div>

        {mode === "signup" && (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm" className="text-label-caps text-muted-foreground">CONFIRM PASSWORD</Label>
              <Input
                id="confirm"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                {...register("confirm", {
                  validate: (value) =>
                    value === watch("password") || "Passwords do not match",
                })}
                placeholder="Repeat password"
              />
              {errors.confirm && (
                <span className="text-destructive text-xs">
                  {errors.confirm.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-label-caps text-muted-foreground">GENDER</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={gender === "MALE" ? "default" : "secondary"}
                  onClick={() => setGender("MALE")}
                  aria-pressed={gender === "MALE"}
                >
                  MALE
                </Button>
                <Button
                  type="button"
                  variant={gender === "FEMALE" ? "default" : "secondary"}
                  onClick={() => setGender("FEMALE")}
                  aria-pressed={gender === "FEMALE"}
                >
                  FEMALE
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-label-caps text-muted-foreground">ROLE</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={role === "TRADER" ? "default" : "secondary"}
                  onClick={() => setRole("TRADER")}
                  aria-pressed={role === "TRADER"}
                >
                  TRADER
                </Button>
                <Button
                  type="button"
                  variant={role === "ADMIN" ? "default" : "secondary"}
                  onClick={() => setRole("ADMIN")}
                  aria-pressed={role === "ADMIN"}
                >
                  ADMIN
                </Button>
              </div>
            </div>
          </>
        )}

        {message && (
          <div
            role={message.type === "error" ? "alert" : "status"}
            className={`text-sm rounded-md px-4 py-3 ${
              message.type === "error"
                ? "bg-destructive/20 text-destructive-foreground border border-destructive/50"
                : "bg-primary/20 text-primary-foreground border border-primary/50"
            }`}
          >
            {message.text}
          </div>
        )}

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <Spinner />
          ) : (
            <>
              {mode === "signin" ? "SIGN IN →" : "CREATE ACCOUNT →"}
            </>
          )}
        </Button>

        <div className="flex items-center gap-4 py-2">
          <div className="h-px bg-border flex-1"></div>
          <span className="text-muted-foreground text-label-caps">OR</span>
          <div className="h-px bg-border flex-1"></div>
        </div>

        <Button
          type="button"
          onClick={browseAsGuest}
          variant="outline"
          className="w-full"
        >
          BROWSE AS GUEST
        </Button>
      </form>
    </section>
  );
}
