import watcher from '../../watcher';
import api from '../../utils/api';
import twitch from '../../utils/twitch';
import settings from '../../settings';

import AbstractEmotes from '../emotes/abstract-emotes';
import Emote from '../emotes/emote';

const provider = {
    id: 'ffz-channel',
    displayName: 'FrankerFaceZ Channel Emotes'
};

class FrankerFaceZChannelEmotes extends AbstractEmotes {
    constructor() {
        super();

        watcher.on('channel.updated', () => this.updateChannelEmotes());
    }

    get provider() {
        return provider;
    }

    updateChannelEmotes() {
        this.emotes.clear();

        if (!settings.get('ffzEmotes')) return;

        const currentChannel = twitch.getCurrentChannel();
        if (!currentChannel) return;

        api
            .get(`cached/frankerfacez/users/twitch/${currentChannel.id}`)
            .then(emotes =>
                emotes.forEach(({id, user, code, images, imageType}) => {
                    this.emotes.set(code, new Emote({
                        id,
                        provider: this.provider,
                        channel: user,
                        code,
                        images,
                        imageType
                    }));
                })
            )
            .then(() => watcher.emit('emotes.updated'));
    }
}

export default new FrankerFaceZChannelEmotes();
