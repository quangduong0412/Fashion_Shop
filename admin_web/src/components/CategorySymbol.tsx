import type { ReactNode } from 'react';

const shirt = <path d="m8 3-5 3-2 5 5 2v8h12v-8l5-2-2-5-5-3a4 4 0 0 1-8 0Z" />;
const symbols: Record<string, ReactNode> = {
  all: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  shirt,
  dress: <path d="M8 3h8l-1 7 6 11H3l6-11-1-7ZM9 10h6M8 3a4 4 0 0 0 8 0" />,
  skirt: <path d="M8 3h8l5 18H3L8 3ZM7 7h10M10 7l-2 14M14 7l2 14" />,
  pants: <path d="M5 3h14l1 18h-7l-1-10-1 10H4L5 3ZM5 7h14M12 3v8" />,
  jacket: <path d="m8 3-5 3-2 15h5l1-11v11h10V10l1 11h5L21 6l-5-3-4 5-4-5ZM12 8v13M8 3l1 7 3-2 3 2 1-7" />,
  traditional: <path d="M9 2h6l4 4 3 8h-4l-2-6 4 14h-7l-1-8-1 8H4L8 8l-2 6H2l3-8 4-4ZM9 2l3 4 3-4M12 6v8" />,
  shoes: <path d="M4 5h5l1 7 10 4 2 2v3H2V9l2-4ZM2 18h20M10 12l-2 3M13 13l-2 3" />,
  bag: <><rect x="4" y="8" width="16" height="13" rx="2" /><path d="M8 10V6a4 4 0 0 1 8 0v4" /></>,
  backpack: <><rect x="5" y="5" width="14" height="17" rx="4" /><path d="M9 5V2h6v3M5 11h14" /><rect x="8" y="14" width="8" height="5" rx="1" /></>,
  accessories: <><path d="m12 3 9 9-9 9-9-9 9-9ZM3 12h18M12 3l-4 9 4 9 4-9-4-9Z" /></>,
  jewelry: <><circle cx="12" cy="14" r="7" /><path d="m9 7-2-4h10l-2 4M7 3h10" /></>,
  watch: <><rect x="6" y="6" width="12" height="12" rx="3" /><path d="M8 6V2h8v4M8 18v4h8v-4M12 9v4l3 2" /></>,
  glasses: <><circle cx="6" cy="14" r="4" /><circle cx="18" cy="14" r="4" /><path d="M10 14h4M2 14l2-9h2M22 14l-2-9h-2" /></>,
  hat: <path d="M3 16h18l2 3H1l2-3ZM5 16 7 5h4l2 3 4-3 2 11M6 12h12" />,
  belt: <><rect x="2" y="8" width="20" height="8" rx="1" /><rect x="7" y="6" width="7" height="12" rx="1" /><path d="M10 12h8" /></>,
  kids: <><circle cx="12" cy="5" r="3" /><path d="M5 10h14M12 8v8m-5 5 5-5 5 5M12 10l-5 4M12 10l5 4" /></>,
  swimwear: <path d="M7 2h3v4h4V2h3l2 8-3 12H8L5 10l2-8ZM8 6l-3 4h14l-3-4" />,
  lingerie: <path d="M5 3v5h5l2 4 2-4h5V3M3 8l2 8h5l2-4 2 4h5l2-8M5 16h14" />,
  sport: <><circle cx="15" cy="4" r="2" /><path d="m10 8 5-1 3 5h4M11 8l-4 5H2M14 7l-3 9 5 6M11 16l-5 6" /></>,
};

export default function CategorySymbol({ name, className = 'h-8 w-8' }: { name?: string | null; className?: string }) {
  return <svg data-category-icon={name || 'all'} aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>{symbols[name || 'all'] || symbols.all}</svg>;
}
