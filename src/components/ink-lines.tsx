export function InkLines({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`ink-lines ${className}`}
      viewBox="0 0 600 220"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="ink-line"
        pathLength="1"
        d="M-40 167C88 196 189 27 317 53S423 220 530 156S583 52 653 45"
      />
      <path
        className="ink-line"
        pathLength="1"
        d="M-33 181C101 201 191 40 320 65S420 228 536 171S590 63 662 62"
      />
      <path
        className="ink-line ink-line-accent"
        pathLength="1"
        d="M-25 153C70 189 142 137 232 99S324 16 356 52S347 159 311 139S333 87 392 103S488 176 625 120"
      />
      <circle cx="358" cy="58" r="7" className="ink-dot" />
    </svg>
  );
}
