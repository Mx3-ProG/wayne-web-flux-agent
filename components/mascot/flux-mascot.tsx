"use client";

import dynamic from "next/dynamic";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import styles from "./mascot.module.css";

const FluxMascotScene = dynamic(
  () => import("./flux-mascot-scene").then((mod) => mod.FluxMascotScene),
  {
    ssr: false,
    loading: () => <div className={styles.loading} aria-hidden="true" />,
  },
);

export type FluxMascotBehavior = "still" | "idle" | "spin" | "follow-pointer";
export type FluxMascotInteraction = "none" | "rotate" | "move";
export type FluxMascotPlacement =
  | "inline"
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left";

export type FluxMascotCommand = {
  target?: string;
  behavior: FluxMascotBehavior;
};

export type FluxMascotProps = {
  id?: string;
  className?: string;
  modelUrl?: string;
  behavior?: FluxMascotBehavior;
  interaction?: FluxMascotInteraction;
  placement?: FluxMascotPlacement;
  width?: number | string;
  height?: number | string;
  scale?: number;
  transparent?: boolean;
  ariaLabel?: string;
};

const COMMAND_EVENT = "flux:mascot-command";
const INTERACTION_EVENT = "flux:mascot-interact";

/** Pilote une ou toutes les mascottes depuis n'importe quel Client Component. */
export function commandFluxMascot(command: FluxMascotCommand) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<FluxMascotCommand>(COMMAND_EVENT, { detail: command }));
}

export function FluxMascot({
  id = "flux-mascot",
  className,
  modelUrl = "/models/flux-mascot.glb",
  behavior = "idle",
  interaction = "rotate",
  placement = "inline",
  width = 320,
  height = 420,
  scale = 1,
  transparent = true,
  ariaLabel = "Mascotte Flux en 3D",
}: FluxMascotProps) {
  const [commandedBehavior, setCommandedBehavior] = useState<FluxMascotBehavior | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ pointerId: number; x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    function onCommand(event: Event) {
      const command = (event as CustomEvent<FluxMascotCommand>).detail;
      if (!command || (command.target && command.target !== id)) return;
      setCommandedBehavior(command.behavior);
    }
    window.addEventListener(COMMAND_EVENT, onCommand);
    return () => window.removeEventListener(COMMAND_EVENT, onCommand);
  }, [id]);

  const isMovable = interaction === "move";

  function emit(type: "click" | "move") {
    window.dispatchEvent(
      new CustomEvent(INTERACTION_EVENT, { detail: { id, type } }),
    );
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!isMovable) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      ox: offset.x,
      oy: offset.y,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    setOffset({
      x: drag.current.ox + event.clientX - drag.current.x,
      y: drag.current.oy + event.clientY - drag.current.y,
    });
  }

  function stopDragging(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    drag.current = null;
    emit("move");
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!isMovable) return;
    const step = event.shiftKey ? 24 : 8;
    const delta = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    }[event.key];
    if (!delta) return;
    event.preventDefault();
    setOffset((current) => ({ x: current.x + delta.x, y: current.y + delta.y }));
  }

  const style = {
    "--mascot-width": typeof width === "number" ? `${width}px` : width,
    "--mascot-height": typeof height === "number" ? `${height}px` : height,
    "--mascot-x": `${offset.x}px`,
    "--mascot-y": `${offset.y}px`,
  } as CSSProperties;

  return (
    <div
      className={`${styles.mascot} ${styles[placement]} ${isMovable ? styles.movable : ""} ${className ?? ""}`}
      style={style}
      role="img"
      aria-label={ariaLabel}
      tabIndex={isMovable ? 0 : undefined}
      onClick={() => emit("click")}
      onDoubleClick={() => isMovable && setOffset({ x: 0, y: 0 })}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
    >
      <FluxMascotScene
        modelUrl={modelUrl}
        behavior={commandedBehavior ?? behavior}
        allowRotation={interaction === "rotate"}
        scale={scale}
        transparent={transparent}
      />
    </div>
  );
}
