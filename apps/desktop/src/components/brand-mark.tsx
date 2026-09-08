import { useState } from 'react'

import { appBrand } from '@/lib/app-brand'
import { cn } from '@/lib/utils'

const UPSTREAM_MARK_SRC = appBrand({}).markSrc

// Brand badge: upstream keeps the Nous mark on its fixed white tile; the
// internal harness uses the transparent Lemon mark as supplied in public/.
export function BrandMark({ className, ...props }: React.ComponentProps<'span'>) {
  const brand = appBrand()
  const isLemon = brand.mode === 'internal-harness'
  const [lemonFailed, setLemonFailed] = useState(false)
  const showUpstreamMark = !isLemon || lemonFailed

  return (
    <span
      className={cn(
        'inline-flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md',
        showUpstreamMark ? 'bg-white' : 'bg-transparent',
        className
      )}
      data-brand={brand.mode}
      {...props}
    >
      <img
        alt=""
        className="size-full object-contain"
        onError={() => {
          if (isLemon) {
            setLemonFailed(true)
          }
        }}
        src={showUpstreamMark ? UPSTREAM_MARK_SRC : brand.markSrc}
      />
    </span>
  )
}
