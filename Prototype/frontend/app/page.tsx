"use client";
import Image from "next/image";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

/**
 * Minimal, fluid, highly‑styled auth UI for Next.js (app router friendly)
 *
 * Backend (NestJS) contracts from your screenshots:
 *  - Controller base: /auth
 *  - POST /auth/login    body: { email: string, password: string }
 *  - POST /auth/signup   body: { email: string, password: string, role?: 'TRADER' | 'ADMIN' }
 *  - Success response: { access_token: string }
 *  - Errors:
 *      - 409 Conflict: "Email already registered"
 *      - 401 Unauthorized: "Invalid credentials"
 *
 * Notes
 *  - Role is optional; backend defaults to 'TRADER' if omitted.
 *  - Set NEXT_PUBLIC_API_BASE_URL to your Nest server (e.g. http://localhost:3001).
 */

type AuthFormFields = {
  email: string;
  password: string;
  confirm: string;
};

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const {register, handleSubmit, formState:{errors}, setValue, watch} = useForm<AuthFormFields>({ mode: "onBlur" })
  const password = watch("password");
  const confirm = watch("confirm");
  const [role, setRole] = useState<"TRADER" | "ADMIN" | "">(""); // optional per backend
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const router = useRouter();

  function browseAsGuest() {
    // ensure guest: no lingering JWT
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
    }
    router.push("/dashboard");
  }

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?  process.env.NEXT_PUBLIC_API_BASE_URL : "http://localhost:3001";

  function validate(data: AuthFormFields) {
    if (mode === "signup") {
      if (data.confirm !== data.password) return "Passwords do not match.";
    }
    return null;
  }

  async function onSubmit(data: AuthFormFields) {
    setMessage(null);
    const err = validate(data);
    if (err) {
      setMessage({ type: "error", text: err });
      return;
    }
    setIsLoading(true);
    try {
      const url = mode === "signin" ? "/auth/login" : "/auth/signup";
      const body: any = { email: data.email, password: data.password };
      if (mode === "signup" && role) body.role = role; // optional; backend falls back to TRADER

      const res = await fetch(`${API_BASE}${url}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        const serverMsg = (result && (result.message || result.error)) || "Something went wrong.";
        throw new Error(Array.isArray(serverMsg) ? serverMsg.join(" \u2022 ") : serverMsg);
      }

      if (mode === "signin") {
        const token = result?.access_token;
        if (typeof token === "string" && token.length > 0) {
          // Store token (quick start). For production, prefer an httpOnly cookie via Next route handler.
          localStorage.setItem("access_token", token);
        }
        setMessage({ type: "success", text: "Signed in successfully." });
        router.push("/dashboard");
      } else {
        setMessage({ type: "success", text: "Account created. You can sign in now." });
        setMode("signin");
        setValue("password", "");
        setValue("confirm", "");
      }
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message || "Request failed." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-svh w-full bg-[#111418] flex items-center justify-center overflow-hidden">
      <div className="flex min-h-140">
        {/* Card */}
        <section className="w-100 relative rounded-bl-3xl rounded-tl-3xl bg-[#1C1F24] shadow-lg ring-1 ring-[#2D3139] overflow-hidden">
          {/* Header */}
          <header className="px-6 pt-6 pb-2">
            <h1 className="text-2xl font-semibold tracking-tight text-[#E4E6EB]">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
            <p className="mt-1 text-sm text-[#9BA1A6]">
              {mode === "signin" ? "Sign in to continue." : "It takes less than a minute."}
            </p>
          </header>

          {/* Mode switch */}
          <div className="px-6 pt-2">
            <div className="inline-flex rounded-full bg-[#1C1F24] p-1">
              <button
                onClick={() => setMode("signin")}
                aria-pressed={mode === "signin"}
                className={`cursor-pointer px-4 py-1.5 text-sm rounded-full transition-all ${
                  mode === "signin" ? "bg-[#2D3139] shadow text-[#E4E6EB]" : "text-[#9BA1A6] hover:text-[#E4E6EB]"
                }`}
              >
                Sign in
              </button>
              <button
                onClick={() => setMode("signup")}
                aria-pressed={mode === "signup"}
                className={`cursor-pointer px-4 py-1.5 text-sm rounded-full transition-all ${
                  mode === "signup" ? "bg-[#2D3139] shadow text-[#E4E6EB]" : "text-[#9BA1A6] hover:text-[#E4E6EB]"
                }`}
              >
                Sign up
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="px-6 pt-4 pb-6 space-y-4">
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email',{
                  required: 'email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Please enter a valid email address."
                  }
                })}
                className="field-input bg-[#1C1F24] text-[#E4E6EB] placeholder:text-[#9BA1A6] caret-[#E4E6EB] border-[#2D3139]"
                placeholder="you@example.com"
              />
            </Field>
            {errors.email && <span className="text-red-500 mb-[10px] block">{errors.email.message}</span>}

            <Field label="Password" htmlFor="password">
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  {...register("password",{
                    required: 'passsword is required',
                    minLength:{
                      value: 8,
                      message: 'password should be atleast 8 characters long'
                    } 
                  })}
                  className="field-input bg-[#1C1F24] text-[#E4E6EB] placeholder:text-[#9BA1A6] caret-[#E4E6EB] border-[#2D3139]"
                  placeholder={mode === "signin" ? "Your password" : "atleast 8 characters"}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 px-3 text-[#9BA1A6] hover:text-[#E4E6EB]"
                >
                  {showPw ? 
                    (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M10.58 10.58a3 3 0 004.24 4.24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M9.88 5.08A10.4 10.4 0 0121 12s-2.5 4.5-9 4.5c-.73 0-1.43-.06-2.08-.17M6.12 8.01A10.5 10.5 0 003 12s2.5 4.5 9 4.5c.36 0 .71-.01 1.05-.04" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>)
                    :
                    (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z" stroke="currentColor" strokeWidth="1.5"/><path d="M3 12s2.5-6 9-6 9 6 9 6-2.5 6-9 6-9-6-9-6z" stroke="currentColor" strokeWidth="1.5"/></svg>)}
                </button>
              </div>
            </Field>
            {errors.password && <span className="text-red-500 mb-[10px] block">{errors.password.message}</span>}

            {mode === "signup" && (
              <Field label="Role (optional)" htmlFor="role">
                <div className="flex gap-2">
                  <RoleChip current={role} onPick={setRole} value="TRADER" />
                  <RoleChip current={role} onPick={setRole} value="ADMIN" />
                  <button type="button" onClick={() => setRole("") } className="text-xs text-neutral-500 underline ml-2">Clear</button>
                </div>
              </Field>
            )}

            {mode === "signup" && (
              <Field label="Confirm password" htmlFor="confirm">
                <input
                  id="confirm"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  {...register("confirm",{
                    validate: (value) => value == watch('password') || 'Both passwords should be same'
                  })}
                  className="field-input bg-[#1C1F24] text-[#E4E6EB] placeholder:text-[#9BA1A6] caret-[#E4E6EB] border-[#2D3139]"
                  placeholder="Repeat password"
                />
              </Field>
            )}
            {errors.confirm && <span className="text-red-500 mb-[10px] block">{errors.confirm.message}</span>}

            {/* Alert */}
            {message && (
              <div
                role={message.type === "error" ? "alert" : "status"}
                className={`text-sm rounded-xl px-3 py-2 border ${
                  message.type === "error"
                    ? "bg-[#2D3139] text-red-400 border-red-900/50"
                    : "bg-[#2D3139] text-green-400 border-green-900/50"
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#39FF14] text-black cursor-pointer py-3 text-sm font-medium tracking-tight shadow-sm ring-1 ring-[#1C1F24] hover:bg-[#2ecc40] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                    className="opacity-90"
                  >
                    <path d="M5 12h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    <path d="M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>

            {/* Guest browse */}
            <div className="pt-2">
              <button
                type="button"
                onClick={browseAsGuest}
                className="cursor-pointer w-full rounded-2xl bg-[#ff1744] ring-1 ring-[#d50000] text-white py-2.5 text-sm hover:bg-[#d50000] shadow-sm transition "
              >
                Browse stocks as guest
              </button>
              <p className="mt-1 text-center text-xs text-[#9BA1A6]">
                You can view prices but must sign in to save to watchlist.
              </p>
            </div>

            {/* Footer switch */}
            <p className="text-center text-sm text-[#9BA1A6] pt-1">
              {mode === "signin" ? (
                <>
                  Don't have an account?{' '}
                  <button type="button" onClick={() => setMode("signup")} className="cursor-pointer underline underline-offset-4 decoration-[#2D3139] hover:decoration-[#E4E6EB] hover:text-[#E4E6EB]">
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button type="button" onClick={() => setMode("signin")} className="underline underline-offset-4 decoration-[#2D3139] hover:decoration-[#E4E6EB] hover:text-[#E4E6EB]">
                    Sign in
                  </button>
                </>
              )}
            </p>
          </form>
        </section>
        
        {/* Tag Line */}
        <div className="bg-[url('/6256878.jpg')] px-15 flex flex-col justify-center  bg-cover bg-center w-160 rounded-tr-3xl rounded-br-3xl">
          <h1 className="text-[30px] text-white font-bold mt-4 mb-8 drop-shadow-xl">Trade Up</h1>
          <p className="text-[25px] text-white font-semibold mt-4 mb-8 drop-shadow-xl">Your gateway to smarter trading.</p>
        </div>
      </div>

      {/* Inline styles for inputs to keep this file self‑contained */}
      <style>{`
        .field-input { width: 100%; appearance: none; background: #1C1F24; border-radius: 1rem; padding: 0.75rem 0.875rem; border: 1px solid #2D3139; outline: none; box-shadow: 0 0 0 0 rgba(0,0,0,0); transition: box-shadow .2s, border-color .2s; }
        .field-input::placeholder { color: #9BA1A6; }
        .field-input:focus { border-color: #E4E6EB; box-shadow: 0 0 0 6px rgba(45,49,57,0.4); }
      `}</style>
    </main>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block mb-3">
      <span className="text-sm font-medium text-[#E4E6EB]">{label}</span>
      {children}
    </label>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="loading">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.15" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function RoleChip({ value, current, onPick }: { value: "TRADER" | "ADMIN"; current: string; onPick: (v: any) => void }) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onPick(value)}
      aria-pressed={active}
      className={`px-3 py-1.5 rounded-xl text-xs border transition ${
        active ? "bg-[#2D3139] text-[#E4E6EB] border-[#2D3139]" : "bg-[#1C1F24] border-[#2D3139] text-[#9BA1A6] hover:border-[#E4E6EB]"
      }`}
    >
      {value}
    </button>
  );
}


