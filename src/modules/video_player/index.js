const $ = require('jquery');
const watcher = require('../../watcher');
const settings = require('../../settings');
const domWatcher = require('../../observers/dom');
const twitch = require('../../utils/twitch');
const debounce = require('lodash.debounce');

const VIDEO_PLAYER_SELECTOR = '.video-player__container';
const CANCEL_VOD_RECOMMENDATION_SELECTOR = '.recommendations-overlay .pl-rec__cancel.pl-button, .autoplay-vod__content-container button';
const BTTV_PICTURE_IN_PICTURE_SELECTOR = '#bttv-picture-in-picture';
const BTTV_THEATRE_IN_FULLSCREEN_SELECTOR = '#bttv-theatre-in-fullscreen';

const getPictureInPictureTemplate = toggled => `
    <div id="bttv-picture-in-picture" class="tw-inline-flex tw-relative tw-tooltip__container">
        <button class="tw-align-items-center tw-align-middle tw-border-bottom-left-radius-medium tw-border-bottom-right-radius-medium tw-border-top-left-radius-medium tw-border-top-right-radius-medium tw-button-icon tw-button-icon--overlay tw-core-button tw-core-button--overlay tw-inline-flex tw-interactive tw-justify-content-center tw-overflow-hidden tw-relative" aria-label="Picture in Picture">
            <span class="tw-button-icon__icon">
                <div style="width: 2rem; height: 2rem;">
                    <div class="tw-align-items-center tw-full-width tw-icon tw-icon--fill tw-inline-flex">
                        <div class="tw-aspect tw-aspect--align-top">
                            <div class="tw-aspect__spacer"></div>
                            <svg class="tw-icon__svg" width="100%" height="100%" version="1.1" transform="scale(1.3)" viewBox="0 0 128 128" x="0px" y="0px"><path d="M22 30c-1.9 1.9-2 3.3-2 34s.1 32.1 2 34c1.9 1.9 3.3 2 42 2s40.1-.1 42-2c1.9-1.9 2-3.3 2-34 0-31.6 0-31.9-2.2-34-2.1-1.9-3.3-2-42-2-38.5 0-39.9.1-41.8 2zm78 34v28H28V36h72v28z"/>${!toggled && '<path d="M60 72v12h32V60H60v12z"/>'}</svg>
                        </div>
                    </div>
                </div>
            </span>
        </button>
        <div class="tw-tooltip tw-tooltip--align-right tw-tooltip--up" data-a-target="tw-tooltip-label" role="tooltip">Picture in Picture</div>
    </div>
`;

const getTheatreInFullscreenTemplate = toggled => `
    <div id="bttv-theatre-in-fullscreen" class="tw-inline-flex tw-relative tw-tooltip-wrapper">
        <button class="tw-align-items-center tw-align-middle tw-border-bottom-left-radius-medium tw-border-bottom-right-radius-medium tw-border-top-left-radius-medium tw-border-top-right-radius-medium tw-button-icon tw-button-icon--overlay tw-core-button tw-core-button--overlay tw-inline-flex tw-interactive tw-justify-content-center tw-overflow-hidden tw-relative" aria-label="Picture in Picture">
            <span class="tw-button-icon__icon">
                <div style="width: 2rem; height: 2rem;">
                    <div class="tw-align-items-center tw-full-width tw-icon tw-icon--fill tw-inline-flex">
                        <div class="tw-aspect tw-aspect--align-top">
                            <div class="tw-aspect__spacer"></div>
                            <svg class="tw-icon__svg" width="100%" height="100%" version="1.1" viewBox="0 0 20 20" x="0px" y="0px">
                                ${toggled ? '<path d="M8 8V3H6v3H2v2h6zM12 8h6V6h-4V3h-2v5zM12 17v-5h6v2h-4v3h-2zM8 12H2v2h4v3h2v-5z"/>' : '<path d="M7 3H2v5h2V5h3V3zM18 8V3h-5v2h3v3h2zM13 17v-2h3v-3h2v5h-5zM4 12H2v5h5v-2H4v-3z" /><path d="M10,0 L10,20 Z" stroke="currentColor" stroke-width="2"/>'}
                            </svg>
                        </div> 
                    </div>
                </div>
            </span>
        </button>
        <div class="tw-tooltip tw-tooltip--align-right tw-tooltip--up" data-a-target="tw-tooltip-label" role="tooltip">
            ${toggled ? 'Exit Fullscreen (f)' : 'Theatre Mode in Fullscreen'}
        </div>
    </div>
`;

