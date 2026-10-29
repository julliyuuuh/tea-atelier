"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// First tab stop on every page: jumps keyboard users past the navigation to
// the page's <main>, which is given the target id here so pages don't have to.
export default function SkipLink() {
  const pathname = usePathname();

  useEffect(() => {
    // Pages may swap their <main> (e.g. a loading view, then the real page),
    // so keep re-applying the target whenever the current one disappears.
    const mark = () => {
      if (document.getElementById("main")) return;
      const main = document.querySelector("main");
      if (!main) return;
      main.id = "main";
      if (!main.hasAttribute("tabindex")) main.tabIndex = -1;
    };
    mark();
    const observer = new MutationObserver(mark);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-charcoal focus:px-5 focus:py-3 focus:font-body focus:text-sm focus:text-cream"
    >
      Skip to content
    </a>
  );
}
