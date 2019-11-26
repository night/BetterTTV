const $ = require('jquery');
const settings = require('../../settings');

class HideRoomSelectorModule {
    constructor() {
        settings.add({
            id: 'hideRoomSelector',
            name: 'Hide Chat Header',
            defaultValue: false,
            description: 'Hide the room selector and viewer list button above chat.'
        });
        settings.on('changed.hideRoomSelector', () => this.load());
        this.load();
    }

    load() {
        $('body').toggleClass('bttv-hide-room-selector', settings.get('hideRoomSelector'));
    }
}

module.exports = new HideRoomSelectorModule();
