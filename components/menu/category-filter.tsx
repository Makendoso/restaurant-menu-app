"use client"

import { useRestaurantData } from "@/context/restaurant-context"
import { cn } from "@/lib/utils"
import { 
  Salad, 
  Utensils, 
  Sandwich, 
  Pizza, 
  CupSoda, 
  Cake,
  LayoutGrid
} from "lucide-react"

interface CategoryFilterProps {
  selectedCategory: string | null
  onSelectCategory: (categoryId: string | null) => void
}

const iconMap: Record<string, React.ElementType> = {
  salad: Salad,
  utensils: Utensils,
  hamburger: Sandwich,
  pizza: Pizza,
  "cup-soda": CupSoda,
  cake: Cake,
}

export function CategoryFilter({ selectedCategory, onSelectCategory }: CategoryFilterProps) {
  const { categories } = useRestaurantData()

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex gap-2 px-4 md:justify-center md:flex-wrap">
        <button
          onClick={() => onSelectCategory(null)}
          className={cn(
            "flex flex-shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all",
            selectedCategory === null
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          <LayoutGrid className="h-4 w-4" />
          All
        </button>
        {categories.map((category) => {
          const Icon = iconMap[category.icon] || Utensils
          return (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category.id)}
              className={cn(
                "flex flex-shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all",
                selectedCategory === category.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              <Icon className="h-4 w-4" />
              {category.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
