import { Button } from '@/components/ui/button.js';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.js';
import { Input } from '@/components/ui/input.js';
import { useI18n } from '@/i18n/I18nProvider.js';

interface SaveTemplateDialogProps {
  open: boolean;
  name: string;
  busy?: boolean;
  onNameChange: (name: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function SaveTemplateDialog(props: SaveTemplateDialogProps) {
  const { t } = useI18n();
  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="w-full max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('templatesSaveTitle')}</DialogTitle>
        </DialogHeader>
        <label className="block space-y-1.5">
          <span className="text-ui-2xs text-ink-400">{t('templatesName')}</span>
          <Input
            value={props.name}
            placeholder={t('templatesNamePlaceholder')}
            onChange={(event) => props.onNameChange(event.target.value)}
            autoFocus
          />
        </label>
        <DialogFooter>
          <Button type="button" size="sm" variant="ghost" onClick={props.onClose}>
            {t('templatesCancel')}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={props.name.trim().length === 0 || props.busy === true}
            onClick={props.onSave}
          >
            {t('templatesSave')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
