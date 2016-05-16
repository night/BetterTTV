exports.__rooms = {};
exports.__messageQueue = [];
exports.__reportedErrors = [];
exports.__subscriptions = {};
exports.__unbannedUsers = [];
exports.__channelBots = [];
exports.__badgeTypes = {};
exports.__badges = {};
exports.displayNames = {};
exports.trackTimeouts = {};
exports.chatters = {};
exports.spammers = [];
exports.tabCompleteHistory = [];
exports.suggestions = {
    matchList: [],
    lastMatch: ''
};
exports.chatHistory = [];
exports.whisperHistory = {};
exports.bttvEmotes = {};
exports.proEmotes = {};
exports.autoCompleteEmotes = {};

// as these aren't objects, they can't be local variables (otherwise we wouldn't be able to modify them from outside)
exports.__messageTimer = false;
exports.currentRoom = '';
exports.activeView = true;
