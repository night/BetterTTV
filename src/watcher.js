const api = require('./utils/api');
const debug = require('./utils/debug');
const settings = require('./settings');
const twitch = require('./utils/twitch');
const SafeEventEmitter = require('./utils/safe-event-emitter');
const $ = require('jquery');

const CLIPS_HOSTNAME = 'clips.twitch.tv';
const CANCEL_VOD_RECOMMENDATION_SELECTOR = '.recommendations-overlay .pl-rec__cancel.pl-button, .autoplay-vod__content-container button';
const CHAT_ROOM_SELECTOR = 'section[data-test-selector="chat-room-component-layout"]';
const CHAT_SQUAD_WRAPPER = 'div[data-test-selector="chat-wrapper"]';

let router;
let currentPath = '';
let chatWatcher;
let vodChatWatcher;
let clipsChatWatcher;
let squadChatWatcher;
let currentChatReference;
let currentChatChannelId;
let currentChannelId;
let channel = {};
let followedChannelsWatcher;

const loadPredicates = {
    following: () => !!$('.tw-tabs div[data-test-selector="ACTIVE_TAB_INDICATOR"]').length,
    live: () => !!String($('.tw-tab__link--active').attr('href')).endsWith('live') && !!$('.live-channel-card').length,
    channel: () => {
        const href = (
            $('.channel-header__user-avatar img').attr('src') ||
            $('h3[data-test-selector="side-nav-channel-info__name_link"] a').attr('href') ||
            $('.channel-info-content img.tw-image-avatar').attr('src')
        );
        const currentChannel = twitch.updateCurrentChannel();
        if (!currentChannel || !currentChannel.id || (currentChannelId && currentChannelId === currentChannel.id)) return false;
        currentChannelId = currentChannel.id;
        return !!href;
    },
    chat: context => {
        if (!twitch.updateCurrentChannel()) return false;

        if (!$(CHAT_ROOM_SELECTOR).length) return false;

        const lastReference = currentChatReference;
        const currentChat = twitch.getCurrentChat();
        if (!currentChat) return false;

        let checkReferences = true;
        if (context && context.forceReload) {
            if (context.checkReferences === undefined) {
                context.checkReferences = true;
            }
            checkReferences = context.checkReferences;
            context.checkReferences = false;
        }

        if (checkReferences) {
            if (currentChat === lastReference) return false;
            if (currentChat.props.channelID === currentChatChannelId) return false;
        }

        currentChatReference = currentChat;
        currentChatChannelId = currentChat.props.channelID;

        return true;
    },
    clips: () => twitch.updateCurrentChannel(),
    player: () => !!twitch.getCurrentPlayer(),
    vod: () => twitch.updateCurrentChannel() && $('.video-chat__input textarea').length,
    vodRecommendation: () => $(CANCEL_VOD_RECOMMENDATION_SELECTOR).length,
    homepage: () => !!$('.front-page-carousel .video-player__container').length
};

const routes = {
    HOMEPAGE: 'HOMEPAGE',
    DIRECTORY_FOLLOWING_LIVE: 'DIRECTORY_FOLLOWING_LIVE',
    DIRECTORY_FOLLOWING: 'DIRECTORY_FOLLOWING',
    DIRECTORY: 'DIRECTORY',
    CHAT: 'CHAT',
    CHANNEL: 'CHANNEL',
    CHANNEL_SQUAD: 'CHANNEL_SQUAD',
    DASHBOARD: 'DASHBOARD',
    VOD: 'VOD'
};

const routeKeysToPaths = {
    [routes.HOMEPAGE]: /^\/$/i,
    [routes.DIRECTORY_FOLLOWING_LIVE]: /^\/directory\/following\/live$/i,
    [routes.DIRECTORY_FOLLOWING]: /^\/directory\/following$/i,
    [routes.DIRECTORY]: /^\/directory/i,
    [routes.CHAT]: /^(\/popout)?\/[a-z0-9-_]+\/chat$/i,
    [routes.VOD]: /^(\/videos\/[0-9]+|\/[a-z0-9-_]+\/clip\/[a-z0-9-_]+)$/i,
    [routes.DASHBOARD]: /^(\/[a-z0-9-_]+\/dashboard|\/u\/[a-z0-9-_]+\/stream-manager)/i,
    [routes.CHANNEL_SQUAD]: /^\/[a-z0-9-_]+\/squad/i,
    [routes.CHANNEL]: /^\/[a-z0-9-_]+/i
};

