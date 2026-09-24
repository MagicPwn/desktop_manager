import { useMemo, useState } from "react";
import type { DesktopItem, IconSize } from "../domain/types";
import { IconTile } from "./IconTile";

interface VirtualIconGridProps {
  items: DesktopItem[];
  size: IconSize;
  containerId: string;
  width: number;
  height: number;
  onOpen(item: DesktopItem): void;
  onRemove(item: DesktopItem): void;
}

const metrics: Record<IconSize, { minimum: number; rowHeight: number }> = {
  small: { minimum: 58, rowHeight: 82 },
  medium: { minimum: 72, rowHeight: 92 },
  large: { minimum: 92, rowHeight: 110 },
};

export function VirtualIconGrid({ items, size, containerId, width, height, onOpen, onRemove }: VirtualIconGridProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const { minimum, rowHeight } = metrics[size];
  const columns = Math.max(1, Math.floor((width - 26 + 7) / (minimum + 7)));
  const rows = Math.ceil(items.length / columns);
  const virtualized = items.length > 100;
  const startRow = virtualized ? Math.max(0, Math.floor(scrollTop / rowHeight) - 3) : 0;
  const endRow = virtualized ? Math.min(rows, Math.ceil((scrollTop + height) / rowHeight) + 3) : rows;
  const visible = useMemo(
    () => items.slice(startRow * columns, endRow * columns),
    [items, startRow, endRow, columns],
  );

  return (
    <div className="container-body" onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
      <div className="virtual-spacer" style={{ height: virtualized ? rows * rowHeight + 26 : "100%" }}>
        <div
          className={`icon-grid grid-${size}${virtualized ? " virtualized" : ""}`}
          style={virtualized ? { top: startRow * rowHeight, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
        >
          {visible.map((item) => (
            <IconTile key={item.id} item={item} size={size} containerId={containerId} onOpen={() => onOpen(item)} onRemove={() => onRemove(item)} />
          ))}
        </div>
      </div>
    </div>
  );
}
