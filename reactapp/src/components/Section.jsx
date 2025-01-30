export const Section = ({ children, className = '', ...props }) => {
    return (
      <section
        className={`py-12 px-4 md:px-6 ${className}`}
        {...props}
      >
        <div className="container mx-auto">
          {children}
        </div>
      </section>
    )
  }
  