import type { HTMLAttributes, ReactNode } from 'react';

// Local SVGs keep administrative actions readable when external font servers are unavailable.
const refresh = <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M19.2 11a7.5 7.5 0 0 0-12.4-5.1L4 8M4.8 13a7.5 7.5 0 0 0 12.4 5.1L20 16" /></>;
const calendar = <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>;
const person = <><circle cx="12" cy="7" r="3" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>;
const store = <><path d="M3 10l2-7h14l2 7M3 10c0 2 3 3 4 0 1 3 4 2 5 0 1 2 4 3 5 0 1 3 4 2 4 0M4 13v8h16v-8M9 21v-7h6v7" /></>;
const eye = <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>;
const article = <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h8M8 18h5" /></>;
const icons: Record<string, ReactNode> = {
  add: <path d="M12 5v14M5 12h14" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  refresh,
  autorenew: refresh,
  logout: <><path d="M10 4H4v16h6M8 12h13m-5-5 5 5-5 5" /></>,
  file_download: <path d="M12 3v12m-5-5 5 5 5-5M3 17v4h18v-4" />,
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  inventory_2: <><path d="M3 7h18M5 3h14l2 4v14H3V7l2-4ZM9 12h6" /></>,
  local_shipping: <><path d="M2 5h12v13H2V5ZM14 9h4l4 5v4h-8M14 14h8" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
  store,
  add_business: <><path d="M3 10l2-7h14l2 7M3 10c0 2 3 3 4 0 1 3 4 2 5 0 1 2 4 3 5 0 1 3 4 2 4 0M4 13v8h9M8 21v-6h4M18 15v8M14 19h8" /></>,
  business: <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M8 7h1M15 7h1M8 11h1M15 11h1M8 15h1M15 15h1M10 21v-3h4v3" /></>,
  badge: <><rect x="3" y="6" width="18" height="15" rx="2" /><path d="M9 6V3h6v3M15 11h3M15 15h3M6 18a3 3 0 0 1 6 0" /><circle cx="9" cy="12" r="2" /></>,
  admin_panel_settings: <><path d="m12 2 9 4v6c0 5-6 9-9 10-3-1-9-5-9-10V6l9-4Z" /><circle cx="12" cy="9" r="2.5" /><path d="M7.5 17a4.5 4.5 0 0 1 9 0" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  article,
  newspaper: <><path d="M5 3h16v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8h2M5 3v16a2 2 0 0 0 2 2M15 7h3M15 11h3M8 15h10M8 18h10" /><rect x="8" y="7" width="4" height="4" /></>,
  analytics: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 17v-5M12 17V7M17 17v-8" /></>,
  assessment: <><path d="M8 4H5v17h14V4h-3M8 3h8v4H8V3ZM8 17v-5M12 17V9M16 17v-3" /></>,
  settings: <><path d="m10 2-.7 3-2 .8-2.7-1.4-2 3.4L5 10v3l-2.4 2.1 2 3.5 2.7-1.4 2 .8.7 3h4l.7-3 2-.8 2.7 1.4 2-3.5L19 13v-3l2.4-2.2-2-3.4-2.7 1.4-2-.8L14 2h-4Z" /><circle cx="12" cy="11.5" r="3" /></>,
  diamond: <><path d="m3 8 4-5h10l4 5-9 13L3 8ZM3 8h18M7 3l5 18L17 3M8.4 8l3.6-5 3.6 5" /></>,
  outbox: <><path d="M7 13H4l-2 8h20l-2-8h-3M12 15V3m-4 4 4-4 4 4M3 17h5l2 2h4l2-2h5" /></>,
  move_to_inbox: <><path d="M7 13H4l-2 8h20l-2-8h-3M12 3v12m-4-4 4 4 4-4M3 17h5l2 2h4l2-2h5" /></>,
  edit: <><path d="m3 21 1-6L16 3a2 2 0 0 1 3 0l2 2a2 2 0 0 1 0 3L9 20l-6 1ZM14 5l5 5M4 15l5 5" /></>,
  edit_square: <><path d="M12 4H4v16h16v-8M10 14l1-4L18 3l3 3-7 7-4 1ZM16 5l3 3" /></>,
  delete: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></>,
  visibility: eye,
  visibility_off: <><path d="m3 3 18 18M7 6a10 10 0 0 1 5-1c6.5 0 10 7 10 7a17 17 0 0 1-4 5M3.5 8.5 2 12s3.5 7 10 7a12 12 0 0 0 3-.4M10 10a3 3 0 0 0 4 4" /></>,
  person,
  person_add: <><circle cx="8" cy="7" r="3" /><path d="M2 21v-2a6 6 0 0 1 12 0v2M18 7v8M14 11h8" /></>,
  group: <><circle cx="9" cy="7" r="3" /><path d="M2 21v-2a7 7 0 0 1 14 0v2M17 4a3 3 0 0 1 0 6M22 21v-2a7 7 0 0 0-4-6" /></>,
  call: <path d="M5 3H3v4c0 8 6 14 14 14h4v-4l-5-2-2 3c-4-1-7-4-8-8l3-2-2-5H5Z" />,
  location_on: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
  monetization_on: <><circle cx="12" cy="12" r="10" /><path d="M12 5v14M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8" /></>,
  workspace_premium: <><circle cx="12" cy="9" r="6" /><path d="m9 15-1 7 4-2 4 2-1-7M12 5l1.2 2.5L16 8l-2 2 .5 3-2.5-1.5L9.5 13l.5-3-2-2 2.8-.5L12 5Z" /></>,
  category: <><path d="m12 2 5 8H7l5-8Z" /><circle cx="6" cy="17" r="4" /><rect x="14" y="13" width="8" height="8" /></>,
  local_offer: <><path d="M2 3h9l11 11-8 8L2 10V3Z" /><circle cx="7" cy="7" r="1" /></>,
  calendar_month: <>{calendar}<path d="M7 14h1M12 14h1M17 14h1M7 18h1M12 18h1M17 18h1" /></>,
  event: <>{calendar}<path d="m8 15 3 3 5-5" /></>,
  today: <>{calendar}<rect x="7" y="13" width="5" height="5" /></>,
  pending: <><circle cx="12" cy="12" r="9" /><path d="M7 12h.1M12 12h.1M17 12h.1" strokeWidth="3" /></>,
  trending_up: <path d="m3 17 6-6 4 4 8-10M15 5h6v6" />,
  check_circle: <><circle cx="12" cy="12" r="9" /><path d="m7 12 3 3 7-7" /></>,
};

type IconProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & { name: string; label?: string };

export default function Icon({ name, label, className = '', ...props }: IconProps) {
  return <span {...props} data-icon={name} className={`app-icon ${className}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {Object.hasOwn(icons, name) ? icons[name] : <><circle cx="12" cy="12" r="9" /><path d="M9 8a3 3 0 0 1 6 1c0 2-3 2-3 5M12 17h.1" /></>}
    </svg>
  </span>;
}
