// Input component
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`
          w-full px-3 py-2 border border-gray-300 rounded-lg
          text-gray-900 placeholder-gray-400 bg-white
          focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
          disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-500
          ${className}
        `}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
