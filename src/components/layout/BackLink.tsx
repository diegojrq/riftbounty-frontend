import Link from "next/link";

interface BackLinkProps {
  href: string;
  label: string;
  className?: string;
}

export function BackLink({ href, label, className = "mb-4" }: BackLinkProps) {
  return (
    <div className={className}>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        {label}
      </Link>
    </div>
  );
}
