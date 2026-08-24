"use client";

import React from "react";
import SignUp from "./signup";
import Social from "./social";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

export default function Register() {
  const queryString =
    typeof window !== "undefined" ? window?.location.search : "";
  const urlParams = new URLSearchParams(queryString);

  const next = urlParams.get("next");
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "MCPPro";
  const appIcon = process.env.NEXT_PUBLIC_APP_ICON || "/logo.svg";

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
            Join MCPPro and experience frontier multi-agent reasoning, real-time RAG, and MCP tool execution.
          </p>
        </div>
        <div className="relative z-10 hidden lg:block pt-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs font-medium text-blue-100">
            <span className="size-2 rounded-full bg-cyan-400 animate-pulse"></span>
            Multi-Agent AI Platform & Document Intelligence
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 p-6 sm:p-8 lg:p-12 flex items-center">
        <div className="w-full max-w-sm mx-auto space-y-6 lg:space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500">
              Create Account
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Welcome! Please fill in your details to get started.
            </p>
          </div>

          <Social redirectTo={next || "/"} />

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-700 to-transparent"></div>
            <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">or</div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-700 to-transparent"></div>
          </div>

          <SignUp redirectTo={next || "/"} />
        </div>
      </div>
    </div>
  );
}
