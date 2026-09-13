
import { UiText, UiValue, UiAttributes } from "@/components/ui-language"
import { Loader2Icon } from 'lucide-react'

import { cn } from '@/lib/utils'

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <UiAttributes><Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn('size-4 animate-spin', className)}
      {...props}
    /></UiAttributes>
  )
}

export { Spinner }
