"use client";

import React, { useState, useTransition } from "react";
import Social from "./social";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa6";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import Link from "next/link";

const FormSchema = z.object({
  email: z.string().email({
    message: "Invalid Email Address",
  }),
  password: z.string().min(6, {
    message: "Password is too short",
  }),
});

export default function SignIn() {
  const queryString =
    typeof window !== "undefined" ? window?.location.search : "";
  const urlParams = new URLSearchParams(queryString);
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "MCPPro";
  const appIcon = process.env.NEXT_PUBLIC_APP_ICON || "/logo.svg";

  const next = urlParams.get("next");
  
  return (
    <div className="flex min-h-[550px] w-[min(100%,24rem)] sm:w-full max-w-6xl mx-auto rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-zinc-900 flex-col lg:flex-row border border-blue-100/60 dark:border-blue-900/30">
      {/* Left Panel - Decorative with MCPPro Brand Colors */}
      <div className="lg:w-1/2 bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 p-6 sm:p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-15"></div>
        <div className="relative z-10 space-y-4 lg:space-y-6 text-center lg:text-left">
          <div className="size-16 sm:size-20 rounded-2xl bg-white/10 backdrop-blur-md p-2 ring-2 ring-white/30 shadow-xl mx-auto lg:mx-0 flex items-center justify-center">
            <Image
              src={appIcon}
              alt={appName}
              width={64}
              height={64}
              className="rounded-xl object-contain drop-shadow-md transition-transform hover:scale-105"
            />
          </div>
          <h2 className="text-2xl lg:text-4xl font-extrabold text-white tracking-tight">{appName}</h2>
          <p className="text-blue-100 max-w-sm mx-auto lg:mx-0 text-sm lg:text-base leading-relaxed">
            Welcome back! Sign in to access your multi-agent AI studio and document intelligence.
          </p>
        </div>
        <div className="relative z-10 hidden lg:block pt-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs font-medium text-blue-100">
            <span className="size-2 rounded-full bg-cyan-400 animate-pulse"></span>
            Model Context Protocol & Frontier Agents
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 p-6 sm:p-8 lg:p-12 flex items-center">
        <div className="w-full max-w-sm mx-auto space-y-6 lg:space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500">
              Welcome Back
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Sign in to continue to {appName}
            </p>
          </div>

          <Social redirectTo={next || "/"} />

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-700 to-transparent"></div>
            <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">or</div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-700 to-transparent"></div>
          </div>

          <SignInForm redirectTo={next || "/"} />
        </div>
      </div>
    </div>
  );
}

export function SignInForm({ redirectTo }: { redirectTo: string }) {
  const [passwordReveal, setPasswordReveal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    const supabase = createSupabaseBrowser();
    if (!isPending) {
      startTransition(async () => {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (error) {
          toast.error(error.message);
        } else {
          const user = authData?.user;
          const email = (user?.email || data.email || '').toLowerCase().trim();
          const isAdmin =
            email === 'chiranth@gmail.com' ||
            user?.app_metadata?.role === 'admin' ||
            user?.user_metadata?.role === 'admin' ||
            user?.user_metadata?.is_admin === true;

          toast.success(isAdmin ? 'Welcome, Administrator!' : 'Signed in successfully!');
          if (isAdmin) {
            router.push('/admin');
          } else {
            router.push(redirectTo && redirectTo !== '/' ? redirectTo : '/chat');
          }
          router.refresh();
        }
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium text-sm text-zinc-700 dark:text-zinc-300">
                Email Address
              </FormLabel>
              <FormControl>
                <Input
                  className="h-10 sm:h-11 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300"
                  placeholder="example@gmail.com"
                  type="email"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-red-500 text-xs sm:text-sm" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium text-sm text-zinc-700 dark:text-zinc-300">
                Password
              </FormLabel>
              <FormControl>
                <div className="relative group">
                  <Input
                    className="h-10 sm:h-11 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 pr-10"
                    type={passwordReveal ? "text" : "password"}
                    {...field}
                  />
                  <div
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    onClick={() => setPasswordReveal(!passwordReveal)}
                  >
                    {passwordReveal ? (
                      <FaRegEye className="w-4 h-4" />
                    ) : (
                      <FaRegEyeSlash className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </FormControl>
              <FormMessage className="text-red-500 text-xs sm:text-sm" />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full h-10 sm:h-11 bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 hover:from-blue-700 hover:via-sky-600 hover:to-cyan-600 text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 cursor-pointer"
        >
          <AiOutlineLoading3Quarters
            className={cn("w-4 h-4", !isPending ? "hidden" : "animate-spin")}
          />
          Sign In
        </Button>
        <div className="text-center text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
          <h1>
            Don&apos;t have an account yet?{" "}
            <Link
              href={redirectTo ? `/register?next=${redirectTo}` : "/register"}
              className="text-blue-600 hover:text-blue-700 dark:text-sky-400 dark:hover:text-sky-300 font-medium transition-colors"
            >
              Register
            </Link>
          </h1>
        </div>
      </form>
    </Form>
  );
}
