import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';
import { LabelCanvas } from '@/features/editor/LabelCanvas.js';
import type { LabelPage } from '@/features/editor/label-pages.js';
import type { OverlayElement } from '@/features/editor/overlay.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import { cn } from '@/lib/utils.js';
import type { ContentBox } from '@/features/preview/content-placement.js';

interface EditorPageStackProps {
  pages: LabelPage[];
  selectedPageId: string;
  selectedId: string | null;
  sourceUrl: string | null;
  sourceUrls: Readonly<Record<string, string>>;
  widthMm: number;
  heightMm: number;
  pageWidth: number;
  pageHeight: number;
  measured: boolean;
  showGrid: boolean;
  showRuler: boolean | undefined;
  onSelectPage: (id: string) => void;
  onSelect: (id: string | null) => void;
  onContentBox: (box: ContentBox) => void;
  onOverlayChange: (id: string, patch: Partial<OverlayElement>) => void;
  onAddPageAfter: (id: string) => void;
  onDuplicatePage: (id: string) => void;
  onDeletePage: (id: string) => void;
  onMovePageUp: (id: string) => void;
  onMovePageDown: (id: string) => void;
}

export function EditorPageStack(props: EditorPageStackProps) {
  const { t } = useI18n();
  const canDelete = props.pages.length > 1;
  const selectedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [props.selectedPageId]);

  return (
    <div className="flex flex-col items-center py-8">
      {props.pages.map((page, index) => {
        const selected = page.id === props.selectedPageId;
        const canMoveUp = index > 0;
        const canMoveDown = index < props.pages.length - 1;
        return (
          <div
            key={page.id}
            ref={selected ? selectedRef : undefined}
            className="flex flex-col items-center"
          >
            <div className="group/page relative">
              <div className="mb-2 flex w-full items-center justify-between gap-2">
                <p className="text-ui-xs font-semibold text-ink-200">
                  {t('editorPageNumber', { n: index + 1 })}
                </p>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover/page:opacity-100 group-focus-within/page:opacity-100">
                  <button
                    type="button"
                    disabled={!canMoveUp}
                    className="flex size-7 items-center justify-center rounded-md border border-white/5 bg-ink-800 text-ink-300 hover:bg-ink-750 hover:text-ink-50 hover-fade disabled:opacity-30 disabled:cursor-not-allowed"
                    title={t('editorMovePageUp') ?? 'Move page up'}
                    onClick={() => props.onMovePageUp(page.id)}
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={!canMoveDown}
                    className="flex size-7 items-center justify-center rounded-md border border-white/5 bg-ink-800 text-ink-300 hover:bg-ink-750 hover:text-ink-50 hover-fade disabled:opacity-30 disabled:cursor-not-allowed"
                    title={t('editorMovePageDown') ?? 'Move page down'}
                    onClick={() => props.onMovePageDown(page.id)}
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="flex size-7 items-center justify-center rounded-md border border-white/5 bg-ink-800 text-ink-300 hover:bg-ink-750 hover:text-ink-50 hover-fade"
                    title={t('editorDuplicatePage')}
                    onClick={() => props.onDuplicatePage(page.id)}
                  >
                    <Copy className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={!canDelete}
                    className="flex size-7 items-center justify-center rounded-md border border-white/5 bg-ink-800 text-ink-300 hover:bg-red-500 hover:text-white hover-fade disabled:opacity-30 disabled:cursor-not-allowed"
                    title={t('editorDeletePage')}
                    onClick={() => props.onDeletePage(page.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              <div
                className={cn(
                  'relative block overflow-hidden rounded-sm bg-white shadow-[0_18px_50px_rgba(0,0,0,0.45)] transition-all hover-fade',
                  selected
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-ink-900'
                    : 'ring-1 ring-black/10 hover:ring-white/20',
                )}
                style={
                  props.measured
                    ? { width: props.pageWidth, height: props.pageHeight }
                    : {
                        width: 'min(100%, 420px)',
                        aspectRatio: `${props.widthMm} / ${props.heightMm}`,
                      }
                }
                onClick={() => {
                  props.onSelectPage(page.id);
                  props.onSelect(null);
                }}
              >
                {props.measured ? (
                  <div
                    className="h-full w-full"
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={() => props.onSelectPage(page.id)}
                  >
                    <LabelCanvas
                      sourceUrl={page.hasSource ? (props.sourceUrls[page.id] ?? props.sourceUrl) : null}
                      contentBox={page.hasSource ? page.contentBox : null}
                      overlays={page.overlays}
                      selectedId={selected ? props.selectedId : null}
                      widthMm={props.widthMm}
                      heightMm={props.heightMm}
                      stageWidth={props.pageWidth}
                      stageHeight={props.pageHeight}
                      showGrid={props.showGrid}
                      showRuler={props.showRuler}
                      onSelect={(id) => {
                        props.onSelectPage(page.id);
                        props.onSelect(id);
                      }}
                      onContentBox={props.onContentBox}
                      onOverlayChange={props.onOverlayChange}
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 border border-dashed border-neutral-300 text-neutral-400">
                    <span className="text-lg font-semibold tracking-[0.35em]">{t('awbSize')}</span>
                    <span className="text-xs">
                      {props.widthMm} × {props.heightMm} mm
                    </span>
                    <p className="mt-3 max-w-[14rem] px-3 text-center text-[11px] leading-snug">
                      {t('previewEmpty')}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <AddPageButton
              label={t('editorAddPage')}
              onClick={() => props.onAddPageAfter(page.id)}
            />
          </div>
        );
      })}
    </div>
  );
}

function AddPageButton(props: { label: string; onClick: () => void }) {
  return (
    <div className="group/add relative flex h-14 w-full min-w-[12rem] items-center justify-center">
      <span className="absolute inset-x-8 top-1/2 h-px bg-white/10 group-hover/add:bg-primary/40" />
      <button
        type="button"
        className="relative z-10 flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-ink-800 px-3 text-ui-xs font-medium text-ink-200 shadow-dock hover:border-primary/40 hover:bg-ink-750 hover:text-primary"
        onClick={props.onClick}
      >
        <Plus className="size-3.5" />
        {props.label}
      </button>
    </div>
  );
}
