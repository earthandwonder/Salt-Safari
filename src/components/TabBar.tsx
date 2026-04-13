"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface Tab {
  id: string;
  label: string;
}

interface TabBarProps {
  tabs: Tab[];
  /** Controlled active tab. If omitted, uses URL hash or first tab. */
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

export function TabBar({ tabs, activeTab, onTabChange, className = "" }: TabBarProps) {
  const [internalActive, setInternalActive] = useState(() => {
    if (activeTab) return activeTab;
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash.slice(1);
      if (tabs.some((t) => t.id === hash)) return hash;
    }
    return tabs[0]?.id ?? "";
  });

  const current = activeTab ?? internalActive;
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const indicatorRef = useRef<HTMLDivElement>(null);

  // Sync hash → active tab on mount and popstate
  useEffect(() => {
    function onHashChange() {
      const hash = window.location.hash.slice(1);
      if (hash && tabs.some((t) => t.id === hash)) {
        setInternalActive(hash);
        onTabChange?.(hash);
      }
    }
    window.addEventListener("hashchange", onHashChange);
    // Set initial hash if none
    if (!window.location.hash && tabs[0]) {
      window.history.replaceState(null, "", `#${tabs[0].id}`);
    }
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [tabs, onTabChange]);

  // Slide the underline indicator to the active tab
  useEffect(() => {
    const el = tabRefs.current.get(current);
    const indicator = indicatorRef.current;
    if (el && indicator) {
      const parent = el.parentElement;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        indicator.style.left = `${elRect.left - parentRect.left}px`;
        indicator.style.width = `${elRect.width}px`;
      }
    }
  }, [current]);

  const selectTab = useCallback(
    (tabId: string) => {
      setInternalActive(tabId);
      onTabChange?.(tabId);
      window.history.replaceState(null, "", `#${tabId}`);
    },
    [onTabChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const idx = tabs.findIndex((t) => t.id === current);
      let next = idx;

      if (e.key === "ArrowRight") {
        next = (idx + 1) % tabs.length;
      } else if (e.key === "ArrowLeft") {
        next = (idx - 1 + tabs.length) % tabs.length;
      } else if (e.key === "Home") {
        next = 0;
      } else if (e.key === "End") {
        next = tabs.length - 1;
      } else {
        return;
      }

      e.preventDefault();
      selectTab(tabs[next].id);
      tabRefs.current.get(tabs[next].id)?.focus();
    },
    [current, tabs, selectTab],
  );

  return (
    <div className={`relative ${className}`}>
      <div
        role="tablist"
        className="flex border-b border-slate-200"
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === current;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) tabRefs.current.set(tab.id, el);
              }}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => selectTab(tab.id)}
              className={`relative px-5 py-3 text-sm font-medium transition-colors duration-200 ${
                isActive
                  ? "text-deep"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
        {/* Sliding underline indicator */}
        <div
          ref={indicatorRef}
          className="absolute bottom-0 h-0.5 bg-coral transition-all duration-300 ease-out"
          style={{ left: 0, width: 0 }}
        />
      </div>
    </div>
  );
}

/** Wrapper for tab panel content. Only renders children when active. */
export function TabPanel({
  tabId,
  activeTab,
  children,
}: {
  tabId: string;
  activeTab: string;
  children: React.ReactNode;
}) {
  if (tabId !== activeTab) return null;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${tabId}`}
      aria-labelledby={`tab-${tabId}`}
    >
      {children}
    </div>
  );
}
