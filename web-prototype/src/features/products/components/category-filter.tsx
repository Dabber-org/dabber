import Link from 'next/link'
import { cn } from '@/core/utils/cn'
import type { Category } from '@/core/types/common'

interface CategoryFilterProps {
  currentCategory?: Category
}

const categories = [
  { value: undefined, label: 'All Products', href: '/' },
  { value: 'mobile', label: 'Mobile Phones', href: '/?category=mobile' },
  { value: 'laptop', label: 'Laptops', href: '/?category=laptop' },
  { value: 'pc', label: 'Desktop PCs', href: '/?category=pc' },
] as const

export function CategoryFilter({ currentCategory }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => {
        const isActive = currentCategory === category.value

        return (
          <Link
            key={category.label}
            href={category.href}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors',
              isActive
                ? 'bg-black text-white'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
            )}
          >
            {category.label}
          </Link>
        )
      })}
    </div>
  )
}
