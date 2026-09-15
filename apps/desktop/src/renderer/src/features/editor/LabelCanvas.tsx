import { useEffect, useRef, useState } from 'react';
import { Arrow, Ellipse, Group, Image as KonvaImage, Layer, Line, Path, Rect, Stage, Text, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { ContentBox } from '../preview/content-placement.js';
import { loadHtmlImage, renderBarcodeCanvas, renderQrCanvas } from './codes.js';
import { resolveFieldText } from './field-value.js';
import { getPrintIcon } from './icon-catalog.js';
import { fitImageInRect } from './image-fit.js';
import type { OverlayElement } from './overlay.js';
import { parseTableCells, tableCellBounds } from './table-cells.js';

interface LabelCanvasProps {
  sourceUrl: string | null;
  contentBox: ContentBox | null;
  overlays: OverlayElement[];
  selectedId: string | null;
  widthMm: number;
  heightMm: number;
  stageWidth: number;
  stageHeight: number;
  showGrid: boolean;
  showRuler: boolean | undefined;
  onSelect: (id: string | null) => void;
  onContentBox: (box: ContentBox) => void;
  onOverlayChange: (id: string, patch: Partial<OverlayElement>) => void;
}

const IMAGE_ID = 'awb-image';
const GRID_MM = 5;

function mmToStage(mm: number, labelMm: number, stagePx: number): number {
  return (mm / labelMm) * stagePx;
}

function stageToMm(px: number, labelMm: number, stagePx: number): number {
  if (stagePx <= 0) {
    return 0;
  }
  return (px / stagePx) * labelMm;
}

function useHtmlImage(src: string | null): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }
    let cancelled = false;
    void loadHtmlImage(src)
      .then((loaded) => {
        if (!cancelled) {
          setImage(loaded);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setImage(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [src]);
  return image;
}

function useCanvasImage(factory: () => Promise<HTMLCanvasElement> | HTMLCanvasElement, key: string): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve(factory())
      .then((canvas) => loadHtmlImage(canvas.toDataURL()))
      .then((loaded) => {
        if (!cancelled) {
          setImage(loaded);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setImage(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [key]);
  return image;
}

function OverlayNode(props: {
  overlay: OverlayElement;
  widthMm: number;
  heightMm: number;
  stageWidth: number;
  stageHeight: number;
  onSelect: (id: string) => void;
  onCommit: (node: Konva.Node, id: string) => void;
  onOverlayChange: (id: string, patch: Partial<OverlayElement>) => void;
  nodeRef: (id: string, node: Konva.Node | null) => void;
}) {
  const { overlay } = props;
  const x = mmToStage(overlay.xMm, props.widthMm, props.stageWidth);
  const y = mmToStage(overlay.yMm, props.heightMm, props.stageHeight);
  const width = mmToStage(overlay.widthMm, props.widthMm, props.stageWidth);
  const height = mmToStage(overlay.heightMm, props.heightMm, props.stageHeight);
  const fontSize = mmToStage(overlay.fontSizeMm, props.heightMm, props.stageHeight);
  const common = {
    x,
    y,
    width,
    height,
    rotation: overlay.rotation,
    draggable: true,
    onClick: () => props.onSelect(overlay.id),
    onTap: () => props.onSelect(overlay.id),
    onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => props.onCommit(event.target, overlay.id),
    onTransformEnd: (event: Konva.KonvaEventObject<Event>) => props.onCommit(event.target, overlay.id),
  };
  const attach = (node: Konva.Node | null): void => {
    props.nodeRef(overlay.id, node);
  };

  if (overlay.kind === 'text') {
    return (
      <Text
        ref={attach}
        {...common}
        text={overlay.text}
        fontSize={Math.max(8, fontSize)}
        fontFamily={overlay.fontFamily}
        fontStyle={overlay.fontStyle || 'normal'}
        align={overlay.align}
        fill={overlay.fill === 'white' ? '#ffffff' : '#111111'}
        onDblClick={() => {
          const next = window.prompt('Text', overlay.text);
          if (next !== null) {
            props.onOverlayChange(overlay.id, { text: next });
          }
        }}
      />
    );
  }

  if (overlay.kind === 'rect') {
    return (
      <Rect
        ref={attach}
        {...common}
        fill={overlay.fill === 'white' ? '#ffffff' : '#111111'}
        stroke="#111111"
        strokeWidth={Math.max(1, mmToStage(overlay.strokeMm, props.widthMm, props.stageWidth))}
      />
    );
  }

  if (overlay.kind === 'circle') {
    return (
      <Group ref={attach} {...common}>
        <Ellipse
          x={width / 2}
          y={height / 2}
          radiusX={width / 2}
          radiusY={height / 2}
          fill={overlay.fill === 'white' ? '#ffffff' : '#111111'}
          stroke="#111111"
          strokeWidth={Math.max(1, mmToStage(overlay.strokeMm, props.widthMm, props.stageWidth))}
        />
      </Group>
    );
  }

  if (overlay.kind === 'line') {
    return (
      <Group ref={attach} {...common}>
        <Line
          points={[0, height / 2, width, height / 2]}
          stroke="#111111"
          strokeWidth={Math.max(1, mmToStage(overlay.strokeMm, props.heightMm, props.stageHeight))}
          hitStrokeWidth={12}
        />
      </Group>
    );
  }

  if (overlay.kind === 'arrow') {
    const pointer = Math.min(width * 0.28, height * 0.9);
    return (
      <Group ref={attach} {...common}>
        <Arrow
          points={[0, height / 2, width, height / 2]}
          stroke="#111111"
          fill="#111111"
          strokeWidth={Math.max(1, mmToStage(overlay.strokeMm, props.heightMm, props.stageHeight))}
          pointerLength={pointer}
          pointerWidth={pointer * 0.9}
          hitStrokeWidth={12}
        />
      </Group>
    );
  }

  if (overlay.kind === 'field') {
    return (
      <Text
        ref={attach}
        {...common}
        text={resolveFieldText(overlay, { now: new Date(), copyIndex: 0 })}
        fontSize={Math.max(8, fontSize)}
        fontFamily={overlay.fontFamily}
        fontStyle={overlay.fontStyle || 'normal'}
        align={overlay.align}
        fill={overlay.fill === 'white' ? '#ffffff' : '#111111'}
      />
    );
  }

  if (overlay.kind === 'table') {
    return (
      <TableNode
        overlay={overlay}
        common={common}
        attach={attach}
        width={width}
        height={height}
        fontSize={fontSize}
        strokeWidth={Math.max(1, mmToStage(overlay.strokeMm, props.widthMm, props.stageWidth))}
      />
    );
  }

  if (overlay.kind === 'icon') {
    return (
      <IconNode overlay={overlay} common={common} attach={attach} width={width} height={height} />
    );
  }

  if (overlay.kind === 'qr') {
    return (
      <QrNode overlay={overlay} common={common} attach={attach} width={width} height={height} />
    );
  }

  if (overlay.kind === 'barcode') {
    return (
      <BarcodeNode
        overlay={overlay}
        common={common}
        attach={attach}
        width={width}
        height={height}
      />
    );
  }

  return <ImageNode overlay={overlay} common={common} attach={attach} width={width} height={height} />;
}

function FittedImage(props: {
  image: HTMLImageElement | null;
  width: number;
  height: number;
  smoothing?: boolean;
}) {
  const hit = (
    <Rect width={props.width} height={props.height} fill="rgba(255,255,255,0.01)" listening />
  );
  if (!props.image) {
    return (
      <Group>
        {hit}
        <Rect
          width={props.width}
          height={props.height}
          fill="#f4f4f4"
          stroke="#111111"
          dash={[4, 4]}
          listening={false}
        />
      </Group>
    );
  }
  const fit = fitImageInRect(
    props.image.naturalWidth,
    props.image.naturalHeight,
    props.width,
    props.height,
  );
  return (
    <Group>
      {hit}
      <KonvaImage
        image={props.image}
        x={fit.x}
        y={fit.y}
        width={fit.width}
        height={fit.height}
        listening={false}
        imageSmoothingEnabled={props.smoothing ?? false}
      />
    </Group>
  );
}

function QrNode(props: {
  overlay: OverlayElement;
  common: Record<string, unknown>;
  attach: (node: Konva.Node | null) => void;
  width: number;
  height: number;
}) {
  const image = useCanvasImage(
    () => renderQrCanvas(props.overlay.content, props.overlay.qrEcl),
    `${props.overlay.id}:${props.overlay.content}:${props.overlay.qrEcl}`,
  );
  return (
    <Group ref={props.attach} {...props.common}>
      <FittedImage image={image} width={props.width} height={props.height} />
    </Group>
  );
}

function BarcodeNode(props: {
  overlay: OverlayElement;
  common: Record<string, unknown>;
  attach: (node: Konva.Node | null) => void;
  width: number;
  height: number;
}) {
  const destWidth = Math.max(8, Math.round(props.width));
  const destHeight = Math.max(8, Math.round(props.height));
  const image = useCanvasImage(
    () =>
      renderBarcodeCanvas({
        content: props.overlay.content,
        format: props.overlay.barcodeFormat,
        displayValue: props.overlay.barcodeDisplayValue,
        destWidth,
        destHeight,
      }),
    `${props.overlay.id}:${props.overlay.content}:${props.overlay.barcodeFormat}:${String(props.overlay.barcodeDisplayValue)}:${destWidth}x${destHeight}`,
  );
  return (
    <Group ref={props.attach} {...props.common}>
      <FittedImage image={image} width={props.width} height={props.height} />
    </Group>
  );
}

function IconNode(props: {
  overlay: OverlayElement;
  common: Record<string, unknown>;
  attach: (node: Konva.Node | null) => void;
  width: number;
  height: number;
}) {
  const icon = getPrintIcon(props.overlay.iconId);
  if (!icon) {
    return <Rect ref={props.attach} {...props.common} fill="#f4f4f4" stroke="#111111" dash={[4, 4]} />;
  }
  const scale = Math.min(props.width, props.height) / icon.viewBox;
  const ox = (props.width - icon.viewBox * scale) / 2;
  const oy = (props.height - icon.viewBox * scale) / 2;
  return (
    <Group ref={props.attach} {...props.common}>
      <Rect width={props.width} height={props.height} fill="transparent" />
      <Group x={ox} y={oy} scaleX={scale} scaleY={scale} listening={false}>
        {icon.fill.map((d, index) => (
          <Path key={`f-${String(index)}`} data={d} fill="#111111" fillRule="evenodd" />
        ))}
        {icon.stroke.map((d, index) => (
          <Path
            key={`s-${String(index)}`}
            data={d}
            fillEnabled={false}
            stroke="#111111"
            strokeWidth={icon.strokeWidth}
            lineJoin="round"
            lineCap="round"
          />
        ))}
      </Group>
    </Group>
  );
}

function TableNode(props: {
  overlay: OverlayElement;
  common: Record<string, unknown>;
  attach: (node: Konva.Node | null) => void;
  width: number;
  height: number;
  fontSize: number;
  strokeWidth: number;
}) {
  const cells = parseTableCells(props.overlay.text, props.overlay.tableRows, props.overlay.tableCols);
  const bounds = tableCellBounds(props.width, props.height, props.overlay.tableRows, props.overlay.tableCols);
  return (
    <Group ref={props.attach} {...props.common}>
      <Rect width={props.width} height={props.height} stroke="#111111" strokeWidth={props.strokeWidth} />
      {bounds.map((cell) => (
        <Rect
          key={`${String(cell.row)}-${String(cell.col)}`}
          x={cell.x}
          y={cell.y}
          width={cell.width}
          height={cell.height}
          stroke="#111111"
          strokeWidth={props.strokeWidth}
        />
      ))}
      {bounds.map((cell) => (
        <Text
          key={`t-${String(cell.row)}-${String(cell.col)}`}
          x={cell.x + 2}
          y={cell.y}
          width={Math.max(1, cell.width - 4)}
          height={cell.height}
          text={cells[cell.row]?.[cell.col] ?? ''}
          fontSize={Math.max(8, Math.min(props.fontSize, cell.height * 0.55))}
          fontFamily={props.overlay.fontFamily}
          fontStyle={props.overlay.fontStyle || 'normal'}
          align={props.overlay.align}
          verticalAlign="middle"
          fill="#111111"
          listening={false}
        />
      ))}
    </Group>
  );
}

function ImageNode(props: {
  overlay: OverlayElement;
  common: Record<string, unknown>;
  attach: (node: Konva.Node | null) => void;
  width: number;
  height: number;
}) {
  const image = useHtmlImage(props.overlay.src || null);
  return (
    <Group ref={props.attach} {...props.common}>
      <FittedImage image={image} width={props.width} height={props.height} smoothing />
    </Group>
  );
}

export function LabelCanvas(props: LabelCanvasProps) {
  const transformerRef = useRef<Konva.Transformer>(null);
  const imageNodeRef = useRef<Konva.Image>(null);
  const overlayRefs = useRef<Map<string, Konva.Node>>(new Map());
  const htmlImage = useHtmlImage(props.sourceUrl);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) {
      return;
    }
    if (props.selectedId === IMAGE_ID) {
      const node = imageNodeRef.current;
      transformer.nodes(node ? [node] : []);
    } else if (props.selectedId) {
      const node = overlayRefs.current.get(props.selectedId);
      transformer.nodes(node ? [node] : []);
    } else {
      transformer.nodes([]);
    }
    transformer.getLayer()?.batchDraw();
  }, [props.selectedId, props.overlays, htmlImage, props.contentBox]);

  const commitNode = (node: Konva.Node, id: string): void => {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    const widthMm = stageToMm(node.width() * scaleX, props.widthMm, props.stageWidth);
    const heightMm = stageToMm(node.height() * scaleY, props.heightMm, props.stageHeight);
    const xMm = stageToMm(node.x(), props.widthMm, props.stageWidth);
    const yMm = stageToMm(node.y(), props.heightMm, props.stageHeight);
    const rotation = node.rotation();
    if (id === IMAGE_ID && props.contentBox) {
      props.onContentBox({
        xMm,
        yMm,
        widthMm: Math.max(4, widthMm),
        heightMm: Math.max(4, heightMm),
      });
      return;
    }
    const overlay = props.overlays.find((item) => item.id === id);
    if (overlay?.kind === 'qr') {
      const size = Math.max(4, Math.max(widthMm, heightMm));
      props.onOverlayChange(id, {
        xMm,
        yMm,
        widthMm: size,
        heightMm: size,
        rotation,
      });
      return;
    }
    props.onOverlayChange(id, {
      xMm,
      yMm,
      widthMm: Math.max(4, widthMm),
      heightMm: Math.max(2, heightMm),
      rotation,
    });
  };

  if (props.stageWidth <= 0 || props.stageHeight <= 0) {
    return null;
  }

  const gridLines: Array<{ points: number[] }> = [];
  if (props.showGrid) {
    for (let mm = GRID_MM; mm < props.widthMm; mm += GRID_MM) {
      const x = mmToStage(mm, props.widthMm, props.stageWidth);
      gridLines.push({ points: [x, 0, x, props.stageHeight] });
    }
    for (let mm = GRID_MM; mm < props.heightMm; mm += GRID_MM) {
      const y = mmToStage(mm, props.heightMm, props.stageHeight);
      gridLines.push({ points: [0, y, props.stageWidth, y] });
    }
  }

  const rulerMarks: Array<{
    x: number;
    y: number;
    points?: number[];
    text?: string;
    rotation?: number;
  }> = [];
  if (props.showRuler) {
    // Top ruler (horizontal)
    const hStep = props.widthMm <= 60 ? 5 : props.widthMm <= 120 ? 10 : 20;
    for (let mm = 0; mm <= props.widthMm; mm += hStep) {
      const x = mmToStage(mm, props.widthMm, props.stageWidth);
      const isMajor = mm % (hStep * 2) === 0;
      const tickHeight = isMajor ? 8 : 5;
      rulerMarks.push({
        x,
        y: 0,
        points: [0, 0, 0, tickHeight],
      });
      if (isMajor && mm > 0 && mm < props.widthMm) {
        rulerMarks.push({
          x,
          y: 12,
          text: String(mm),
        });
      }
    }
    // Left ruler (vertical)
    const vStep = props.heightMm <= 60 ? 5 : props.heightMm <= 120 ? 10 : 20;
    for (let mm = 0; mm <= props.heightMm; mm += vStep) {
      const y = mmToStage(mm, props.heightMm, props.stageHeight);
      const isMajor = mm % (vStep * 2) === 0;
      const tickWidth = isMajor ? 8 : 5;
      rulerMarks.push({
        x: 0,
        y,
        points: [0, 0, tickWidth, 0],
      });
      if (isMajor && mm > 0 && mm < props.heightMm) {
        rulerMarks.push({
          x: 12,
          y,
          text: String(mm),
          rotation: -90,
        });
      }
    }
  }

  return (
    <Stage
      width={props.stageWidth}
      height={props.stageHeight}
      onMouseDown={(event) => {
        if (event.target === event.target.getStage()) {
          props.onSelect(null);
        }
      }}
    >
      <Layer>
        <Rect width={props.stageWidth} height={props.stageHeight} fill="#ffffff" listening={false} />
        {gridLines.map((line, index) => (
          <Line key={index} points={line.points} stroke="#e5e5e5" strokeWidth={1} listening={false} />
        ))}
        {props.showRuler &&
          rulerMarks.map((mark, index) =>
            mark.points ? (
              <Line
                key={`ruler-tick-${index}`}
                x={mark.x}
                y={mark.y}
                points={mark.points}
                stroke="#666"
                strokeWidth={1}
                listening={false}
              />
            ) : mark.text ? (
              <Text
                key={`ruler-text-${index}`}
                x={mark.x}
                y={mark.y}
                text={mark.text}
                fontSize={9}
                fill="#666"
                align="center"
                offsetX={mark.rotation !== undefined ? 0 : 10}
                offsetY={mark.rotation !== undefined ? -10 : 0}
                rotation={mark.rotation !== undefined ? mark.rotation : 0}
                listening={false}
              />
            ) : null,
          )}
        {htmlImage && props.contentBox ? (
          <KonvaImage
            ref={imageNodeRef}
            image={htmlImage}
            x={mmToStage(props.contentBox.xMm, props.widthMm, props.stageWidth)}
            y={mmToStage(props.contentBox.yMm, props.heightMm, props.stageHeight)}
            width={mmToStage(props.contentBox.widthMm, props.widthMm, props.stageWidth)}
            height={mmToStage(props.contentBox.heightMm, props.heightMm, props.stageHeight)}
            draggable
            onClick={() => props.onSelect(IMAGE_ID)}
            onTap={() => props.onSelect(IMAGE_ID)}
            onDragEnd={(event) => commitNode(event.target, IMAGE_ID)}
            onTransformEnd={(event) => commitNode(event.target, IMAGE_ID)}
          />
        ) : null}
        {props.overlays.map((overlay) => (
          <OverlayNode
            key={overlay.id}
            overlay={overlay}
            widthMm={props.widthMm}
            heightMm={props.heightMm}
            stageWidth={props.stageWidth}
            stageHeight={props.stageHeight}
            onSelect={props.onSelect}
            onCommit={commitNode}
            onOverlayChange={props.onOverlayChange}
            nodeRef={(id, node) => {
              if (node) {
                overlayRefs.current.set(id, node);
              } else {
                overlayRefs.current.delete(id);
              }
            }}
          />
        ))}
        <Transformer
          ref={transformerRef}
          rotateEnabled
          keepRatio={props.overlays.find((item) => item.id === props.selectedId)?.kind === 'qr'}
          enabledAnchors={[
            'top-left',
            'top-center',
            'top-right',
            'middle-left',
            'middle-right',
            'bottom-left',
            'bottom-center',
            'bottom-right',
          ]}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 8 || Math.abs(newBox.height) < 8) {
              return oldBox;
            }
            return newBox;
          }}
        />
      </Layer>
    </Stage>
  );
}

export const AWB_IMAGE_ID = IMAGE_ID;
