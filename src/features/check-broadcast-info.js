var debug = require('../helpers/debug');

var checkBroadcastInfo = module.exports = function() {
    if(!window.App || !window.App.__container__) return;

    var channelCtrl = window.App.__container__.lookup('controller:channel');

    if(!channelCtrl) return setTimeout(checkBroadcastInfo, 60000);

    if(!channelCtrl.get('model'));

    var model = channelCtrl.get('model');

    if(Ember.isEmpty(model)) return setTimeout(checkBroadcastInfo, 60000);

    var hostedChannel = model.get('hostModeTarget');
    var channel = hostedChannel ? hostedChannel : model;

    debug.log("Check Channel Title/Game");

    bttv.TwitchAPI.get("channels/" + channel.id, {}, { version: 3 }).done(function(d) {
        if(d.game) {
            channel.set('game', d.game);
        }

        if(d.status) {
            channel.set('status', d.status);

            if(!hostedChannel) {
                var $title = $('#broadcast-meta .title');

                if($title.data('status') !== d.status) {
                    $title.data('status', d.status);

                    d.status = d.status.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    d.status = bttv.chat.templates.linkify(d.status);

                    $title.find('.real').html(d.status);
                    $title.find('.over').html(d.status);
                }
            }
        }

        if(d.views) {
            channel.set('views', d.views);
        }

        if(d.followers) {
            channel.set('followersTotal', d.followers);
        }

        setTimeout(checkBroadcastInfo, 60000);
    });
}