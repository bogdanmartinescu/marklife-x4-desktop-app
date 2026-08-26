import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label.js';

export function Field(props: { label: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-ui-xs text-ink-400">{props.label}</Label>
        {props.extra}
      </div>
      {props.children}
    </div>
  );
}
