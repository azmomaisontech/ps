import React from "react";
import {
  Filters,
  Pointer,
  PointGroup,
  Position,
  PressedKeys,
  PsContextType,
  Settings,
  Size,
  Tool,
  ToolHotKey,
} from "../../config/types";
import { DEFAULTS, ZOOM_DELTA } from "../../config/consts";
import { getPoints, getPosition } from "../../utils";

type Props = {
  children: any;
  src: string;
};

export const PsContext = React.createContext({});

export default function PsContextProvider({ children, src }: Props) {
  const [blob, setBlob] = React.useState<string>("");
  const [pointGroups, setPointGroups] = React.useState<PointGroup[]>(
    DEFAULTS.pointGroups
  );
  const [pointGroupIndex, setPointGroupIndex] = React.useState<number>(
    DEFAULTS.pointGroupIndex
  );
  const [pointer, setPointer] = React.useState<Pointer>({
    down: false,
    x: 0,
    y: 0,
  });
  const [size, setSize] = React.useState<Size>({
    width: 0,
    height: 0,
    ratio: 1,
  });
  const [rotation, setRotation] = React.useState<number>(DEFAULTS.rotation);
  const [tool, setTool] = React.useState<Tool>(Tool.move);
  const [position, setPosition] = React.useState<Position>(DEFAULTS.position);
  const [filters, setFilters] = React.useState<Filters>(DEFAULTS.filters);
  const [color, setColor] = React.useState<string>(DEFAULTS.color);
  const [brushSize, setBrushSize] = React.useState<number>(DEFAULTS.brushSize);
  const [scale, setScale] = React.useState<number>(DEFAULTS.scale);
  const [opacity, setOpacity] = React.useState<number>(DEFAULTS.opacity);
  const [pressedKeys, setPressedKeys] = React.useState<PressedKeys>(
    DEFAULTS.pressedKeys
  );
  const transform = React.useMemo((): string => {
    const cx = size.width / 2;
    const cy = size.height / 2;
    const s = scale;
    return [
      `translate(${position.x * size.width} ${position.y * size.height})`,
      `rotate(${rotation}, ${size.width / 2}, ${size.height / 2})`,
      `matrix(${s}, 0, 0, ${s}, ${cx - s * cx}, ${cy - s * cy})`,
    ].join(" ");
  }, [size, scale, position, rotation]);
  const settings = React.useMemo<Settings>(() => {
    return {
      lineCap: "round",
      p: 3 * size.ratio, // precision
    };
  }, [size]);
  const svg = React.useRef<SVGSVGElement | null>(null);

  const reset = React.useCallback(() => {
    setPosition(DEFAULTS.position);
    setFilters(DEFAULTS.filters);
    setPointGroups(DEFAULTS.pointGroups);
    setPointGroupIndex(DEFAULTS.pointGroupIndex);
    setColor(DEFAULTS.color);
    setBrushSize(DEFAULTS.brushSize);
    setRotation(DEFAULTS.rotation);
    setTool(DEFAULTS.tool);
    setOpacity(DEFAULTS.opacity);
    setScale(DEFAULTS.scale);
    setPressedKeys(DEFAULTS.pressedKeys);
  }, []);

  const download = React.useCallback(() => {
    const svgElement: SVGSVGElement | null = svg.current;
    if (svgElement === null) return;
    const canvas = document.createElement("canvas");
    const ctx: CanvasRenderingContext2D | null = canvas.getContext("2d");
    if (ctx === null) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);
      canvas.toBlob((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "image.png";
        a.click();
      }, "image/png");
    };
    if (svg.current === null) return;
    svg.current.setAttribute("width", size.width.toString());
    svg.current.setAttribute("height", size.height.toString());
    const base64 = encodeURIComponent(svg.current.outerHTML);
    img.src = `data:image/svg+xml;utf8,${base64}`;
    svg.current.removeAttribute("width");
    svg.current.removeAttribute("height");
  }, [size, svg]);

  React.useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx: CanvasRenderingContext2D | null = canvas.getContext("2d");
      // @todo resize image to improve performance on large images
      if (ctx !== null) {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        setBlob(canvas.toDataURL("image/png"));
      }
      setSize({
        width: img.width,
        height: img.height,
        ratio: img.width / img.height,
      });
    };
    img.src = src;
  }, [src, setSize, setBlob]);

  React.useEffect(() => {
    const svgElement: SVGSVGElement | null = svg.current;

    if (svgElement === null) return;

    function onPointerDown(event: TouchEvent | PointerEvent) {
      const point = getPosition(event, svgElement);
      if (tool === Tool.brush) {
        setPointGroupIndex((pointGroupIndex) => pointGroupIndex + 1);
        setPointGroups((pointGroups) => [
          ...pointGroups,
          { color, size: brushSize, points: [point, point] },
        ]);
      }
      setPosition((position) => ({
        ...position,
        startX: point.x,
        startY: point.y,
      }));
      setPointer((pointer) => ({ ...pointer, ...point, down: true }));
    }

    function onPointerMove(event: TouchEvent | PointerEvent) {
      event.preventDefault();
      const point = getPosition(event, svgElement);
      setPointer((pointer) => ({ ...pointer, ...point }));
    }

    function onPointerUp() {
      setPosition((position) => ({
        ...position,
        lastX: position.x,
        lastY: position.y,
      }));
      setPointer((pointer) => ({ ...pointer, down: false }));
    }

    svgElement.addEventListener("pointerdown", onPointerDown, {
      passive: true,
    });
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp, { passive: false });
    svgElement.addEventListener("touchstart", onPointerDown, {
      passive: false,
    });
    window.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("touchend", onPointerUp, { passive: false });
    return () => {
      svgElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      svgElement.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("touchend", onPointerUp);
    };
  }, [
    svg,
    tool,
    size,
    color,
    brushSize,
    setPointGroupIndex,
    setPointGroups,
    setPointer,
    setPosition,
  ]);

  React.useEffect(() => {
    if (!pointer.down || tool !== Tool.brush) return;
    setPointGroups((pointGroups) =>
      getPoints({
        pointGroups,
        pointGroupIndex,
        pointer,
        color,
        size,
        settings,
      })
    );
  }, [tool, pointer, pointGroupIndex, color, size, settings, setPointGroups]);

  React.useEffect(() => {
    if (!pointer.down || tool !== Tool.move) return;
    setPosition((position) => ({
      ...position,
      x: pointer.x - position.startX + position.lastX,
      y: pointer.y - position.startY + position.lastY,
    }));
  }, [pointer, tool, setPosition]);

  React.useEffect(() => {
    if (pressedKeys.includes(ToolHotKey.move)) {
      setTool(Tool.move);
    }
    if (pressedKeys.includes(ToolHotKey.brush)) {
      setTool(Tool.brush);
    }
    if (pressedKeys.includes(ToolHotKey.zoom)) {
      setTool(Tool.zoom);
    }
  }, [pressedKeys]);

  React.useEffect(() => {
    if (pointer.down && tool === Tool.zoom) {
      const direction = pressedKeys.includes(ToolHotKey.zoomOut) ? -1 : 1;
      setScale((scale) => scale + ZOOM_DELTA * direction);
    }
  }, [pressedKeys, tool, pointer.down]);

  React.useEffect(() => {
    function getKey(event: KeyboardEvent): string {
      return event.key.toLowerCase();
    }

    function onKeyDown(event: KeyboardEvent) {
      const key = getKey(event);
      setPressedKeys((pressedKeys) => {
        if (pressedKeys.includes(key)) return pressedKeys;
        return [...pressedKeys, key];
      });
    }

    function onKeyUp(event: KeyboardEvent) {
      const key = getKey(event);
      setPressedKeys((pressedKeys) => {
        const index = pressedKeys.indexOf(key);
        if (index === -1) return pressedKeys;
        pressedKeys.splice(index, 1);
        return [...pressedKeys];
      });
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const context: PsContextType = {
    blob,
    setBlob,
    pointGroups,
    setPointGroups,
    pointGroupIndex,
    setPointGroupIndex,
    pointer,
    setPointer,
    size,
    setSize,
    rotation,
    setRotation,
    tool,
    setTool,
    position,
    setPosition,
    filters,
    setFilters,
    color,
    setColor,
    brushSize,
    setBrushSize,
    scale,
    setScale,
    opacity,
    setOpacity,
    pressedKeys,
    setPressedKeys,
    transform,
    settings,
    svg,
    reset,
    download,
  };

  return <PsContext.Provider value={context}>{children}</PsContext.Provider>;
}
