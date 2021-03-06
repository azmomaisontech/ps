import {
  GetPointsProps,
  Point,
  PointGroup,
  PressedKeys,
  Tool,
  ToolHotKey,
} from "./config/types";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function dist(a: Point, b: Point): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

export function getPosition(
  event: TouchEvent | PointerEvent,
  element: SVGSVGElement | null
): Point {
  if (element === null) return { x: 0, y: 0 };
  let { left, top, width, height } = element.getBoundingClientRect();
  left = Math.abs(left);
  top = Math.abs(top);
  let x;
  let y;
  if ("touches" in event) {
    x = event.touches[0]?.pageX ?? 0;
    y = event.touches[0]?.pageY ?? 0;
  } else {
    x = event.pageX;
    y = event.pageY;
  }
  return {
    x: clamp(x - left, 0, width) / width,
    y: clamp(y - top, 0, height) / height,
  };
}

export function getPoints({
  pointGroups,
  pointGroupIndex,
  pointer,
  color,
  brushSize = 10,
  size,
  settings,
}: GetPointsProps): PointGroup[] {
  const minD = brushSize / Math.min(size.width, size.height) / settings.p;
  const pointGroup = pointGroups[pointGroupIndex];
  if (pointGroup === undefined) {
    pointGroups[pointGroupIndex] = {
      color,
      size: brushSize,
      points: [{ x: pointer.x, y: pointer.y }],
    };
    return [...pointGroups];
  }
  const lastPoint = pointGroup.points[pointGroup.points.length - 1];
  if (lastPoint !== undefined) {
    const d = dist(lastPoint, pointer);
    if (d < minD) return pointGroups;
  }
  pointGroups[pointGroupIndex].color = color;
  pointGroups[pointGroupIndex].points = [
    ...pointGroups[pointGroupIndex].points,
    { x: pointer.x, y: pointer.y },
  ];
  return [...pointGroups];
}

export function getCursor(tool: Tool, pressedKeys: PressedKeys = []): string {
  switch (tool) {
    case Tool.move:
      return "move";
    case Tool.brush:
      return "none";
    case Tool.zoom:
      const direction = pressedKeys.includes(ToolHotKey.zoomOut) ? "out" : "in";
      return `zoom-${direction}`;
    default:
      return "default";
  }
}
