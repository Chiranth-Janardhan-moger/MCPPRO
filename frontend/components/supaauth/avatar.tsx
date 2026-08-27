"use client";

import useUser from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import React from "react";
import Image from "next/image";

interface AvatarProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const Avatar = ({ className, size = "md" }: AvatarProps) => {
  const { data, isFetching } = useUser();
  const imageUrl = data?.user_metadata?.avatar_url;
  const firstLetter = (data?.email?.[0] || data?.user_metadata?.display_name?.[0] || "U").toUpperCase();

  const sizeClasses = {
    sm: "w-7 h-7 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base",
  };

  return (
    <div
      className={cn(
        "transition-all shrink-0 rounded-full select-none cursor-pointer flex items-center justify-center font-bold tracking-wider shadow-sm",
        sizeClasses[size],
        isFetching ? "opacity-60" : "opacity-100",
        className
      )}
    >
      {!imageUrl ? (
        <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-600 via-sky-500 to-indigo-600 text-white flex items-center justify-center ring-2 ring-background border border-white/20 hover:scale-105 transition-transform">
          <span className="leading-none select-none flex items-center justify-center">{firstLetter}</span>
        </div>
      ) : (
        <Image
          src={imageUrl}
          alt={data?.email || "Avatar"}
          width={40}
          height={40}
          className="rounded-full object-cover w-full h-full ring-2 ring-background hover:scale-105 transition-transform"
        />
      )}
    </div>
  );
};

export default Avatar;
