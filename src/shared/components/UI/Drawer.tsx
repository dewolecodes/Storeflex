"use client";
import React, { useEffect, useRef } from "react";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    ariaLabel?: string;
    children: React.ReactNode;
};

// Small, dependency-free Drawer with slide animation and basic focus-trap
export default function Drawer({ isOpen, onClose, ariaLabel = "Drawer", children }: Props) {
    const panelRef = useRef<HTMLDivElement | null>(null);
    const previouslyFocused = useRef<HTMLElement | null>(null);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            }
            if (e.key === "Tab") {
                // Basic focus trap
                const panel = panelRef.current;
                if (!panel) return;
                const focusable = panel.querySelectorAll<HTMLElement>(
                    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
                );
                if (focusable.length === 0) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            }
        }

        if (isOpen) {
            previouslyFocused.current = document.activeElement as HTMLElement | null;
            document.addEventListener("keydown", onKey);
            // set focus to first focusable element inside panel after open
            requestAnimationFrame(() => {
                const panel = panelRef.current;
                if (!panel) return;
                const focusable = panel.querySelectorAll<HTMLElement>(
                    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
                );
                if (focusable.length) focusable[0].focus();
            });
            // prevent body scroll while open
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
            if (previouslyFocused.current) previouslyFocused.current.focus();
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />

            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={ariaLabel}
                className={
                    "absolute inset-y-0 left-0 w-64 bg-white border-r p-4 overflow-auto transform transition-transform duration-300 ease-out " +
                    // animate from -translate-x-full to 0
                    "translate-x-0"
                }
            >
                {children}
            </div>
        </div>
    );
}
