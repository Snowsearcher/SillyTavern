import { init as initMobileShell } from './index.js';
import { initMessageIdentity } from './message-identity.js';
import { initSnowBunnyState } from './state.js';

export function init() {
    initSnowBunnyState();
    initMessageIdentity();
    initMobileShell();
}
