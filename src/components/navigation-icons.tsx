export function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 10.5L12 3.5L21 10.5V20C21 20.6 20.6 21 20 21H15V14.5C15 14.2 14.8 14 14.5 14H9.5C9.2 14 9 14.2 9 14.5V21H4C3.4 21 3 20.6 3 20V10.5Z" />
    </svg>
  );
}

export function AssetsIcon({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Isometric 3D asset cube */}
      <path d="M12 2.5L20 7.2V16.8L12 21.5L4 16.8V7.2L12 2.5Z" />
      <path d="M12 12V21.5" />
      <path d="M12 12L20 7.2" />
      <path d="M12 12L4 7.2" />
    </svg>
  );
}

export function DevicesIcon({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Hardware edge microchip / controller */}
      <rect x="5.5" y="5.5" width="13" height="13" rx="2.5" />
      <line x1="9" y1="2" x2="9" y2="5.5" />
      <line x1="15" y1="2" x2="15" y2="5.5" />
      <line x1="9" y1="18.5" x2="9" y2="22" />
      <line x1="15" y1="18.5" x2="15" y2="22" />
      <line x1="2" y1="9" x2="5.5" y2="9" />
      <line x1="2" y1="15" x2="5.5" y2="15" />
      <line x1="18.5" y1="9" x2="22" y2="9" />
      <line x1="18.5" y1="15" x2="22" y2="15" />
      <circle cx="12" cy="12" r="1.75" />
    </svg>
  );
}

export function AssetIQIcon({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Predictive analytics / Intelligence spark */}
      <path d="M12 3C12 7.5 8.5 11 4 11C8.5 11 12 14.5 12 19C12 14.5 15.5 11 20 11C15.5 11 12 7.5 12 3Z" />
      <path d="M19 3C19 4.8 17.8 6 16 6C17.8 6 19 7.2 19 9C19 7.2 20.2 6 22 6C20.2 6 19 4.8 19 3Z" />
    </svg>
  );
}

export function ConfigureIcon({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* System configuration / gear */}
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/** SAP: two systems linked (ERP exchange). */
export function SapIcon({ className }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="8" height="7" rx="1.5" />
      <rect x="13" y="13" width="8" height="7" rx="1.5" />
      <path d="M11 7.5h3.5a2 2 0 0 1 2 2V13M13 16.5H9.5a2 2 0 0 1-2-2V11" />
    </svg>
  );
}

export function MaintenanceIcon({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Planned maintenance / wrench over a calendar tick */}
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3.6 17.4a1.8 1.8 0 0 0 2.6 2.6l5.7-5.7a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.3-.5-.5-2.3z" />
      <path d="M16 18h5M18.5 15.5V21" />
    </svg>
  );
}

export function SimulationIcon({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Simulation controls / sliders */}
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="9" cy="6" r="2" fill="currentColor" />
      <circle cx="15" cy="12" r="2" fill="currentColor" />
      <circle cx="7" cy="18" r="2" fill="currentColor" />
    </svg>
  );
}

export function ProblemsIcon({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Problem cases / clipboard with a check */}
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1" />
      <path d="M9 12l2 2 4-4" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </svg>
  );
}
