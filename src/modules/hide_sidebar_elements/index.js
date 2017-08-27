const $ = require('jquery');
const css = require('../../utils/css');
const watcher = require('../../watcher');
const settings = require('../../settings');

class HideSidebarElementsModule {
    constructor() {
        settings.add({
            id: 'hideFeaturedChannels',
            name: 'Hide Recommended Channels',
            defaultValue: true,
            description: 'The left sidebar is too cluttered, so you can remove recommended channels'
        });
        settings.add({
            id: 'hideRecommendedFriends',
            name: 'Hide Recommended Friends',
            defaultValue: true,
            description: 'Hides the Recommended Friends section so you have more room for activities!'
        });
        settings.add({
            id: 'hidePrimePromotion',
            name: 'Hide Prime Promotions',
            defaultValue: false,
            description: 'Hides the "Free With Prime" section of the sidebar'
        });
        settings.on('changed.hideFeaturedChannels', () => this.toggleFeaturedChannels());
        settings.on('changed.hidePrimePromotion', () => this.togglePrimePromotions());
        watcher.on('load', () => {
            this.toggleFeaturedChannels();
            this.togglePrimePromotions();
        });
    }

    toggleFeaturedChannels() {
        if (settings.get('hideRecommendedFriends') === false) {
            css.unload('hide-recommended-friends');
        } else {
            css.load('hide-recommended-friends');
        }
    }

    toggleFeaturedChannels() {
        if (settings.get('hideFeaturedChannels') === false) {
            css.unload('hide-recommended-channels');
        } else {
            css.load('hide-recommended-channels');
        }
    }

    togglePrimePromotions() {
        if (settings.get('hidePrimePromotion') === false) {
            $('.js-offers').show();
            $('.top-nav__prime-anchor').show();
        } else {
            $('.js-offers').hide();
            $('.top-nav__prime-anchor').hide();
        }
    }
}

module.exports = new HideSidebarElementsModule();