let removeRecommendationWatcher;
function watchPlayerRecommendationVodsAutoplay() {
    if (settings.get('disableVodRecommendationAutoplay') !== true) {
        removeRecommendationWatcher && removeRecommendationWatcher();
        return;
    }

    removeRecommendationWatcher = domWatcher.on(CANCEL_VOD_RECOMMENDATION_SELECTOR, (node, isConnected) => {
        if (!isConnected) return;
        $(node).trigger('click');
    });
}

let clicks = 0;
function handlePlayerClick() {
    const currentPlayer = twitch.getCurrentPlayer();
    if (!currentPlayer) return;
    const paused = currentPlayer.paused;
    clicks++;
    setTimeout(() => {
        if (clicks === 1) {
            if (!paused) {
                currentPlayer.pause();
            }
        }
        clicks = 0;
    }, 250);
}

function handlePlayerScroll(event) {
    if (!settings.get('scrollVolumeControl')) return;

    const delta = event.originalEvent.deltaY > 0 ? -0.025 : 0.025;

    const currentPlayer = twitch.getCurrentPlayer();
    if (!currentPlayer) return;

    currentPlayer.setVolume(Math.min(Math.max(currentPlayer.getVolume() + delta, 0), 1));

    event.preventDefault();
    event.stopPropagation();
}

function togglePlayerCursor(hide) {
    $('body').toggleClass('bttv-hide-player-cursor', hide);
}

let previousVolume = null;
document.addEventListener('visibilitychange', () => {
    if (!settings.get('muteInvisiblePlayer')) return;
    // set raw video element volume to not edit persisted player volume state
    const video = $(VIDEO_PLAYER_SELECTOR).find('video')[0];
    if (!video) return;
    if (document.visibilityState === 'visible') {
        if (previousVolume !== null) {
            video.volume = previousVolume;
            previousVolume = null;
        }
    } else if (!document.pictureInPictureElement) {
        previousVolume = video.volume;
        video.volume = 0;
    }
});

document.addEventListener('fullscreenchange', () => {
    if (document.pictureInPictureElement && document.fullscreenElement) {
        document.exitPictureInPicture();
    }
});

function togglePictureInPicture() {
    const video = $(VIDEO_PLAYER_SELECTOR).find('video')[0];
    if (!video) return;

    if (document.pictureInPictureElement) {
        document.exitPictureInPicture();
    } else {
        video.requestPictureInPicture();
    }
}

function toggleTheatreInFullscreen() {
    const video = $(VIDEO_PLAYER_SELECTOR).find('video')[0];
    if (!video) return;

    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        const $theatreButton = $(VIDEO_PLAYER_SELECTOR).find('[data-a-target="player-theatre-mode-button"]');
        $theatreButton.trigger('click');
        document.body.requestFullscreen();
    }
}

class VideoPlayerModule {
    constructor() {
        watcher.on('load.player', () => {
            this.clickToPause();
            watchPlayerRecommendationVodsAutoplay();
            this.loadVolumeScrollControl();
            this.loadPictureInPicture();
            this.loadTheatreInFullscreen();
        });
        settings.add({
            id: 'hidePlayerExtensions',
            name: 'Hide Twitch Extensions',
            defaultValue: false,
            description: 'Hides the interactive overlays on top of Twitch\'s video player'
        });
        settings.add({
            id: 'clickToPlay',
            name: 'Click to Play/Pause Stream',
            defaultValue: false,
            description: 'Enables clicking on the Twitch player to pause/resume playback'
        });
        settings.add({
            id: 'disableVodRecommendationAutoplay',
            name: 'Disable VoD Recommendation Autoplay',
            defaultValue: false,
            description: 'Disables autoplay of recommended videos on VoDs'
        });
        settings.add({
            id: 'muteInvisiblePlayer',
            name: 'Mute Invisible Streams',
            defaultValue: false,
            description: 'Mutes/unmutes streams automatically when you change your browser window/tab'
        });
        settings.add({
            id: 'scrollVolumeControl',
            name: 'Scroll Volume Control',
            defaultValue: false,
            description: 'Enables scrolling the twitch player to change the player volume'
        });
        settings.on('changed.hidePlayerExtensions', () => this.toggleHidePlayerExtensions());
        settings.on('changed.disableVodRecommendationAutoplay', () => watchPlayerRecommendationVodsAutoplay());
        settings.on('changed.clickToPlay', () => this.clickToPause());
        this.toggleHidePlayerExtensions();
        this.loadHidePlayerCursorFullscreen();
    }

