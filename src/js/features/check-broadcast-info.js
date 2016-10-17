var debug = require('../helpers/debug');

var checkBroadcastInfo = module.exports = function() {
    if (!window.App || !window.App.__container__) return;

    var channelCtrl = window.App.__container__.lookup('controller:channel');

    if (!channelCtrl || !channelCtrl.get('channelModel')) return setTimeout(checkBroadcastInfo, 60000);

    var model = channelCtrl.get('channelModel');

    if (Ember.isEmpty(model)) return setTimeout(checkBroadcastInfo, 60000);

    var hostedChannel = model.get('hostModeTarget');
    var channel = hostedChannel ? hostedChannel : model;

    debug.log('Check Channel Title/Game');

    bttv.TwitchAPI.get('channels/' + channel.id, {}, { version: 3 }).done(function(d) {
        if (d.game) {
            channel.set('game', d.game);
        }

        if (d.status) {
            channel.set('status', d.status);

            if (!hostedChannel) {
                var $title = $('.cn-metabar__title .card__title');

                if ($title.data('status') !== d.status) {
                    $title.data('status', d.status);
                    d.status = d.status.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    d.status = bttv.chat.templates.linkify(d.status);
                    $title.html(d.status);
                }
            }
        }

        if (d.views) {
            channel.set('views', d.views);
        }

        if (d.followers) {
            channel.set('followers.content.meta.total', d.followers);
        }
    }).always(function() {
        setTimeout(checkBroadcastInfo, 60000 + Math.random() * 5000);
    });
};
