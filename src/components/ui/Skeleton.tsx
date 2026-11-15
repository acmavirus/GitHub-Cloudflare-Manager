import React from 'react'
import { cn } from '../../lib/utils'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)]',
        className
      )}
      {...props}
    />
  )
}