    loadVolumeScrollControl() {
        $(VIDEO_PLAYER_SELECTOR).find('div[data-a-target="player-overlay-click-handler"]').off('wheel', handlePlayerScroll).on('wheel', handlePlayerScroll);
    }

    toggleHidePlayerExtensions() {
        $('body').toggleClass('bttv-hide-player-extensions', settings.get('hidePlayerExtensions'));
    }

    clickToPause() {
        $(VIDEO_PLAYER_SELECTOR).off('click', '.video-player__overlay div[data-a-target="player-overlay-click-handler"]', handlePlayerClick);

        if (settings.get('clickToPlay') === true) {
            $(VIDEO_PLAYER_SELECTOR).on('click', '.video-player__overlay div[data-a-target="player-overlay-click-handler"]', handlePlayerClick);
        }
    }

    loadHidePlayerCursorFullscreen() {
        const hidePlayerCursor = debounce(() => togglePlayerCursor(true), 5000);
        $('body').on('mousemove', 'div[data-test-selector="video-player__video-layout"]', () => {
            togglePlayerCursor(false);
            hidePlayerCursor();
        });
    }

    loadPictureInPicture() {
        if (!document.pictureInPictureEnabled || $(BTTV_PICTURE_IN_PICTURE_SELECTOR).length > 0) return;

        const video = $(VIDEO_PLAYER_SELECTOR).find('video');
        if (video.length === 0) return;

        video.on('enterpictureinpicture', () => {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
            $(BTTV_PICTURE_IN_PICTURE_SELECTOR).replaceWith(getPictureInPictureTemplate(true));
        });

        video.on('leavepictureinpicture', () => {
            $(BTTV_PICTURE_IN_PICTURE_SELECTOR).replaceWith(getPictureInPictureTemplate(false));
        });

        const $anchor = $('.player-controls__right-control-group');
        const $settingsButton = $anchor.children('div').children('div.settings-menu-button-component').parent();
        const $button = $(getPictureInPictureTemplate(false));

        $anchor.on('click', BTTV_PICTURE_IN_PICTURE_SELECTOR, togglePictureInPicture);
        $button.insertAfter($settingsButton);
    }

    loadTheatreInFullscreen() {
        if (!document.fullscreenEnabled || $(BTTV_THEATRE_IN_FULLSCREEN_SELECTOR).length > 0) return;

        const video = $(VIDEO_PLAYER_SELECTOR).find('video')[0];
        if (!video) return;

        document.addEventListener('fullscreenchange', () => {
            const $button = $(BTTV_THEATRE_IN_FULLSCREEN_SELECTOR);

            if (!document.fullscreenElement) {
                $button.replaceWith(getTheatreInFullscreenTemplate(false));
            } else {
                $button.replaceWith(getTheatreInFullscreenTemplate(true));
            }
        });

        const $anchor = $('.player-controls__right-control-group');
        const $settingsButton = $anchor.children('div').children('div.settings-menu-button-component').parent();
        const $button = $(getTheatreInFullscreenTemplate(false));

        $anchor.on('click', BTTV_THEATRE_IN_FULLSCREEN_SELECTOR, toggleTheatreInFullscreen);
        $button.insertAfter($settingsButton);
    }
}

module.exports = new VideoPlayerModule();
