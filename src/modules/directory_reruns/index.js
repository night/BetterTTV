const settings = require('../../settings');
const watcher = require('../../watcher');
const debug = require('../../utils/debug');
const $ = require('jquery');

const RERUN_BADGE_SELECTOR = '.stream-type-indicator--rerun';
const CHANNEL_PLACEHOLDER_SELECTOR = '.tw-tower__placeholder';
const RERUNS_SELECTOR = '#bttv-reruns';
const CHANNEL_CARD_SELECTOR = '.live-channel-card';
const FOLLOWING_LIVE_CHANNEL_HEADER_SELECTOR = '[data-a-target="live-channels-header"]';

const bannedWords = ['rerun', 'rebroadcast', 'vodcast'];

class DirectoryLiveSortRerun {
    constructor() {
        settings.add({
            id: 'showRerunsCategory',
            name: 'Show Reruns Category',
            defaultValue: false,
            description:
                'Move Reruns into their own category on Directory Following'
        });
        watcher.on('load.directory.following', () => this.load());
        watcher.on('load.directory.live', () => this.load());
    }

    load() {
        if (!settings.get('showRerunsCategory')) return;

        let rerunsList = $('');

        const $liveChannelsHeader = $(FOLLOWING_LIVE_CHANNEL_HEADER_SELECTOR).parent();
        const $liveChannelsContainer = $liveChannelsHeader.parent();

        $liveChannelsContainer.find(CHANNEL_CARD_SELECTOR).each((index, el) => {
            const $channel = $(el).parent();
            const hasRerunBadge = $channel.find(RERUN_BADGE_SELECTOR).length;

            if (hasRerunBadge) {
                debug.log(`Moving channel index ${index} because of rerun badge`);
                rerunsList = rerunsList.add($channel.detach());
            } else {
                const title = String($channel.find('a.tw-link > h3').attr('title'));
                const hasBannedWord = bannedWords.some(word => title.toLocaleLowerCase().includes(word));

                if (hasBannedWord) {
                    debug.log(`Moving channel index ${index} due to title '${title}'`);
                    rerunsList = rerunsList.add($channel.detach());
                }
            }
        });

        if (rerunsList.length && $liveChannelsContainer.length) {
            const placeholder = $(CHANNEL_PLACEHOLDER_SELECTOR).first();

            for (let i = 0; i < 4; i++) {
                rerunsList = rerunsList.add(placeholder.clone());
            }

            $liveChannelsContainer.after(
                `<div>
                  <div class="tw-mg-b-2"><h4 class="tw-c-text-base tw-strong">Reruns</h4></div>
                  <div id="bttv-reruns" class="tw-flex-wrap tw-tower tw-tower--300 tw-tower--gutter-sm"></div>
                </div>`
            );

            $(RERUNS_SELECTOR).append(rerunsList);
        }
    }
}

module.exports = new DirectoryLiveSortRerun();
