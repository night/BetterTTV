const $ = require('jquery');
const watcher = require('../../watcher');
const settings = require('../../settings');
const keyCodes = require('../../utils/keycodes');
const twitch = require('../../utils/twitch');

const VIDEO_PLAYER_SELECTOR = '.video-player .player';

function stepPlaybackSpeed(faster) {
    const currentPlayer = twitch.getCurrentPlayer();
    if (!currentPlayer || !currentPlayer.props.vodID) return;
    const rates = [ 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0 ];
    let idx = rates.indexOf(currentPlayer.player.getPlaybackRate());
    if (idx === -1) return;
    idx += faster ? 1 : -1;
    if (idx < 0 || idx >= rates.length) return;
    currentPlayer.player.setPlaybackRate(rates[idx]);
}

function handleKeyEvent(keypress) {
    if (keypress.ctrlKey || keypress.metaKey) return;
    if ($('input, textarea, select').is(':focus')) return;

    const $player = $(VIDEO_PLAYER_SELECTOR);
    if (!$player.length) return;

    switch (keypress.keyCode) {
        case keyCodes.KeyPress.LessThan:
        case keyCodes.KeyPress.Comma:
            stepPlaybackSpeed(false);
            break;
        case keyCodes.KeyPress.GreaterThan:
        case keyCodes.KeyPress.Period:
            stepPlaybackSpeed(true);
            break;
        case keyCodes.KeyPress.k:
            $player.find('.qa-pause-play-button').click();
            break;
        case keyCodes.KeyPress.f:
            $player.find('.qa-fullscreen-button').click();
            break;
        case keyCodes.KeyPress.m:
            $player.find('.qa-control-volume').click();
            break;
    }
}

let clicks = 0;
function handlePlayerClick() {
    clicks++;
    setTimeout(() => {
        if (clicks === 1) {
            const $player = $(VIDEO_PLAYER_SELECTOR);
            const isPaused = $player.data('paused');
            if (!isPaused) $player.find('.qa-pause-play-button').click();
        }
        clicks = 0;
    }, 250);
}

class VideoPlayerModule {
    constructor() {
        this.keybinds();
        watcher.on('load.player', () => this.clickToPause());
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
            description: 'Click on the twitch player to pause/resume playback'
        });
        settings.on('changed.hidePlayerExtensions', () => this.toggleHidePlayerExtensions());
        settings.on('changed.clickToPlay', () => this.clickToPause());
        this.toggleHidePlayerExtensions();
    }

    toggleHidePlayerExtensions() {
        $('body').toggleClass('bttv-hide-player-extensions', settings.get('hidePlayerExtensions'));
    }

    keybinds() {
        $(document).on('keypress.playerControls', handleKeyEvent);
    }

    clickToPause() {
        $(VIDEO_PLAYER_SELECTOR).off('click', '.player-overlay.player-fullscreen-overlay', handlePlayerClick);

        if (settings.get('clickToPlay') === true) {
            $(VIDEO_PLAYER_SELECTOR).on('click', '.player-overlay.player-fullscreen-overlay', handlePlayerClick);
        }
    }
}

module.exports = new VideoPlayerModule();
