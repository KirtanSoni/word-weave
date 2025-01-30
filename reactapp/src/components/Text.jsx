export const Text = ({ variant = 'p', children, className = '', ...props }) => {
    const variants = {
      h1: 'scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl',
      h2: 'scroll-m-20 text-3xl font-semibold tracking-tight',
      h3: 'scroll-m-20 text-2xl font-semibold tracking-tight',
      p: 'leading-7 [&:not(:first-child)]:mt-6',
      large: 'text-lg font-semibold',
      small: 'text-sm font-medium leading-none'
    }
  
    const Component = variant
    return (
      <Component
        className={`${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </Component>
    )
  }