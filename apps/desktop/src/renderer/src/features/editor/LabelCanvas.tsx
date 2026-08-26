import { useEffect, useRef, useState } from 'react';
import { Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { ContentBox } from '../preview/content-placement.js';
import { loadHtmlImage, renderBarcodeCanvas, renderQrCanvas } from './codes.js';
import type { OverlayElement } from './overlay.js';

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

  if (overlay.kind === 'qr') {
    return (
      <QrNode overlay={overlay} common={common} attach={attach} />
    );
  }

  if (overlay.kind === 'barcode') {
    return (
      <BarcodeNode overlay={overlay} common={common} attach={attach} height={height} />
    );
  }

  return <ImageNode overlay={overlay} common={common} attach={attach} />;
}

function QrNode(props: {
  overlay: OverlayElement;
  common: Record<string, unknown>;
  attach: (node: Konva.Node | null) => void;
}) {
  const image = useCanvasImage(
    () => renderQrCanvas(props.overlay.content, props.overlay.qrEcl),
    `${props.overlay.id}:${props.overlay.content}:${props.overlay.qrEcl}`,
  );
  if (!image) {
    return <Rect ref={props.attach} {...props.common} fill="#f4f4f4" stroke="#111111" dash={[4, 4]} />;
  }
  return <KonvaImage ref={props.attach} {...props.common} image={image} />;
}

function BarcodeNode(props: {
  overlay: OverlayElement;
  common: Record<string, unknown>;
  attach: (node: Konva.Node | null) => void;
  height: number;
}) {
  const image = useCanvasImage(
    () =>
      renderBarcodeCanvas({
        content: props.overlay.content,
        format: props.overlay.barcodeFormat,
        displayValue: props.overlay.barcodeDisplayValue,
        height: Math.max(40, props.height),
      }),
    `${props.overlay.id}:${props.overlay.content}:${props.overlay.barcodeFormat}:${String(props.overlay.barcodeDisplayValue)}:${props.height}`,
  );
  if (!image) {
    return <Rect ref={props.attach} {...props.common} fill="#f4f4f4" stroke="#111111" dash={[4, 4]} />;
  }
  return <KonvaImage ref={props.attach} {...props.common} image={image} />;
}

function ImageNode(props: {
  overlay: OverlayElement;
  common: Record<string, unknown>;
  attach: (node: Konva.Node | null) => void;
}) {
  const image = useHtmlImage(props.overlay.src || null);
  if (!image) {
    return <Rect ref={props.attach} {...props.common} fill="#f4f4f4" stroke="#111111" dash={[4, 4]} />;
  }
  return <KonvaImage ref={props.attach} {...props.common} image={image} />;
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
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
        />
      </Layer>
    </Stage>
  );
}

export const AWB_IMAGE_ID = IMAGE_ID;
