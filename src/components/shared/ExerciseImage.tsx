interface ExerciseImageProps {
  imageUrls: string[]
  imageIndex: number
  name: string
  size?: 'sm' | 'md' | 'lg'
  onImageClick?: () => void
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-28 h-28',
  lg: 'w-32 h-32',
}

export function ExerciseImage({
  imageUrls,
  imageIndex,
  name,
  size = 'md',
  onImageClick,
}: ExerciseImageProps) {
  const sizeClass = sizeClasses[size]

  const handleClick = (e: React.MouseEvent) => {
    if (onImageClick) {
      e.stopPropagation()
      onImageClick()
    }
  }

  if (imageUrls.length > 0) {
    return (
      <img
        src={imageUrls[imageIndex]}
        alt={name}
        className={`${sizeClass} rounded-lg object-cover bg-[var(--bg)] ${onImageClick ? 'cursor-zoom-in' : ''}`}
        onClick={handleClick}
      />
    )
  }

  return (
    <div className={`${sizeClass} rounded-lg bg-[var(--bg)] flex items-center justify-center text-[var(--text-muted)] text-xl`}>
      ?
    </div>
  )
}
