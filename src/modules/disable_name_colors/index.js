import $ from 'jquery';
import settings from '../../settings';
import watcher from '../../watcher';

class DisableNameColorsModule {
    constructor() {
        settings.add({
            id: 'disableUsernameColors',
            name: 'Disable Name Colors',
            defaultValue: false,
            description: 'Disables username colors in chat (useful for those with color blindness)'
        });
        settings.on('changed.disableUsernameColors', () => this.load());
        watcher.on('load.chat', () => this.load());
    }

    load() {
        $('.chat-scrollable-area__message-container').toggleClass('bttv-disable-name-colors', settings.get('disableUsernameColors'));
    }
}

export default new DisableNameColorsModule();
