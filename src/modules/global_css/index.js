const $ = require('jquery');
const cdn = require('../../utils/cdn');
const css = require('../../utils/css');
const debug = require('../../utils/debug');
const settings = require('../../settings');
const watcher = require('../../watcher');

class GlobalCSSModule {
    constructor() {
        this.globalCSS();

        watcher.on('load', () => this.branding());
        this.branding();

        settings.add({
            id: 'leftSideChat',
            name: 'Left Side Chat',
            defaultValue: false,
            description: 'Moves the chat to the left of the player'
        });
        settings.on('changed.leftSideChat', () => this.toggleLeftSideChat());
        this.toggleLeftSideChat();

        settings.add({
            id: 'darkenedMode',
            name: 'Dark Theme',
            defaultValue: false,
            description: 'A sleek, grey theme which will make you love the site even more'
        });
        settings.on('changed.darkenedMode', value => value === true ? this.loadDark() : this.unloadDark());
        this.loadDark();
    }

    loadDark() {
        if (settings.get('darkenedMode') !== true || !$('body').attr('data-page')) return;

        const pageKind = $('body').data('page').split('#')[0];
        const allowedPages = ['ember', 'message', 'chat', 'user', 'dashboards'];

        if (allowedPages.indexOf(pageKind) !== -1) {
            css.load('dark');

            // Messages Delete Icon Fix (Old Messages Inbox)
            $('#main_col .messages img[src="http://www-cdn.jtvnw.net/images/xarth/g/g18_trash-00000080.png"]')
                .attr('src', 'https://cdn.betterttv.net/assets/icons/delete.png');
            $('#main_col .messages img[src="http://www-cdn.jtvnw.net/images/xarth/g/g16_trash-00000020.png"]')
                .attr('src', 'https://cdn.betterttv.net/assets/icons/delete.png')
                .attr('width', '16')
                .attr('height', '16');
        }
    }

    unloadDark() {
        css.unload('dark');
    }

    globalCSS() {
        css.load();
    }

    branding() {
        if ($('#bttv_logo').length) return;

        const $watermark = $('<img />');
        $watermark.attr('id', 'bttv_logo');
        $watermark.attr('src', cdn.url('assets/logos/logo_icon.png'));
        $watermark.css({
            'z-index': 9000,
            'left': '90px',
            'top': '-10px',
            'position': 'absolute'
        });
        $('.warp .warp__logo').append($watermark);
    }

    toggleLeftSideChat() {
        $('body').toggleClass('swap-chat', settings.get('leftSideChat'));
    }
}

module.exports = new GlobalCSSModule();
