"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart, useApp } from "@/store";
import { ShoppingBag, Search, Menu, X, Headphones, Radio, BookOpen, Palette } from "lucide-react";
import ThemeSelector from "@/components/ThemeSelector";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/series", label: "Series" },
  { href: "/shop", label: "Shop" },
];

export default function Navbar() {
  const pathname = usePathname();
  const cartItems = useCart((s) => s.items);
  const count = cartItems.reduce((a, i) => a + i.quantity, 0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showThemes, setShowThemes] = useState(false);

  return (
    <nav
      className="sticky top-0 z-50 glass"
      style={{ borderBottom: "1px solid var(--color-border)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--color-accent)" }}
          >
            <Radio size={16} style={{ color: "var(--color-bg)" }} />
          </div>
          <span
            className="text-xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}
          >
            Naad
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm transition-colors duration-200"
              style={{
                color: pathname === link.href ? "var(--color-accent)" : "var(--color-text-muted)",
                fontWeight: pathname === link.href ? "500" : "400",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Link
            href="/series"
            className="p-2 rounded-lg hidden md:flex"
            style={{ color: "var(--color-text-muted)" }}
            title="Search"
          >
            <Search size={18} />
          </Link>

          <button
            onClick={() => setShowThemes(!showThemes)}
            className="p-2 rounded-lg hidden md:flex transition-colors"
            style={{ color: showThemes ? "var(--color-accent)" : "var(--color-text-muted)" }}
            title="Change theme"
          >
            <Palette size={18} />
          </button>

          <Link
            href="/cart"
            className="relative p-2 rounded-lg flex items-center"
            style={{ color: "var(--color-text-muted)" }}
          >
            <ShoppingBag size={18} />
            {count > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold"
                style={{ background: "var(--color-accent)", color: "var(--color-bg)", fontSize: "10px" }}
              >
                {count}
              </span>
            )}
          </Link>

          <button
            className="md:hidden p-2"
            style={{ color: "var(--color-text)" }}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Theme selector dropdown */}
      {showThemes && (
        <div className="hidden md:block absolute right-4 top-16 z-50">
          <ThemeSelector onClose={() => setShowThemes(false)} />
        </div>
      )}

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden border-t animate-slide-up"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block px-6 py-3 text-sm"
              style={{ color: pathname === link.href ? "var(--color-accent)" : "var(--color-text-muted)" }}
            >
              {link.label}
            </Link>
          ))}
          <div className="px-6 py-3">
            <ThemeSelector onClose={() => setMenuOpen(false)} />
          </div>
        </div>
      )}
    </nav>
  );
}