function getRouteFromPath(path) {
    for (const name of Object.keys(routeKeysToPaths)) {
        const regex = routeKeysToPaths[name];
        if (!regex.test(path)) continue;
        return name;
    }

    return null;
}

class Watcher extends SafeEventEmitter {
    constructor() {
        super();

        if (window.location.hostname === CLIPS_HOSTNAME) {
            this.loadClips();
            return;
        }

        const loadInterval = setInterval(() => {
            let user;
            try {
                router = twitch.getRouter();
                const connectStore = twitch.getConnectStore();
                if (!connectStore || !router) {
                    debug.error('Initialization failed, missing : ', {connectStore, router});
                    return;
                }
                user = connectStore.getState().session.user;
            } catch (_) {
                return;
            }

            if (!router || !user) {
                debug.error('Initialization failed, missing : ', {router, user});
                return;
            }
            clearInterval(loadInterval);

            twitch.setCurrentUser(user.authToken, user.id, user.login, user.displayName);
            this.load();
        }, 25);
    }

    waitForLoad(type, context = null) {
        let timeout;
        let interval;
        const startTime = Date.now();
        return Promise.race([
            new Promise(resolve => {
                timeout = setTimeout(resolve, 10000);
            }),
            new Promise(resolve => {
                const loaded = loadPredicates[type];
                if (loaded(context)) {
                    resolve();
                    return;
                }
                interval = setInterval(() => loaded(context) && resolve(), 25);
            })
        ]).then(() => {
            debug.log(`waited for ${type} load: ${Date.now() - startTime}ms`);
            clearTimeout(timeout);
            clearInterval(interval);
        }).then(() => this.emit('load'));
    }

    loadClips() {
        this.clipsChatObserver();
        this.channelObserver();
        this.waitForLoad('clips').then(() => {
            this.emit('load.clips');
            this.emit('load.channel');
        });
    }

    load() {
        this.channelObserver();
        this.conversationObserver();
        this.chatObserver();
        this.vodChatObserver();
        this.routeObserver();
        if (settings.get('showRerunsCategory')) {
            this.followingChannelsObserver();
        }
        this.squadChatObserver();

        require('./watchers/*.js', {mode: (base, files) => {
            return files.map(module => {
                return `
                    try {
                        require('${module}');
                    } catch (e) {
                        debug.error('Failed to load watcher ${module}', e.stack);
                    }
                `;
            }).join(' ');
        }});

        debug.log('Watcher started');
    }

    forceReloadChat() {
        currentChatReference = null;
        this.waitForLoad('chat', {forceReload: true}).then(() => this.emit('load.chat'));
    }

    routeObserver() {
        const onRouteChange = location => {
            const lastPath = currentPath;
            const path = location.pathname;
            const route = getRouteFromPath(path);

            debug.log(`New route: ${location.pathname} as ${route}`);

            // trigger on all loads (like resize functions)
            this.emit('load');

            currentPath = path;
            if (currentPath === lastPath) return;

            switch (route) {
                case routes.DIRECTORY_FOLLOWING:
                    this.waitForLoad('following').then(() => this.emit('load.directory.following'));
                    break;
                case routes.CHAT:
                    this.waitForLoad('chat').then(() => this.emit('load.chat'));
                    break;
                case routes.VOD:
                    this.waitForLoad('vod').then(() => this.emit('load.vod'));
                    this.waitForLoad('player').then(() => this.emit('load.player'));
                    break;
                case routes.CHANNEL_SQUAD:
                    this.waitForLoad('chat').then(() => this.emit('load.chat.squad')).then(() => this.emit('load.chat'));
                    this.waitForLoad('player').then(() => this.emit('load.player'));
                    break;
                case routes.CHANNEL:
                    this.waitForLoad('channel').then(() => this.emit('load.channel'));
                    this.waitForLoad('chat').then(() => this.emit('load.chat'));
                    this.waitForLoad('player').then(() => this.emit('load.player'));
                    break;
                case routes.HOMEPAGE:
                    this.waitForLoad('homepage').then(() => this.emit('load.homepage'));
                    break;
                case routes.DASHBOARD:
                    this.waitForLoad('chat').then(() => this.emit('load.chat'));
                    break;
                case routes.DIRECTORY_FOLLOWING_LIVE:
                    this.waitForLoad('live').then(() => this.emit('load.directory.live'));
                    break;
            }
        };

        router.history.listen(location => onRouteChange(location));
        onRouteChange(router.history.location);
    }

