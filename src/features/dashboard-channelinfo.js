var debug = require('../helpers/debug'),
    vars = require('../vars');

module.exports = function dashboardChannelInfo() {
    if ($('#dash_main').length) {
        debug.log('Updating Dashboard Channel Info');

        bttv.TwitchAPI.get('streams/' + bttv.getChannel()).done(function(a) {
            if (a.stream) {
                $('#channel_viewer_count').text(Twitch.display.commatize(a.stream.viewers));
                if (a.stream.channel.views) $('#views_count span').text(Twitch.display.commatize(a.stream.channel.views));
                if (a.stream.channel.followers) $('#followers_count span').text(Twitch.display.commatize(a.stream.channel.followers));
            } else {
                $('#channel_viewer_count').text('Offline');
            }
        });
        bttv.TwitchAPI.get('channels/' + bttv.getChannel() + '/follows?limit=1').done(function(a) {
            if (a._total) {
                $('#followers_count span').text(Twitch.display.commatize(a._total));
            }
        });
        if (!$('#chatters_count').length) {
            var $chattersContainer = $('<div/>');
            var $chatters = $('<span/>');

            $chattersContainer.attr('class', 'stat');
            $chattersContainer.attr('id', 'chatters_count');

            $chatters.text('0');
            $chatters.attr('tooltipdata', 'Chatters');

            $chattersContainer.append($chatters);
            $('#followers_count').after($chattersContainer);
        }

        $.getJSON('https://tmi.twitch.tv/group/user/' + bttv.getChannel() + '/chatters?callback=?', function(data) {
            if (data.data && data.data.chatter_count) $('#chatters_count span').text(Twitch.display.commatize(data.data.chatter_count));
        });

        if (vars.dontCheckSubs !== true) {
            $.getJSON('/' + bttv.getChannel() + '/dashboard/revenue/summary_data', function(data) {
                if (!data.data) return;

                if (data.data.total_subscriptions === 0) {
                    vars.dontCheckSubs = true;
                    return;
                }

                if (!$('#subs_count').length) {
                    $subsContainer = $('<div/>');
                    var $subs = $('<span/>');

                    $subsContainer.attr('class', 'stat');
                    $subsContainer.attr('id', 'subs_count');

                    $subs.text('0');
                    $subs.attr('tooltipdata', 'Active Subscribers');

                    $subsContainer.append($subs);
                    $('#chatters_count').after($subsContainer);

                    bttv.TwitchAPI.get('chat/' + bttv.getChannel() + '/badges').done(function(a) {
                        if (a.subscriber) {
                            $('#subs_count').css('background-image', 'url(' + a.subscriber.image + ')');
                        }
                    });
                }

                $('#subs_count span').text(Twitch.display.commatize(data.data.total_subscriptions));
            });
        }

        setTimeout(dashboardChannelInfo, 60000 + Math.random() * 5000);
    }
};
