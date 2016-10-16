function setHeaderHeight(height) {
    var channelDiv = $('.cn-content').parent();
    if (channelDiv.length === 0) return;

    var viewRegistry = App.__container__.lookup('-view-registry:main');
    var channelRedesign = viewRegistry[channelDiv[0].id];
    channelRedesign.set('channelCoverHeight', height);
    $('.cn-cover.ember-view').height(height);
    $('.js-main-col-scroll-content').scrollTop(1);
    setTimeout(function() {
        $('.js-main-col-scroll-content').scrollTop(0);
    }, 100);
}

module.exports = function(state) {
    if (!window.Ember || !window.App) return;
    var routeName = App.__container__.lookup('controller:application').get('currentRouteName');
    if (routeName.substr(0, 8) !== 'channel.') return;

    if (bttv.settings.get('disableChannelHeader') === true) {
        setHeaderHeight(0);
    } else if (state === false) {
        setHeaderHeight(380);
    }
};
