import { useEffect, useState, type ReactNode } from 'react';
import { Printer } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.js';
import { useI18n } from '@/i18n/I18nProvider.js';

interface WorkspaceRightPaneProps {
  hasInspector: boolean;
  inspector: ReactNode;
  print: ReactNode;
  printDisabled?: boolean;
  busy?: boolean;
  onPrint?: () => void;
}

export function WorkspaceRightPane(props: WorkspaceRightPaneProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState('print');

  useEffect(() => {
    setTab(props.hasInspector ? 'inspector' : 'print');
  }, [props.hasInspector]);

  return (
    <aside className="flex w-[24rem] shrink-0 flex-col border-l border-white/5 bg-ink-950/40">
      <Tabs value={tab} onValueChange={setTab} className="flex h-full min-h-0 gap-0">
        <div className="shrink-0 border-b border-white/5 px-3 py-2">
          <TabsList variant="line" className="w-full">
            <TabsTrigger value="inspector" className="flex-1">
              {t('inspectorTab')}
            </TabsTrigger>
            <TabsTrigger value="print" className="flex-1">
              {t('printTab')}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="inspector" className="min-h-0 flex-1 overflow-auto p-3">
          {props.hasInspector ? (
            props.inspector
          ) : (
            <p className="text-ui-xs text-ink-500">{t('inspectorEmpty')}</p>
          )}
        </TabsContent>
        <TabsContent value="print" className="min-h-0 flex-1 overflow-hidden flex flex-col">
          <div className="min-h-0 flex-1 overflow-hidden">{props.print}</div>
          {props.onPrint ? (
            <div className="shrink-0 border-t border-white/5 p-3">
              <button
                type="button"
                disabled={props.printDisabled}
                onClick={props.onPrint}
                className="flex w-full h-12 items-center justify-center gap-2.5 rounded-lg bg-primary text-ui font-medium text-on-accent shadow-lg hover:bg-accent-600 hover-fade disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="size-5" />
                <span>{props.busy ? t('printing') : t('print')}</span>
              </button>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </aside>
  );
}
