// Lucide-style stroke icons, 24x24 viewBox, inherit currentColor.
const S = ({ children, w = 18 }: { children: React.ReactNode; w?: number }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export const Icon = {
  overview: () => <S><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></S>,
  ecs: () => <S><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></S>,
  lambda: () => <S><path d="M7 4h4l5.5 16M7 20c2.5 0 4-1.5 5-4.5" /></S>,
  logs: () => <S><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 8h2l1.5 3L12 8h2" /><path d="M7 14h10" /><path d="M7 17h6" /></S>,
  alarms: () => <S><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /></S>,
  storage: () => <S><path d="M3 6c0-1.66 4-3 9-3s9 1.34 9 3-4 3-9 3-9-1.34-9-3Z" /><path d="M3 6v6c0 1.66 4 3 9 3s9-1.34 9-3V6" /><path d="M3 12v6c0 1.66 4 3 9 3s9-1.34 9-3v-6" /></S>,
  database: () => <S><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" /></S>,
  settings: () => <S><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></S>,
  refresh: ({ w = 15 }: { w?: number } = {}) => <S w={w}><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></S>,
  restart: ({ w = 14 }: { w?: number } = {}) => <S w={w}><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></S>,
  scale: ({ w = 14 }: { w?: number } = {}) => <S w={w}><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></S>,
  play: ({ w = 14 }: { w?: number } = {}) => <S w={w}><polygon points="6 3 20 12 6 21 6 3" /></S>,
  plus: () => <S w={15}><path d="M12 5v14M5 12h14" /></S>,
  close: ({ w = 16 }: { w?: number } = {}) => <S w={w}><path d="M18 6 6 18M6 6l12 12" /></S>,
  chevron: ({ w = 16 }: { w?: number } = {}) => <S w={w}><path d="m9 18 6-6-6-6" /></S>,
  chevronDown: ({ w = 16 }: { w?: number } = {}) => <S w={w}><path d="m6 9 6 6 6-6" /></S>,
  check: ({ w = 14 }: { w?: number } = {}) => <S w={w}><path d="M20 6 9 17l-5-5" /></S>,
  alert: ({ w = 14 }: { w?: number } = {}) => <S w={w}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></S>,
  search: ({ w = 15 }: { w?: number } = {}) => <S w={w}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></S>,
  folder: ({ w = 16 }: { w?: number } = {}) => <S w={w}><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /></S>,
  file: ({ w = 16 }: { w?: number } = {}) => <S w={w}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></S>,
  external: ({ w = 13 }: { w?: number } = {}) => <S w={w}><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></S>,
  copy: ({ w = 13 }: { w?: number } = {}) => <S w={w}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></S>,
  cloud: () => <S><path d="M17.5 19a4.5 4.5 0 1 0 0-9h-1.8A7 7 0 1 0 4 16.3" /></S>,
  back: ({ w = 16 }: { w?: number } = {}) => <S w={w}><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></S>,
};
