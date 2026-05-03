export function Spinner() {
    return (
      <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="loading">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.15" />
        <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }