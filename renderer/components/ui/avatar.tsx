import React from 'react'
import { User } from 'lucide-react'

interface AvatarProps {
  src?: string
  alt?: string
  fallback?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  fallback,
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = React.useState(false)

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  }

  const containerClasses = `relative inline-block overflow-hidden rounded-full ${sizeClasses[size]} ${className}`

  return (
    <div className={containerClasses}>
      {src && !imageError ? (
        <img
          src={src}
          alt={alt || 'Avatar'}
          className="h-full w-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
          {fallback ? (
            <span className="text-sm font-medium">{fallback}</span>
          ) : (
            <User className="h-3/4 w-3/4" />
          )}
        </div>
      )}
    </div>
  )
}