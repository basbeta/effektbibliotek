import Link from "next/link";
import LogoutButton from "./LogoutButton";

interface TopbarProps {
  userName: string;
}

export default function Topbar({ userName }: TopbarProps) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-6"
      style={{
        backgroundColor: "var(--color-accent)",
        borderBottom: "1px solid var(--color-accent-hover)",
      }}
    >
      <Link
        href="/bibliotek"
        className="text-white font-semibold text-base tracking-tight"
      >
        Effektbibliotek
      </Link>
      <div className="flex items-center gap-5">
        <span className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
          {userName}
        </span>
        <LogoutButton />
      </div>
    </header>
  );
}
