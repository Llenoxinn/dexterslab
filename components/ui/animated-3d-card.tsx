"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type MousePos = { x: number; y: number };

export interface Card3DProps {
  children: React.ReactNode;
  href?: string;
  target?: string;
  rel?: string;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  index?: number;
  inView?: boolean;
}

/**
 * 3D perspective card with spring-damped pointer tilt, Z-depth content elevation,
 * and a cursor-tracked diagonal sheen — preserving the host card's own colors.
 */
export const Card3D = React.forwardRef<HTMLAnchorElement | HTMLDivElement, Card3DProps>(
  (
    {
      children,
      href,
      target,
      rel,
      onClick,
      className,
      style,
      disabled = false,
      index = 0,
      inView = true,
    },
    forwardedRef
  ) => {
    const innerRef = useRef<HTMLElement | null>(null);
    const [hovered, setHovered] = useState(false);
    const [pressed, setPressed] = useState(false);
    const [tilt, setTilt] = useState<MousePos>({ x: 0, y: 0 });
    const targetTilt = useRef<MousePos>({ x: 0, y: 0 });
    const currentTilt = useRef<MousePos>({ x: 0, y: 0 });
    const rafRef = useRef<number>(0);

    const setRef = useCallback(
      (node: HTMLElement | null) => {
        innerRef.current = node;
        if (typeof forwardedRef === "function") {
          forwardedRef(node as HTMLAnchorElement & HTMLDivElement);
        } else if (forwardedRef) {
          (forwardedRef as React.MutableRefObject<HTMLElement | null>).current = node;
        }
      },
      [forwardedRef]
    );

    const isCalm = () =>
      typeof window !== "undefined" &&
      (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        document.documentElement.dataset.labFx === "calm");

    const stepSpring = useCallback(() => {
      rafRef.current = 0;
      const dx = targetTilt.current.x - currentTilt.current.x;
      const dy = targetTilt.current.y - currentTilt.current.y;
      currentTilt.current.x += dx * 0.22;
      currentTilt.current.y += dy * 0.22;

      if (Math.abs(dx) < 0.03 && Math.abs(dy) < 0.03) {
        currentTilt.current = { ...targetTilt.current };
        setTilt(currentTilt.current);
        return;
      }

      setTilt({ x: currentTilt.current.x, y: currentTilt.current.y });
      rafRef.current = requestAnimationFrame(stepSpring);
    }, []);

    const scheduleSpring = useCallback(() => {
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(stepSpring);
      }
    }, [stepSpring]);

    useEffect(() => {
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }, []);

    const handleMove = useCallback(
      (e: React.MouseEvent<HTMLElement>) => {
        if (disabled || isCalm()) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        targetTilt.current = { x: x * 18, y: y * -18 };
        scheduleSpring();
      },
      [disabled, scheduleSpring]
    );

    const handleEnter = useCallback(() => {
      if (disabled || isCalm()) return;
      setHovered(true);
    }, [disabled]);

    const handleLeave = useCallback(() => {
      setHovered(false);
      setPressed(false);
      targetTilt.current = { x: 0, y: 0 };
      if (!isCalm()) scheduleSpring();
    }, [scheduleSpring]);

    const transform = disabled
      ? undefined
      : `perspective(1200px) rotateX(${tilt.y.toFixed(2)}deg) rotateY(${tilt.x.toFixed(2)}deg) translateZ(${
          hovered ? (pressed ? 14 : 26) : 0
        }px) scale(${pressed ? 0.985 : 1})`;

    const sheenAngle = tilt.x + 135;

    const sharedProps = {
      ref: setRef,
      className: cn("card-3d", hovered && "is-hovered", inView && "is-entered", className),
      style: {
        ...style,
        "--card-stagger": `${index * 65}ms`,
        transform,
      } as React.CSSProperties,
      onMouseMove: handleMove,
      onMouseEnter: handleEnter,
      onMouseLeave: handleLeave,
      onMouseDown: () => !disabled && setPressed(true),
      onMouseUp: () => setPressed(false),
    };

    const content = (
      <>
        <div
          className="card-3d-sheen"
          aria-hidden="true"
          style={{
            opacity: hovered ? 1 : 0,
            background: `linear-gradient(${sheenAngle.toFixed(1)}deg, transparent 36%, rgb(102 102 253 / 0.14) 50%, transparent 64%)`,
          }}
        />
        <div className="card-3d-rim" aria-hidden="true" style={{ opacity: hovered ? 1 : 0 }} />
        <div className="card-3d-body">{children}</div>
      </>
    );

    if (href) {
      return (
        <a {...sharedProps} href={href} target={target} rel={rel} onClick={onClick}>
          {content}
        </a>
      );
    }

    return (
      <div
        {...sharedProps}
        onClick={disabled ? undefined : onClick}
        role={onClick ? "button" : "article"}
        tabIndex={onClick && !disabled ? 0 : undefined}
      >
        {content}
      </div>
    );
  }
);

Card3D.displayName = "Card3D";
