export const Card = ({ children, className = '', ...props }) => {
    return (
      <div
        className={`rounded-lg border border-slate-200 bg-white text-slate-950 shadow dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
  
  export const CardHeader = ({ children, className = '', ...props }) => {
    return (
      <div
        className={`flex flex-col space-y-1.5 p-6 ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
  
  export const CardContent = ({ children, className = '', ...props }) => {
    return (
      <div
        className={`p-6 pt-0 ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
  