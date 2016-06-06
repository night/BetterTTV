/* global BTTVLOADED:true PP:true*/
// Declare public and private variables
var debug = require('./helpers/debug'),
    vars = require('./vars'),
    TwitchAPI = require('./twitch-api'),
    WS = require('./ws'),
    Storage = require('./storage'),
    Settings = require('./settings');

bttv.info = {
    version: '6.8',
    release: 53,
    versionString: function() {
        return bttv.info.version + 'R' + bttv.info.release;
    }
};

bttv.TwitchAPI = TwitchAPI;
bttv.vars = vars;
bttv.storage = new Storage();
bttv.settings = new Settings();

bttv.getChannel = function() {
    if (window.Ember && window.App && ['channel.index.index', 'vod'].indexOf(App.__container__.lookup('controller:application').get('currentRouteName')) > -1) {
        var channel = App.__container__.lookup('controller:channel');
        var user = App.__container__.lookup('controller:user');
        return (!Ember.isNone(channel) && channel.get('model.id')) || (!Ember.isNone(user) && user.get('model.id'));
    } else if (bttv.getChatController() && bttv.getChatController().currentRoom) {
        return bttv.getChatController().currentRoom.id;
    } else if (window.PP && PP.channel) {
        return PP.channel;
    }

    return '';
};

bttv.getChatController = function() {
    if (window.Ember && window.App && App.__container__.lookup('controller:chat')) {
        return App.__container__.lookup('controller:chat');
    }

    return false;
};

bttv.notify = function(message, options) {
    if (!message) return;

    options = options || {};
    var title = options.title || 'Notice';
    var url = options.url || '';
    var image = options.image || 'https://cdn.betterttv.net/assets/logos/bttv_logo.png';
    var tag = options.tag || 'bttv_' + message;
    var permanent = options.permanent || false;
    var expires = options.expires || 60000;

    tag = 'bttv_' + tag.toLowerCase().replace(/[^\w_]/g, '');

    if ($('body#chat').length) return;

    var desktopNotify = function() {
        var notification = new window.Notification(title, {
            icon: image,
            body: message,
            tag: tag
        });
        if (permanent === false) {
            notification.onshow = function() {
                setTimeout(function() {
                    notification.close();
                }, 10000);
            };
        }
        if (url !== '') {
            notification.onclick = function() {
                window.open(url);
                notification.close();
            };
        }
        bttv.storage.pushObject('bttvNotifications', tag, { expire: Date.now() + expires });
        setTimeout(function() { bttv.storage.spliceObject('bttvNotifications', tag); }, expires);
    };

    if (bttv.settings.get('desktopNotifications') === true && ((window.Notification && Notification.permission === 'granted') || (window.webkitNotifications && webkitNotifications.checkPermission() === 0))) {
        var notifications = bttv.storage.getObject('bttvNotifications');
        for (var notification in notifications) {
            if (notifications.hasOwnProperty(notification)) {
                var expireObj = notifications[notification];
                if (notification === tag) {
                    if (expireObj.expire < Date.now()) {
                        bttv.storage.spliceObject('bttvNotifications', notification);
                    } else {
                        return;
                    }
                }
            }
        }
        desktopNotify();
    } else {
        message = message.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br /><br />').replace(/Click here(.*)./, '<a style="color: white;" target="_blank" href="' + url + '">Click here$1.</a>');

        if (!window.Twitch.notify) return;

        window.Twitch.notify.alert(message, {
            layout: 'bottomCenter',
            timeout: 5000,
            killer: true,
            escape: false
        });
    }
};

bttv.chat = require('./chat');

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

var clearClutter = require('./features/clear-clutter'),
    channelReformat = require('./features/channel-reformat'),
    brand = require('./features/brand'),
    checkMessages = require('./features/check-messages'),
    directoryFunctions = require('./features/directory-functions'),
    checkFollowing = require('./features/check-following'),
    checkBroadcastInfo = require('./features/check-broadcast-info'),
    handleBackground = require('./features/handle-background'),
    darkenPage = require('./features/darken-page'),
    splitChat = require('./features/split-chat'),
    flipDashboard = require('./features/flip-dashboard'),
    formatDashboard = require('./features/format-dashboard'),
    dashboardChannelInfo = require('./features/dashboard-channelinfo'),
    giveawayCompatibility = require('./features/giveaway-compatibility'),
    handleTwitchChatEmotesScript = require('./features/handle-twitchchat-emotes'),
    createSettings = require('./features/create-settings'),
    enableImagePreview = require('./features/image-preview').enablePreview,
    enableTheatreMode = require('./features/auto-theatre-mode'),
    hostButtonBelowVideo = require('./features/host-btn-below-video'),
    conversations = require('./features/conversations'),
    betterViewerList = require('./features/better-viewer-list'),
    overrideEmotes = require('./features/override-emotes'),
    ChatReplay = require('./features/chat-replay');

var chatFunctions = function() {
    debug.log('Modifying Chat Functionality');

    if (bttv.getChatController() && bttv.getChannel() && bttv.getChatController().currentRoom) {
        bttv.chat.takeover();
    }
};

var chatReplay = null;

