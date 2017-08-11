const settings = require('../../settings');
const watcher = require('../../watcher');
const twitch = require('../../utils/twitch');
const css = require('../../utils/css');

const LIGHT_KEY = 'split-chat';
const DARK_KEY = 'split-chat-dark';

let alternateBackground = false;

class SplitChatModule {
    constructor() {
        settings.add({
            id: 'splitChat',
            name: 'Split Chat',
            defaultValue: false,
            description: 'Easily distinguish between messages from different users in chat'
        });
        settings.on('changed.splitChat', () => this.load());
        settings.on('changed.darkenedMode', () => this.load());
        watcher.on('chat.message', ($el, msg) => {
            if (settings.get('splitChat') === false) return;

            const currentUser = twitch.getCurrentUser();
            if (msg.from === currentUser.name) {
                $el.toggleClass('bttv-own-msg-bg');
                return;
            }

            if (alternateBackground) {
                $el.toggleClass('bttv-alt-bg');
            }
            alternateBackground = !alternateBackground;
        });
        this.load();
    }

    load() {
        if (settings.get('splitChat') === true) {
            if (settings.get('darkenedMode') === true) {
                css.unload(LIGHT_KEY);
                css.load(DARK_KEY);
            } else {
                css.unload(DARK_KEY);
                css.load(LIGHT_KEY);
            }
        } else {
            css.unload(LIGHT_KEY);
            css.unload(DARK_KEY);
        }
    }
}

module.exports = new SplitChatModule();
