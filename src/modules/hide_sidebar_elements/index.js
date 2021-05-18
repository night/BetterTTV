import $ from 'jquery';
import watcher from '../../watcher.js';
import settings from '../../settings.js';
import domObserver from '../../observers/dom.js';
import twitch from '../../utils/twitch.js';

let removeFeaturedChannelsListener;
let removeOfflineFollowedChannelsListener;
let sidebarNode;

class HideSidebarElementsModule {
  constructor() {
    settings.add({
      id: 'hideFeaturedChannels',
      name: 'Hide Recommended Channels',
      defaultValue: true,
      description: 'Removes the recommended channels in the sidebar',
    });
    settings.add({
      id: 'autoExpandChannels',
      name: 'Auto Expand Followed Channels List',
      defaultValue: false,
      description: 'Clicks the "Load More" followed channels button in the sidebar for you',
    });
    settings.add({
      id: 'hideRecommendedFriends',
      name: 'Hide Recommended Friends',
      defaultValue: false,
      description: 'Removes the recommended friends section in the sidebar',
    });
    settings.add({
      id: 'hideOfflineFollowedChannels',
      name: 'Hide Offline Followed Channels',
      defaultValue: false,
      description: 'Removes offline followed channels in the sidebar',
    });
    settings.on('changed.hideFeaturedChannels', () => this.toggleFeaturedChannels());
    settings.on('changed.autoExpandChannels', () => this.toggleAutoExpandChannels());
    settings.on('changed.hideRecommendedFriends', () => this.toggleRecommendedFriends());
    settings.on('changed.hideOfflineFollowedChannels', () => this.toggleOfflineFollowedChannels());
    watcher.on('load', () => {
      this.toggleFeaturedChannels();
      this.toggleAutoExpandChannels();
      this.toggleRecommendedFriends();
      this.toggleOfflineFollowedChannels();
    });
  }

  toggleFeaturedChannels() {
    if (settings.get('hideFeaturedChannels')) {
      if (removeFeaturedChannelsListener) return;
      removeFeaturedChannelsListener = domObserver.on('.side-nav-section', (_, isConnected) => {
        if (!isConnected) return;

        sidebarNode = sidebarNode || twitch.getRecommendedSidebar();
        if (!sidebarNode) return;

        $(sidebarNode).addClass('bttv-hide-featured-channels');
      });
      return;
    }

    if (!removeFeaturedChannelsListener) return;

    removeFeaturedChannelsListener();
    removeFeaturedChannelsListener = undefined;
    sidebarNode = undefined;
    $('.side-nav-section').removeClass('bttv-hide-featured-channels');
  }

  toggleAutoExpandChannels() {
    if (!settings.get('autoExpandChannels')) return;
    setTimeout(() => {
      const $firstChannelLink = $('a.side-nav-card__link[data-a-id="followed-channel-0"]');
      if ($firstChannelLink.length === 0) return;
      $('.side-nav button[data-a-target="side-nav-show-more-button"]').first().trigger('click');
    }, 1000);
  }

  toggleRecommendedFriends() {
    $('body').toggleClass('bttv-hide-recommended-friends', settings.get('hideRecommendedFriends'));
  }

  toggleOfflineFollowedChannels() {
    if (settings.get('hideOfflineFollowedChannels')) {
      if (removeOfflineFollowedChannelsListener) return;

      removeOfflineFollowedChannelsListener = domObserver.on(
        '.side-nav-card .side-nav-card__avatar--offline',
        (node, isConnected) => {
          if (!isConnected) return;
          $(node).addClass('bttv-hide-followed-offline');
        },
        {useParentNode: true}
      );
      return;
    }

    if (!removeOfflineFollowedChannelsListener) return;

    removeOfflineFollowedChannelsListener();
    removeOfflineFollowedChannelsListener = undefined;
    $('.side-nav-card').removeClass('bttv-hide-followed-offline');
  }
}

export default new HideSidebarElementsModule();
