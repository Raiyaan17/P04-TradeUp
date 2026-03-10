
"use client";
import { RoleChip } from "./role-chip";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Spinner } from "../spinner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useUser } from "@/context/UserContext";
import { http, ApiException } from "@/lib/http";

type AuthFormFields = {
  email: string;
  username: string;
  password: string;
  confirm: string;
};

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
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
      const body: { email: string; password: string; username?: string; role?: string; gender?: string } = { email: data.email, password: data.password };
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
          // Hydrate user context before navigating so auth-gated pages render correctly
          try {
            await refreshUser();
          } catch {
            // Profile fetch failed but signin succeeded; proceed anyway
          }
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
    <section className="relative w-full m-10 rounded-l-3xl bg-black/50 backdrop-blur-md border border-white/10 shadow-lg overflow-y-auto">
      <header className="px-6 pt-6 pb-2">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-gray-300">
          {mode === "signin"
            ? "Sign in to continue."
            : "It takes less than a minute."}
        </p>
      </header>

      <div className="px-6 pt-2">
        <div className="inline-flex rounded-full bg-black/20 border border-white/10 p-1">
          <button
            onClick={() => setMode("signin")}
            aria-pressed={mode === "signin"}
            className={`cursor-pointer px-4 py-1.5 text-sm rounded-full transition-all ${mode === "signin"
              ? "bg-white/10 shadow text-white"
              : "text-gray-300 hover:text-white"
              }`}
          >
            Sign in
          </button>
          <button
            onClick={() => setMode("signup")}
            aria-pressed={mode === "signup"}
            className={`cursor-pointer px-4 py-1.5 text-sm rounded-full transition-all ${mode === "signup"
              ? "bg-white/10 shadow text-white"
              : "text-gray-300 hover:text-white"
              }`}
          >
            Sign up
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-6 pt-4 pb-6 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
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
            className="bg-black/20 border-white/20 text-white placeholder:text-gray-400"
          />
          {errors.email && (
            <span className="text-red-400 text-xs mt-1">
              {errors.email.message}
            </span>
          )}
        </div>

        {mode === "signup" && (
          <div>
            <Label htmlFor="username">Username</Label>
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
              className="bg-black/20 border-white/20 text-white placeholder:text-gray-400"
            />
            {errors.username && (
              <span className="text-red-400 text-xs mt-1">
                {errors.username.message}
              </span>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              {...register("password", {
                required: "Password is required",
                minLength: {
                  value: 8,
                  message: "Password should be at least 8 characters long",
                },
              })}
              placeholder={
                mode === "signin" ? "Your password" : "At least 8 characters"
              }
              className="bg-black/20 border-white/20 text-white placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              aria-label={showPw ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 px-3 text-gray-300 hover:text-white"
            >
              {showPw ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 3l18 18"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M10.58 10.58a3 3 0 004.24 4.24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M9.88 5.08A10.4 10.4 0 0121 12s-2.5 4.5-9 4.5c-.73 0-1.43-.06-2.08-.17M6.12 8.01A10.5 10.5 0 003 12s2.5 4.5 9 4.5c.36 0 .71-.01 1.05-.04"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M3 12s2.5-6 9-6 9 6 9 6-2.5 6-9 6-9-6-9-6z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              )}
            </button>
          </div>
          {errors.password && (
            <span className="text-red-400 text-xs mt-1">
              {errors.password.message}
            </span>
          )}
        </div>

        {mode === "signup" && (
          <>
            <div>
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                {...register("confirm", {
                  validate: (value) =>
                    value === watch("password") || "Passwords do not match",
                })}
                placeholder="Repeat password"
                className="bg-black/20 border-white/20 text-white placeholder:text-gray-400"
              />
              {errors.confirm && (
                <span className="text-red-400 text-xs mt-1">
                  {errors.confirm.message}
                </span>
              )}
            </div>
            <div>
              <Label>Gender</Label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setGender("MALE")}
                  aria-pressed={gender === "MALE"}
                  className={`px-3 py-1.5 rounded-xl text-xs border transition ${gender === "MALE"
                    ? "bg-white/10 text-white border-white/20"
                    : "bg-black/20 border-white/10 text-gray-300 hover:border-white/50 hover:text-white"
                    }`}
                >
                  Male
                </button>
                <button
                  type="button"
                  onClick={() => setGender("FEMALE")}
                  aria-pressed={gender === "FEMALE"}
                  className={`px-3 py-1.5 rounded-xl text-xs border transition ${gender === "FEMALE"
                    ? "bg-white/10 text-white border-white/20"
                    : "bg-black/20 border-white/10 text-gray-300 hover:border-white/50 hover:text-white"
                    }`}
                >
                  Female
                </button>
              </div>
            </div>
            <div>
              <Label>Role</Label>
              <div className="flex gap-2 mt-1">
                {/* @ts-expect-error - RoleChip props type issue */}
                <RoleChip value="TRADER" current={role} onPick={setRole} />
                {/* @ts-expect-error - RoleChip props type issue */}
                <RoleChip value="ADMIN" current={role} onPick={setRole} />
              </div>
            </div>
          </>
        )}

        {message && (
          <div
            role={message.type === "error" ? "alert" : "status"}
            className={`text-sm rounded-xl px-3 py-2 border ${message.type === "error"
              ? "bg-red-900/30 text-red-300 border-red-500/30"
              : "bg-green-900/30 text-green-300 border-green-500/30"
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
              {mode === "signin" ? "Sign in" : "Create account"}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="opacity-90 ml-2"
              >
                <path
                  d="M5 12h14"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <path
                  d="M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          )}
        </Button>

        <div className="pt-2">
          <Button
            type="button"
            onClick={browseAsGuest}
            variant="outline"
            className="w-full bg-black border-white/20 text-white hover:bg-black/40"
          >
            Browse stocks as guest
          </Button>
          <p className="mt-1 text-center text-xs text-gray-400">
            You can view prices but must sign in to save to watchlist.
          </p>
        </div>

        <p className="text-center text-sm text-gray-300 pt-1">
          {mode === "signin" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="cursor-pointer underline hover:text-white"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="underline hover:text-white"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </form>
    </section>
  );
}

