var debug = require('../helpers/debug'),
    vars = require('../vars');

module.exports = function () {
    if(bttv.settings.get("showDirectoryLiveTab") === true && $('h2.title:contains("Following")').length && $('a.active:contains("Overview")').length) {
        debug.log("Changing Directory View");

        $('a[href="/directory/following/live"]').click();
    }

    if(vars.watchScroll) return;
    vars.watchScroll = $("#main_col .tse-scroll-content").scroll(function() {
        var scrollHeight = $("#main_col .tse-scroll-content")[0].scrollHeight - $("#main_col .tse-scroll-content").height(),
            scrollTop = $("#main_col .tse-scroll-content").scrollTop(),
            distanceFromBottom = scrollHeight - scrollTop;

        if(distanceFromBottom < 251) {
            if($("#directory-list a.list_more .spinner").length) return;
            $("#directory-list a.list_more").click();
        }
    });
}