import * as React from "react"
import { Skeleton as AstryxSkeleton } from "@astryxdesign/core"
import { cn } from "@/lib/utils"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: number | string
  height?: number | string
}

function Skeleton({
  className,
  width,
  height,
  ...props
}: SkeletonProps) {
  return (
    <AstryxSkeleton
      width={width}
      height={height}
      className={cn("rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
