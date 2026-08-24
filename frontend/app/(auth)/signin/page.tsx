import React from "react";
import Signin from "@/components/supaauth/signin";

const page = () => {
  return (
    <main className="min-h-screen w-full grid place-items-center p-4 sm:p-8 bg-gradient-to-br from-blue-50/70 via-white to-sky-50/60 dark:from-zinc-950 dark:via-zinc-900 dark:to-blue-950/30">
      <div className="w-full max-w-6xl mx-auto">
        <Signin />
      </div>
    </main>
  );
};

export default page;
