"use client";

import { useEffect, useRef } from "react";
import styles from "./LandingTileReveal.module.css";

type ActiveTile = {
  element: HTMLSpanElement;
  removalTimer: number | null;
};

const GRID_STEP = 14;
const TILE_COLORS = [
  "rgba(255, 255, 255, 0.98)",
  "rgba(226, 245, 255, 0.98)",
  "rgba(193, 229, 252, 0.96)",
  "rgba(155, 211, 248, 0.9)",
];

function hashCell(x: number, y: number) {
  let hash = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return (hash ^ (hash >>> 16)) >>> 0;
}

export default function LandingTileReveal() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const activeTiles = new Map<string, ActiveTile>();
    let animationFrame = 0;
    let touchActive = false;
    let touchFadeTimer = 0;
    let pendingPoint: {
      clientX: number;
      clientY: number;
      pointerType: string;
    } | null = null;

    function removeTile(key: string, tile: ActiveTile) {
      if (tile.removalTimer !== null) {
        window.clearTimeout(tile.removalTimer);
      }
      tile.element.remove();
      activeTiles.delete(key);
    }

    function fadeTile(key: string, tile: ActiveTile) {
      if (tile.removalTimer !== null) return;

      tile.element.classList.remove(styles.visible);
      tile.removalTimer = window.setTimeout(() => {
        const current = activeTiles.get(key);
        if (!current || current !== tile) return;
        if (current.element.classList.contains(styles.visible)) {
          current.removalTimer = null;
          return;
        }
        removeTile(key, current);
      }, 360);
    }

    function fadeAll() {
      for (const [key, tile] of activeTiles) {
        fadeTile(key, tile);
      }
    }

    function reveal(clientX: number, clientY: number, pointerType: string) {
      const rect = layer.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const radius = pointerType === "touch" ? 58 : 68;
      const verticalRadius = radius * 1.12;
      const minGridX = Math.floor((x - radius) / GRID_STEP);
      const maxGridX = Math.ceil((x + radius) / GRID_STEP);
      const minGridY = Math.floor((y - verticalRadius) / GRID_STEP);
      const maxGridY = Math.ceil((y + verticalRadius) / GRID_STEP);
      const visibleKeys = new Set<string>();

      for (let gridY = minGridY; gridY <= maxGridY; gridY += 1) {
        for (let gridX = minGridX; gridX <= maxGridX; gridX += 1) {
          const tileX = gridX * GRID_STEP + GRID_STEP / 2;
          const tileY = gridY * GRID_STEP + GRID_STEP / 2;
          if (tileX < 0 || tileY < 0 || tileX > rect.width || tileY > rect.height) {
            continue;
          }

          const dx = (tileX - x) / radius;
          const dy = (tileY - y) / verticalRadius;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 1) continue;

          const hash = hashCell(gridX, gridY);
          if (hash % 100 >= 39) continue;

          const key = `${gridX}:${gridY}`;
          visibleKeys.add(key);
          const opacity = Math.max(0.28, 0.96 - distance * 0.56);
          let tile = activeTiles.get(key);

          if (!tile) {
            const element = document.createElement("span");
            element.className = styles.tile;
            element.style.left = `${tileX}px`;
            element.style.top = `${tileY}px`;
            element.style.backgroundColor = TILE_COLORS[(hash >>> 8) % TILE_COLORS.length];
            element.style.setProperty("--tile-opacity", opacity.toFixed(2));
            layer.appendChild(element);
            tile = { element, removalTimer: null };
            activeTiles.set(key, tile);
            window.requestAnimationFrame(() => {
              if (element.isConnected) element.classList.add(styles.visible);
            });
          } else {
            if (tile.removalTimer !== null) {
              window.clearTimeout(tile.removalTimer);
              tile.removalTimer = null;
            }
            tile.element.style.setProperty("--tile-opacity", opacity.toFixed(2));
            tile.element.classList.add(styles.visible);
          }
        }
      }

      for (const [key, tile] of activeTiles) {
        if (!visibleKeys.has(key)) fadeTile(key, tile);
      }
    }

    function queueReveal(event: PointerEvent) {
      pendingPoint = {
        clientX: event.clientX,
        clientY: event.clientY,
        pointerType: event.pointerType,
      };

      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        if (!pendingPoint) return;
        reveal(
          pendingPoint.clientX,
          pendingPoint.clientY,
          pendingPoint.pointerType,
        );
        pendingPoint = null;
      });
    }

    function handlePointerMove(event: PointerEvent) {
      if (event.pointerType === "touch" && !touchActive) return;
      queueReveal(event);
    }

    function handlePointerDown(event: PointerEvent) {
      if (touchFadeTimer) {
        window.clearTimeout(touchFadeTimer);
        touchFadeTimer = 0;
      }
      if (event.pointerType === "touch") touchActive = true;
      queueReveal(event);
    }

    function handlePointerUp(event: PointerEvent) {
      if (event.pointerType !== "touch") return;
      touchActive = false;
      touchFadeTimer = window.setTimeout(fadeAll, 720);
    }

    function handlePointerCancel(event: PointerEvent) {
      if (event.pointerType === "touch") touchActive = false;
      fadeAll();
    }

    function handlePointerLeave(event: PointerEvent) {
      if (event.pointerType === "mouse" || event.pointerType === "pen") {
        fadeAll();
      }
    }

    layer.addEventListener("pointermove", handlePointerMove);
    layer.addEventListener("pointerdown", handlePointerDown);
    layer.addEventListener("pointerup", handlePointerUp);
    layer.addEventListener("pointercancel", handlePointerCancel);
    layer.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      layer.removeEventListener("pointermove", handlePointerMove);
      layer.removeEventListener("pointerdown", handlePointerDown);
      layer.removeEventListener("pointerup", handlePointerUp);
      layer.removeEventListener("pointercancel", handlePointerCancel);
      layer.removeEventListener("pointerleave", handlePointerLeave);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      if (touchFadeTimer) window.clearTimeout(touchFadeTimer);
      for (const [key, tile] of activeTiles) removeTile(key, tile);
    };
  }, []);

  return <div ref={layerRef} className={styles.interactionLayer} aria-hidden="true" />;
}
