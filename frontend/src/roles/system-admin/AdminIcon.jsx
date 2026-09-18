export default function AdminIcon({ name, size = 17, className = "" }) {
  const paths = {
    users: <><path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" /><circle cx="10" cy="7" r="3" /><path d="M16 8a3 3 0 0 1 0 5.8M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35" /></>,
    activity: <><path d="M3 12h4l2-7 4 14 2-7h6" /></>,
    brain: <><path d="M9 4.5a3 3 0 0 0-5 2.2A3.5 3.5 0 0 0 5 13a3.5 3.5 0 0 0 4 5.5V4.5ZM15 4.5a3 3 0 0 1 5 2.2A3.5 3.5 0 0 1 19 13a3.5 3.5 0 0 1-4 5.5V4.5ZM9 9h6M9 14h6" /></>,
    storage: <><ellipse cx="12" cy="5" rx="7" ry="3" /><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 1.7-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.1h-2.4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L8 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H6v-2.4h.8a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L8 8.6l1.7-1.7.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.1h2.4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.7 1.7-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1V14h-.1a1.7 1.7 0 0 0-1.6 1Z" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.7-4L3 10" /><path d="M3 4v6h6M4 13a8 8 0 0 0 14.7 4L21 14" /><path d="M21 20v-6h-6" /></>,
    sliders: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="11" cy="18" r="2" /></>,
    heart: <><path d="M20.8 8.8c0 5.4-8.8 10.2-8.8 10.2S3.2 14.2 3.2 8.8A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z" /><path d="M7 10h2l1-2 2 5 1-3h2" /></>,
    shield: <><path d="M12 21s8-3.8 8-10V5l-8-3-8 3v6c0 6.2 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    plus: <><path d="M12 5v14M5 12h14" /></>,
  };

  return (
    <svg className={`admin-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {paths[name] || paths.activity}
    </svg>
  );
}