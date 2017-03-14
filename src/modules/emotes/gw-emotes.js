const socketClientGW = require('../emotes_gamewisp/socket-client-gw');
const watcher = require('../../watcher');
const twitch = require('../../utils/twitch');

const AbstractEmotes = require('./abstract-emotes');
const Emote = require('./emote');
const provider = {
    id: 'gw',
    displayName: 'GameWisp Emotes',
    badge: 'https://d32y8axfzs6sv8.cloudfront.net/static/gamewisp_transparent_18px.png'
};

// let joinedChannel;

class GWEmotes extends AbstractEmotes {
    constructor() {
        super();

        socketClientGW.on('initialize_room', data => this.initializeRoom(data));
        socketClientGW.on('update_room', data => this.updateRoom(data));
        socketClientGW.on('leave_room', data => this.leaveRoom(data));
        socketClientGW.on('remove_emote', data => this.removeEmote(data));
        socketClientGW.on('add_emote', data => this.addEmote(data));
        socketClientGW.on('new_subscriber', data => this.newSubscriber(data));
        socketClientGW.on('cancel_subscriber', data => this.cancelSubscriber(data));

        watcher.on('load.chat', () => this.joinRoom());
    }

    get provider() {
        return provider;
    }

    getEmotes(user) {
        if (!user) return [];

        const emotes = this.emotes.get(user.name);
        if (!emotes) return [];

        return [...emotes.values()];
    }

    getEligibleEmote(code, user) {
        if (!user) return;

        const emotes = this.emotes.get(user.name);
        if (!emotes) return;

        return emotes.get(code);
    }


    joinRoom() {
        console.log('GW EMOTES: JOINING CHANNEL');

        const {name} = twitch.getCurrentChannel();

        socketClientGW.joinRoom(name);
    }

    initializeRoom(data) {
        console.log('initializeRoom called from gw-emotes', data);

        let emotes = data.emotes ? data.emotes : [];

        emotes = emotes.map(gwEmote => {
            return new Emote({
                id: gwEmote.id,
                provider: this.provider,
                channel: gwEmote.channel,
                code: gwEmote.code,
                images: {
                    '1x': gwEmote.url,
                },
                imgType: 'png'
            });
        });

        for (const username in data.userStore) {
            if (data.userStore.hasOwnProperty(username)) {
                let userEmotes = this.emotes.get(name);
                if (!userEmotes) {
                    userEmotes = new Map();
                    this.emotes.set(username, userEmotes);
                }

                const emoteIDsSet = new Set(data.userStore[username]);

                emotes.forEach( e => {
                    if (emoteIDsSet.has(e.id)) {
                        userEmotes.set(e.code, e);
                    }
                });
            }
        }

        console.log('this.emotes', this.emotes);
    }

    updateRoom(data) {
        console.log('updateRoom called from gw-emotes', data);

        let newEmotes = data.emotes;
        const newUser = data.user;

        newEmotes = newEmotes.map(gwEmote => {
            return new Emote({
                id: gwEmote.id,
                provider: this.provider,
                channel: gwEmote.channel,
                code: gwEmote.code,
                images: {
                    '1x': gwEmote.url,
                },
                imgType: 'png'
            });
        });

        let userEmotes = this.emotes.get(newUser.name);
        if (!userEmotes) {
            userEmotes = new Map();
            this.emotes.set(newUser.name, userEmotes);
        }

        const userEmoteIDsSet = new Set(newUser.emoteIDs);

        newEmotes.forEach( e => {
            if (userEmoteIDsSet.has(e.id)) {
                userEmotes.set(e.code, e);
            }
        });

        console.log('this.emotes', this.emotes);
    }

    leaveRoom(data) {
        console.log('leaveRoom called from gw-emotes', data);

        const username = data.user;

        if (this.emotes.get(username)) {
            this.emotes.delete(username);
        }

        console.log('this.emotes', this.emotes);
    }

    removeEmote(data) {
        console.log('removeEmote called from gw-emotes', data);

        const code = data.emoteCode;
        const emotes = [...this.emotes.values()];

        emotes.forEach(emoteMap => {
            emoteMap.delete(code);
        });

        console.log('this.emotes', this.emotes);
    }

    addEmote(data) {
        console.log('addEmote called from gw-emotes', data);

        const emote = new Emote({
            id: data.emote.id,
            provider: this.provider,
            channel: data.emote.channel,
            code: data.emote.code,
            images: {
                '1x': data.emote.url,
            },
            imgType: 'png'
        });

        let userEmotes;

        data.emoteUsers.forEach(user => {
            if (this.emotes.has(user)) {
                userEmotes = this.emotes.get(user);
            } else {
                userEmotes = new Map();
                this.emotes.set(user, userEmotes);
            }

            userEmotes.set(emote.code, emote);
        });

        console.log('this.emotes', this.emotes);
    }

    newSubscriber(data) {
        console.log('newSubscriber called from gw-emotes', data);

        const newSub = data.user;
        let userEmotes;

        if (this.emotes.has(newSub)) {
            userEmotes = this.emotes.get(newSub);
        } else {
            userEmotes = new Map();
            this.emotes.set(newSub, userEmotes);
        }

        data.emotes.forEach(gwEmote => {
            userEmotes.set(gwEmote.code, new Emote({
                id: gwEmote.id,
                provider: this.provider,
                channel: gwEmote.channel,
                code: gwEmote.code,
                images: {
                    '1x': gwEmote.url,
                },
                imgType: 'png'
            }));
        });

        console.log('this.emotes', this.emotes);
    }

    cancelSubscriber(data) {
        console.log('cancelSubscriber called from gw-emotes', data);

        if (!this.emotes.has(data.user)) return;

        const emoteIDsToRemove = new Set(data.emoteIDs);
        const userEmotes = this.emotes.get(data.user);

        userEmotes.forEach(emote => {
            if (emoteIDsToRemove.has(emote.id)) {
                userEmotes.delete(emote.code);
            }
        });

        console.log('this.emotes', this.emotes);
    }
}

module.exports = new GWEmotes();
