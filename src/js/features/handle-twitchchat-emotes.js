var debug = require('../helpers/debug');

module.exports = function() {
    if (window.emoteMenu) {
        if (bttv.settings.get('clickTwitchEmotes') === true) {
            $('#emote-menu-button').show();
        } else {
            $('#emote-menu-button').hide();
        }

        return;
    }

    // Inject the emote menu if option is enabled.
    if (bttv.settings.get('clickTwitchEmotes') === false) return;

    debug.log('Injecting Twitch Chat Emotes Script');

    require('twitch-chat-emotes/script.min');

    // Try hooking into the emote menu, regardless of whether we injected or not.
    var counter = 0;
    var getterInterval = setInterval(function() {
        counter++;

        if (counter > 29) {
            clearInterval(getterInterval);
            return;
        }

        if (window.emoteMenu) {
            clearInterval(getterInterval);
            debug.log('Hooking into Twitch Chat Emotes Script');
            window.emoteMenu.registerEmoteGetter('GameWisp', bttv.chat.gwEmotes);
            window.emoteMenu.registerEmoteGetter('BetterTTV', bttv.chat.emotes);
        }
    }, 1000);
};
