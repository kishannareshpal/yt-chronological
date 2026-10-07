import { OPEN_DIALOG } from './shared/events.ts';
import { openDialog } from './ui/dialog/dialog.ts';
import { keepEntryButtonsMounted } from './ui/entry-button.ts';
import { keepContinueBarMounted } from './watching/continue-bar.ts';
import { trackWatching } from './watching/track-watching.ts';

const open = () => void openDialog();

document.addEventListener(OPEN_DIALOG, open);
keepEntryButtonsMounted(open);
keepContinueBarMounted();
trackWatching();
