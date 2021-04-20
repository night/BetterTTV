const $ = require('jquery');
const twitch = require('../../utils/twitch');
const debug = require('../../utils/debug');
const settings = require('../../settings');
const watcher = require('../../watcher');
const domObserver = require('../../observers/dom');

const COMMUNITY_HIGHLIGHT_SELECTOR = '.community-highlight-stack__card';

let autoLeaveRaidListener;

function handleLeaveRaid(node, isConnected) {
    if (!isConnected) return;
    const $node = $(node);
    const raidBanner = $node.find('[data-test-selector="raid-banner"]');
    if (raidBanner.length > 0) {
        const raidContext = twitch.getChannelRaidContext(raidBanner.get(0));

        if (raidContext && raidContext.hasJoined) {
            raidBanner.find('button').click();
        } else {
            debug.log("Couldn't find raidContext - autoLeaveRaid module");
        }
    }
}

class AutoLeaveRaid {
    constructor() {
        settings.add({
            id: 'autoLeaveRaid',
            name: 'Leave Raids Automatically',
            defaultValue: false,
            description: 'Disable auto-joining a raid',
        });

        watcher.on('load.chat', this.toggleAutoLeaveRaids);
        settings.on('changed.autoLeaveRaid', this.toggleAutoLeaveRaids);
    }

    toggleAutoLeaveRaids() {
        if (settings.get('autoLeaveRaid')) {
            if (autoLeaveRaidListener) return;

            autoLeaveRaidListener = domObserver.on(COMMUNITY_HIGHLIGHT_SELECTOR, handleLeaveRaid);
            return;
        }

        if (!autoLeaveRaidListener) return;

        domObserver.off(COMMUNITY_HIGHLIGHT_SELECTOR, handleLeaveRaid);
        autoLeaveRaidListener = undefined;
    }
}

module.exports = new AutoLeaveRaid();
