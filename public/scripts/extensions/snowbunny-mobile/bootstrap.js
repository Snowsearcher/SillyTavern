import { init as initMobileShell } from './index.js';
import { initMessageIdentity } from './message-identity.js';

export function init() {
    initMessageIdentity();
    initMobileShell();
}
