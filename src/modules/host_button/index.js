const $ = require('jquery');
const settings = require('../../settings');
const watcher = require('../../watcher');
const twitch = require('../../utils/twitch');
const tmiApi = require('../../utils/tmi-api');
const domObserver = require('../../observers/dom');

const SHARE_BUTTON_SELECTOR = 'button[data-a-target="share-button"]';
const HOST_BUTTON_ID = 'bttv-host-button';

let $hostButton;
let hosting = false;
let currentChannelId;
let removeShareButtonListener;

const buttonTemplate = `
    <div>
        <button id="${HOST_BUTTON_ID}" class="tw-button tw-button--secondary">
            <span class="tw-button__text">Host This Channel</span>
        </button>
    </div>
`;

class HostButtonModule {
    constructor() {
        settings.add({
            id: 'hostButton',
            name: 'Host Button',
            defaultValue: false,
            description: 'Adds a Host/Unhost button below the video player'
        });
        settings.on('changed.hostButton', value => value === true ? this.load() : this.unload());
        watcher.on('load.chat', () => this.load());
        watcher.on('load.channel', () => this.load());
    }

    load() {
        if (settings.get('hostButton') === false) return;

        const currentUser = twitch.getCurrentUser();
        if (!currentUser) return;

        const currentChannel = twitch.getCurrentChannel();
        const channelId = currentChannel && currentChannel.id;
        if (!channelId || currentUser.id === channelId || currentChannelId === channelId) return;
        currentChannelId = channelId;

        if (!$hostButton) {
            $hostButton = $(buttonTemplate);
            $hostButton.find('button').click(() => this.toggleHost());
        }
        removeShareButtonListener = domObserver.on('.tw-button-icon', (node, isConnected) => {
            if (!isConnected || node.getAttribute('data-a-target') !== 'share-button') return;
            this.embedHostButton();
        });
        this.updateHostingState(currentUser.id, channelId);
    }

    embedHostButton() {
        if ($(`#${HOST_BUTTON_ID}`).length) return;
        const $shareButton = $(SHARE_BUTTON_SELECTOR).closest('[data-toggle-balloon-id]').parent('.tw-mg-r-1');
        if (!$shareButton.length) return;
        $hostButton.toggleClass('tw-mg-r-1', $shareButton.hasClass('tw-mg-r-1'));
        $hostButton.insertBefore($shareButton);
    }

    toggleHost() {
        const currentUser = twitch.getCurrentUser();
        if (!currentUser) return;

        const command = hosting ? 'unhost' : 'host';
        try {
            const channelName = twitch.getCurrentChannel().name;
            const rawMessage = `PRIVMSG #${currentUser.name} :/${command === 'host' ? `${command} ${channelName}` : command}`;
            twitch.getChatServiceSocket().send(rawMessage);
            hosting = !hosting;
            this.updateHostButtonText();
            twitch.sendChatAdminMessage(`BetterTTV: We sent a /${command} to your channel.`);
        } catch (e) {
            twitch.sendChatAdminMessage(`
                BetterTTV: There was an error ${command}ing the channel.
                You may need to ${command} it from your channel.
            `);
        }
    }

    updateHostingState(userId, channelId) {
        return tmiApi.get('hosts', {qs: {host: userId}})
            .then(({hosts}) => {
                if (!Array.isArray(hosts) || !hosts.length) return;
                const host = hosts[0];
                if (!host || !host.target_id) return;
                hosting = host.target_id.toString() === channelId;
                this.updateHostButtonText();
            });
    }

    updateHostButtonText() {
        const text = hosting ? 'Unhost Channel' : 'Host This Channel';
        $hostButton.find('span').text(text);
    }

    unload() {
        removeShareButtonListener && removeShareButtonListener();
        $hostButton && $hostButton.remove();
    }
}

module.exports = new HostButtonModule();
