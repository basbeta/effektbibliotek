"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/bibliotek", label: "Bibliotek" },
  { href: "/mine-caser", label: "Mine caser" },
  { href: "/oppfolging", label: "Oppfølging" },
];

export default function SideNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...navItems, { href: "/admin", label: "Admin" }] : navItems;

  return (
    <nav
      className="fixed top-14 left-0 w-56 h-[calc(100vh-56px)] overflow-y-auto py-6 px-4"
      style={{
        backgroundColor: "var(--color-surface)",
        borderRight: "1px solid var(--color-border-subtle)",
      }}
    >
      <Link
        href="/case/ny"
        className="block mb-4 px-3 py-2.5 text-sm font-medium text-white text-center rounded-lg"
        style={{ backgroundColor: "var(--color-accent)" }}
      >
        + Ny Case
      </Link>
      <ul className="space-y-1">
        {items.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                className="block px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: active ? "var(--color-accent-soft)" : "transparent",
                  color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
                }}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
