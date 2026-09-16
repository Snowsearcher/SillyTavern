const STYLE_ID = 'snowbunny-composer-layout-fix';

export function initComposerLayout() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
        @media screen and (max-width: 1000px) {
            body.snowbunny-mobile #send_form #nonQRFormItems {
                grid-template-columns: 42px max-content minmax(0, 1fr) auto !important;
            }

            /* ST and extensions can add more than one control to the left side
               of the composer. Give that group its real width instead of
               pretending it is always one 38px button, which made extra
               controls overlap the writing field. */
            body.snowbunny-mobile #send_form #leftSendForm {
                display: flex !important;
                flex-flow: row nowrap !important;
                align-items: center !important;
                justify-content: flex-start !important;
                gap: 2px !important;
                width: max-content !important;
                min-width: 38px !important;
                max-width: none !important;
                overflow: visible !important;
            }

            body.snowbunny-mobile #send_form #leftSendForm > * {
                flex: 0 0 auto;
            }

            body.snowbunny-mobile #send_form #leftSendForm > .displayNone {
                display: none !important;
            }

            body.snowbunny-mobile #send_textarea {
                min-width: 0 !important;
                position: relative;
                z-index: 1;
            }
        }
    `;
    document.head.append(style);
}
