const $ = require('jquery');
const twitch = require('../../utils/twitch');
const watcher = require('../../watcher');

const CHAT_CONTAINER = '.chat-room .chat-messages';
const CHAT_LINES = '.ember-chat .chat-messages .chat-lines';
const CHAT_ROOM_SELECTOR = '.chat-room > div.ember-view';

let isFrozen = false;

function setScrollState(enabled) {
    const chatRoomEmberId = $(CHAT_ROOM_SELECTOR).attr('id');
    const chatComponent = twitch.getEmberView(chatRoomEmberId);
    if (!chatComponent) return;

    if (enabled) {
        chatComponent._scrollToBottom();
    } else {
        chatComponent._setStuckToBottom(false);
    }
}

class ChatFreezeModule {
    constructor() {
        $('body')
            .on('keydown.chat-freeze', e => {
                if (!(e.metaKey || e.ctrlKey) || !$(`${CHAT_LINES}:hover`).length || document.hidden) return;
                isFrozen = true;
                setScrollState(false);
            })
            .on('keyup.chat-freeze', e => {
                if (e.metaKey || e.ctrlKey || !isFrozen) return;
                isFrozen = false;
                setScrollState(true);
            });
        watcher.on('load.chat', () => this.load());
    }

    load() {
        $(CHAT_CONTAINER).on('mousewheel', ({originalEvent}) => {
            const indicator = $('.more-messages-indicator').length > 0;
            if (originalEvent.wheelDelta > 0 && !indicator) {
                setScrollState(false);
            } else if (originalEvent.wheelDelta < 0 && indicator) {
                const $chatContent = $('.chat-messages .tse-content');
                const $chatScroller = $('.chat-messages .tse-scroll-content');
                if ($chatContent.offset().top + $chatContent.height() - $chatScroller.height() < 200) {
                    setScrollState(true);
                }
            }
        });
    }
}

module.exports = new ChatFreezeModule();