    conversationObserver() {
        const emitMessage = element => {
            const msgObject = twitch.getConversationMessageObject(element);
            if (!msgObject) return;
            this.emit('conversation.message', $(element), msgObject);
        };

        const conversationWatcher = new window.MutationObserver(mutations =>
            mutations.forEach(mutation => {
                for (const el of mutation.addedNodes) {
                    const $el = $(el);
                    if ($el.hasClass('thread-message__message')) {
                        emitMessage($el[0]);
                    } else {
                        const $thread = $el.find('.whispers-thread');
                        if ($thread.length) {
                            this.emit('conversation.new', $thread);
                        }

                        const $messages = $el.find('.thread-message__message');
                        for (const message of $messages) {
                            emitMessage(message);
                        }
                    }
                }
            })
        );

        const timer = setInterval(() => {
            const element = $('.whispers-open-threads')[0];
            if (!element) return;
            clearInterval(timer);
            conversationWatcher.observe(element, {childList: true, subtree: true});
        }, 1000);
    }

    chatObserver() {
        const emitMessage = $el => {
            const msgObject = twitch.getChatMessageObject($el[0]);
            if (!msgObject) return;
            this.emit('chat.message', $el, msgObject);
        };

        const observe = (watcher, element) => {
            if (!element) return;
            if (watcher) watcher.disconnect();
            watcher.observe(element, {childList: true, subtree: true});

            // late load messages events
            $(element).find('.chat-line__message').each((index, el) => emitMessage($(el)));
        };

        chatWatcher = new window.MutationObserver(mutations =>
            mutations.forEach(mutation => {
                const target = mutation.target;
                if (target && target.classList && target.classList.contains('viewer-card')) {
                    const $el = $(target);
                    this.emit('chat.moderator_card.open', $el);
                    return;
                }

                for (const el of mutation.addedNodes) {
                    const $el = $(el);

                    if ($el.hasClass('chat-line__message')) {
                        emitMessage($el);
                    } else if ($el.children('.channel-points-reward-line, .user-notice-line')) {
                        const channelPointsHighlight = $el.find('.chat-line__message');
                        if (channelPointsHighlight.length > 0) {
                            emitMessage(channelPointsHighlight);
                        }
                    }

                    if ($el.hasClass('viewer-card')) {
                        this.emit('chat.moderator_card.open', $el);
                    } else if ($el.hasClass('viewer-card-layer__draggable') || $el.parent().hasClass('viewer-card-layer__draggable')) {
                        const $viewerCard = $el.find('.viewer-card');
                        if ($viewerCard.length) {
                            this.emit('chat.moderator_card.open', $viewerCard);
                        }
                    }

                    if ($el.hasClass('chat-input')) {
                        this.forceReloadChat();
                    }
                }

                for (const el of mutation.removedNodes) {
                    const $el = $(el);

                    if ($el.hasClass('viewer-card-layer__draggable')) {
                        this.emit('chat.moderator_card.close');
                    }
                }
            })
        );

        this.on('load.chat', () => observe(chatWatcher, $(CHAT_ROOM_SELECTOR)[0]));

        // force reload of chat on room swap
        $('body').on(
            'click',
            '.room-picker button[data-test-selector="stream-chat-room-picker-option"], .room-picker button[data-test-selector="room-option-interactable"], .room-selector__header button[data-test-selector="open-room-picker-button"], .room-selector__header button[data-test-selector="close-room-picker-button"]',
            () => this.forceReloadChat()
        );
    }

    vodChatObserver() {
        const emitMessage = chatContent => this.emit('vod.message', $(chatContent));

        const observe = (watcher, element) => {
            if (!element) return;
            if (watcher) watcher.disconnect();
            watcher.observe(element, {childList: true, subtree: true});

            // late load messages events
            $(element).find('.vod-message__content,.vod-message').each((_, el) => emitMessage(el));
        };

        vodChatWatcher = new window.MutationObserver(mutations =>
            mutations.forEach(mutation => {
                for (const el of mutation.addedNodes) {
                    const $el = $(el);

                    const $chatContents = $el.find('.vod-message__content,.vod-message');

                    for (const chatContent of $chatContents) {
                        emitMessage(chatContent);
                    }
                }
            })
        );

        this.on('load.vod', () => observe(vodChatWatcher, $('.qa-vod-chat')[0]));
    }