var main = function() {
    if (window.Ember) {
        var renderingCounter = 0;

        var waitForLoad = function(callback, count) {
            count = count || 0;
            if (count > 5) {
                callback(false);
            }
            setTimeout(function() {
                if (renderingCounter === 0) {
                    callback(true);
                } else {
                    waitForLoad(callback, ++count);
                }
            }, 1000);
        };

        // Keep an eye for route change to reapply fixes
        var lastRoute;
        App.__container__.lookup('controller:application').addObserver('currentRouteName', function(data) {
            debug.log('New route: ' + data.currentRouteName);

            switch (data.currentRouteName) {
                case 'loading':
                    return;

                case 'channel.index.index':
                    waitForLoad(function(ready) {
                        if (ready) {
                            handleBackground();
                            clearClutter();
                            channelReformat();
                            hostButtonBelowVideo();
                            betterViewerList();
                            if (
                                App.__container__.lookup('controller:channel').get('isTheatreMode') === false &&
                                bttv.settings.get('autoTheatreMode') === true
                            ) {
                                enableTheatreMode();
                            }
                            window.dispatchEvent(new Event('resize'));
                            setTimeout(function() {
                                window.dispatchEvent(new Event('resize'));
                            }, 3000);

                            // chat
                            bttv.chat.store.isLoaded = false;
                            chatFunctions();
                        }
                    });
                    break;
                case 'vod':
                    // disconnect old chat replay watcher, spawn new
                    if (
                        App.__container__.lookup('controller:vod').get('isTheatreMode') === false &&
                        bttv.settings.get('autoTheatreMode') === true
                    ) {
                        enableTheatreMode();
                    }

                    try {
                        chatReplay.disconnect();
                    } catch (e) {}
                    chatReplay = new ChatReplay();
                    window.dispatchEvent(new Event('resize'));
                    break;
                case 'directory.following.index':
                    // Switching between tabs in following page
                    if (lastRoute.substr(0, 19) === 'directory.following') break;

                    $('#main_col').removeAttr('style');
                    waitForLoad(function(ready) {
                        if (ready) {
                            directoryFunctions();
                        }
                    });
                    break;
                case 'profile.index':
                    waitForLoad(function(ready) {
                        if (ready) {
                            channelReformat();
                            window.dispatchEvent(new Event('resize'));

                            // chat
                            bttv.chat.store.isLoaded = false;
                            chatFunctions();
                        }
                    });
                    break;
                default:
                    // resets main col width on all non-resized pages
                    $('#main_col').removeAttr('style');
                    break;
            }

            lastRoute = data.currentRouteName;
        });

        Ember.subscribe('render', {
            before: function() {
                renderingCounter++;
            },
            after: function() {
                renderingCounter--;
            }
        });
    }

    var loadUser = function(callback) {
        if (window.Twitch.user.isLoggedIn()) {
            window.Twitch.user().then(function(user) {
                vars.userData.isLoggedIn = true;
                vars.userData.name = user.login;
                vars.userData.displayName = user.name;
                vars.userData.oauthToken = user.chat_oauth_token;

                callback();
            });
            return;
        }

        callback();
    };

    var initialFuncs = function() {
        bttv.conversations = conversations();
        bttv.ws = new WS();

        chatReplay = new ChatReplay();
        clearClutter();
        channelReformat();
        checkBroadcastInfo();
        brand();
        darkenPage();
        splitChat();
        flipDashboard();
        formatDashboard();
        checkMessages();
        checkFollowing();
        giveawayCompatibility();
        dashboardChannelInfo();
        directoryFunctions();
        handleTwitchChatEmotesScript();
        hostButtonBelowVideo();
        betterViewerList();

        // Loads global BTTV emotes (if not loaded)
        overrideEmotes();

        if (bttv.settings.get('chatImagePreview') === true) {
            enableImagePreview();
        }
        if (bttv.settings.get('autoTheatreMode') === true) {
            enableTheatreMode();
        }

        window.dispatchEvent(new Event('resize'));
    };

    var delayedFuncs = function() {
        channelReformat();
        window.dispatchEvent(new Event('resize'));
        chatFunctions();
        directoryFunctions();
    };

    $(document).ready(function() {
        loadUser(function() {
            createSettings();
            bttv.settings.load();

            debug.log('BTTV v' + bttv.info.versionString());
            debug.log('CALL init ' + document.URL);

            if (/\?bttvMassUnban=true/.test(window.location)) {
                return new MassUnbanPopup();
            }

            initialFuncs();
            setTimeout(delayedFuncs, 3000);
        });
    });
};

var checkJquery = function(times) {
    times = times || 0;
    if (times > 9) return;
    if (typeof (window.jQuery) === 'undefined') {
        debug.log('jQuery is undefined.');
        setTimeout(function() { checkJquery(times + 1); }, 1000);
        return;
    }
    var $ = window.jQuery;
    bttv.jQuery = $;
    main();
};

if (document.URL.indexOf('receiver.html') !== -1 || document.URL.indexOf('cbs_ad_local.html') !== -1) {
    debug.log('HTML file called by Twitch.');
    return;
}

if (location.pathname.match(/^\/(.*)\/popout/)) {
    debug.log('Popout player detected.');
    return;
}

if (!window.Twitch || !window.Twitch.api || !window.Twitch.user) {
    debug.log('window.Twitch not detected.');
    return;
}

if (window.BTTVLOADED === true) return;
debug.log('BTTV LOADED ' + document.URL);
BTTVLOADED = true;
checkJquery();
