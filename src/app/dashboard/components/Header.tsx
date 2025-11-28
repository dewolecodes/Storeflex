"use client";
import React, { useEffect, useRef, useState, useLayoutEffect } from "react";

type Props = {
    onOpenSidebar?: () => void;
};

const Header: React.FC<Props> = ({ onOpenSidebar }) => {
    const [visible, setVisible] = useState(true);
    const lastScrollY = useRef(0);
    const ticking = useRef(false);
    const headerRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const HIDE_THRESHOLD = 80;

        const handleScroll = () => {
            if (!ticking.current) {
                ticking.current = true;
                requestAnimationFrame(() => {
                    const currentY = window.scrollY;
                    const delta = currentY - lastScrollY.current;

                    // Scrolling up at all -> immediately show
                    if (delta < 0) {
                        setVisible(true);
                    }
                    // Scrolling down -> hide after scrolling down 80px continuously
                    else if (delta > HIDE_THRESHOLD) {
                        setVisible(false);
                    }

                    lastScrollY.current = currentY;
                    ticking.current = false;
                });
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // expose header height as a CSS variable so parent layout can avoid overlap
    useLayoutEffect(() => {
        const measure = () => {
            if (headerRef.current) {
                const h = headerRef.current.offsetHeight;
                document.documentElement.style.setProperty("--dashboard-header-height", `${h}px`);
            }
        };
        measure();
        window.addEventListener("resize", measure, { passive: true });
        return () => window.removeEventListener("resize", measure);
    }, [visible]);

    return (
        <>
            <header
                ref={headerRef}
                aria-hidden={!visible}
                className={`bg-white border-b border-gray-200 shadow-sm fixed top-0 left-0 right-0 z-30 transform transition-transform duration-200 ease-out
          ${visible ? "translate-y-0 pointer-events-auto" : "-translate-y-full pointer-events-none"}`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Mobile: toggle sidebar */}
                        <button
                            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            aria-label="Open menu"
                            onClick={onOpenSidebar}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage your store</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex flex-col items-end">
                            <p className="text-sm font-medium text-gray-900">Welcome back</p>
                            <p className="text-xs text-gray-500">Merchant dashboard</p>
                        </div>
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            M
                        </div>
                    </div>
                </div>
            </header>

            {/* spacer to prevent content jumping / overlapping when header is fixed */}
            <div style={{ height: "var(--dashboard-header-height, 64px)" }} aria-hidden />
        </>
    );
};

export default Header;
