import type { ReactNode } from 'react';
import { Activity, History, Images, Printer, Settings2, SlidersHorizontal } from 'lucide-react';
import type { Screen } from '@thermalbridge/shared';
import { Button } from '@/components/ui/button.js';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import type { MessageKey } from '@/i18n/messages.js';
import { cn } from '@/lib/utils.js';
import appIcon from '@/assets/app-icon.png';

const NAV_GROUPS: Array<{
  labelKey: MessageKey;
  items: Array<{ id: Screen; labelKey: MessageKey; icon: ReactNode }>;
}> = [
  {
    labelKey: 'navGroupWorkspace',
    items: [{ id: 'print', labelKey: 'navPrint', icon: <Printer /> }],
  },
  {
    labelKey: 'navGroupContent',
    items: [
      { id: 'history', labelKey: 'navHistory', icon: <History /> },
      { id: 'library', labelKey: 'navLibrary', icon: <Images /> },
    ],
  },
  {
    labelKey: 'navGroupDevice',
    items: [
      { id: 'setup', labelKey: 'navPrinters', icon: <Settings2 /> },
      { id: 'calibration', labelKey: 'navCalibration', icon: <SlidersHorizontal /> },
      { id: 'diagnostics', labelKey: 'navDiagnostics', icon: <Activity /> },
    ],
  },
];

interface AppSidebarProps {
  screen: Screen;
  onScreen: (screen: Screen) => void;
}

export function AppSidebar(props: AppSidebarProps) {
  const { t } = useI18n();
  return (
    <aside className="flex w-14 shrink-0 flex-col overflow-hidden border-r border-white/5 bg-ink-950 px-1.5 py-3 text-ink-300">
      <div className="mb-4 flex justify-center">
        <img
          src={appIcon}
          alt={t('appName')}
          className="size-9 shrink-0 rounded-lg object-cover"
        />
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-3">
        {NAV_GROUPS.map((group, index) => (
          <div key={group.labelKey} className="flex flex-col gap-0.5">
            {index > 0 ? <span className="mx-2 mb-1 h-px bg-white/10" aria-hidden /> : null}
            {group.items.map((item) => (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={t(item.labelKey)}
                    className={cn(
                      'h-9 w-full justify-center px-0 text-ink-300 hover:bg-ink-800 hover:text-ink-50',
                      props.screen === item.id &&
                        'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
                    )}
                    aria-current={props.screen === item.id ? 'page' : false}
                    onClick={() => props.onScreen(item.id)}
                  >
                    {item.icon}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {t(item.labelKey)}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