    channelObserver() {
        const updateChannel = () => {
            const currentChannel = twitch.getCurrentChannel();
            if (!currentChannel || (channel && currentChannel.id === channel.id)) return;

            debug.log(`Channel Observer: ${currentChannel.name} (${currentChannel.id}) loaded.`);

            channel = currentChannel;

            api.get(`cached/users/twitch/${channel.id}`)
                .catch(error => ({
                    bots: [],
                    channelEmotes: [],
                    sharedEmotes: [],
                    status: error.status || 0
                }))
                .then(data => this.emit('channel.updated', data));
        };

        this.on('load.channel', updateChannel);
        this.on('load.chat', updateChannel);
        this.on('load.vod', updateChannel);
    }

    followingChannelsObserver() {
        const observe = (watcher, element) => {
            if (!element) return;
            if (watcher) watcher.disconnect();
            watcher.observe(element, {childList: true});
        };

        const bannedWords = ['rerun', 'rebroadcast', 'vodcast'];

        const CHANNEL_HEADING_SELECTOR = 'a.tw-link > h3';
        const CHANNEL_PLACEHOLDER_SELECTOR = '.tw-tower__placeholder';
        const CHANNELS_CONTAINER_SELECTOR = '.tw-tower';
        const RERUNS_SELECTOR = '#bttv-reruns';
        const RERUN_BADGE_SELECTOR = '.stream-type-indicator--rerun';


        followedChannelsWatcher = new window.MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type !== 'childList') return;

                if (mutation.addedNodes) {
                    mutation.addedNodes.forEach(parent => {
                        const $channel = $(parent);
                        const hasRerunBadge = $channel.find(RERUN_BADGE_SELECTOR).length;
                        let $el;

                        if (hasRerunBadge) {
                            $el = $channel.detach();
                        } else {
                            const title = String($channel.find(CHANNEL_HEADING_SELECTOR).attr('title'));
                            const hasBannedWord = bannedWords.some(word => title.toLocaleLowerCase().includes(word));

                            if (hasBannedWord) {
                                $el = $channel.detach();
                            }
                        }

                        let $reruns = $(RERUNS_SELECTOR);

                        if (!$reruns.length) {
                            $channel.parent().parent().after(`<div>
                              <div class="tw-mg-b-2"><h4 class="tw-c-text-base tw-strong">Reruns</h4></div>
                              <div id="bttv-reruns" class="tw-flex-wrap tw-tower tw-tower--300 tw-tower--gutter-sm"></div>
                            </div>`);

                            $reruns = $(RERUNS_SELECTOR);
                        }

                        if ($el && !!$reruns.length) {
                            const placeholder = $(CHANNEL_PLACEHOLDER_SELECTOR).first();

                            for (let i = 0; i < 3; i++) {
                                placeholder.clone().appendTo($reruns);
                            }

                            $el.appendTo($reruns);
                        }
                    });
                }
            });
        }
        );

        this.on('load.directory.live', () => observe(followedChannelsWatcher, $(CHANNELS_CONTAINER_SELECTOR)[0]));
        this.on('load.directory.following', () => observe(followedChannelsWatcher, $(CHANNELS_CONTAINER_SELECTOR)[0]));
    }

    clipsChatObserver() {
        const observe = (watcher, element) => {
            if (!element) return;
            if (watcher) watcher.disconnect();
            watcher.observe(element, {childList: true, subtree: true});
        };

        clipsChatWatcher = new window.MutationObserver(mutations =>
            mutations.forEach(mutation => {
                for (const el of mutation.addedNodes) {
                    const $el = $(el);

                    if ($el.hasClass('tw-mg-b-1') && $el.find('span[data-a-target="chat-message-text"]').length) {
                        this.emit('clips.message', $el);
                    }
                }
            })
        );

        this.on('load.clips', () => observe(clipsChatWatcher, $('body')[0]));
    }

    squadChatObserver() {
        let squadChatWrapper;

        const observe = (watcher, element) => {
            if (!element) return;
            squadChatWrapper = element;
            if (watcher) watcher.disconnect();
            watcher.observe(element, {subtree: true, attributes: true});
        };

        squadChatWatcher = new window.MutationObserver(mutations =>
            mutations.forEach(mutation => {
                if (mutation.type !== 'attributes') return;
                // stream chat changed, so force update current channel and chat
                if (mutation.target.parentElement === squadChatWrapper) {
                    this.forceReloadChat();
                }
            })
        );

        this.on('load.chat.squad', () => observe(squadChatWatcher, $(CHAT_SQUAD_WRAPPER)[0]));
    }
}

module.exports = new Watcher();
