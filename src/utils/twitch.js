import $ from 'jquery';
import twitchAPI from './twitch-api.js';

const REACT_ROOT = '#root div';
const CHAT_CONTAINER = 'section[data-test-selector="chat-room-component-layout"]';
const VOD_CHAT_CONTAINER = '.qa-vod-chat';
const CHAT_LIST = '.chat-list,.chat-list--default,.chat-list--other';
const PLAYER = '.video-player__container';
const CLIPS_BROADCASTER_INFO = '.clips-broadcaster-info';
const CHAT_MESSAGE_SELECTOR = '.chat-line__message';
const SIDEBAR_CONTENTS = '.side-bar-contents';

const TMIActionTypes = {
  MESSAGE: 0,
  EXTENSION_MESSAGE: 1,
  MODERATION: 2,
  MODERATION_ACTION: 3,
  TARGETED_MODERATION_ACTION: 4,
  AUTO_MOD: 5,
  SUBSCRIBER_ONLY_MODE: 6,
  FOLLOWERS_ONLY_MODE: 7,
  SLOW_MODE: 8,
  EMOTE_ONLY_MODE: 9,
  R9K_MODE: 10,
  CONNECTED: 11,
  DISCONNECTED: 12,
  RECONNECT: 13,
  HOSTING: 14,
  UNHOST: 15,
  HOSTED: 16,
  SUBSCRIPTION: 17,
  RESUBSCRIPTION: 18,
  GIFT_PAID_UPGRADE: 19,
  ANON_GIFT_PAID_UPGRADE: 20,
  PRIME_PAID_UPGRADE: 21,
  PRIME_COMMUNITY_GIFT_RECEIVED_EVENT: 22,
  EXTEND_SUBSCRIPTION: 23,
  SUB_GIFT: 24,
  ANON_SUB_GIFT: 25,
  CLEAR_CHAT: 26,
  ROOM_MODS: 27,
  ROOM_STATE: 28,
  RAID: 29,
  UNRAID: 30,
  RITUAL: 31,
  NOTICE: 32,
  INFO: 33,
  BADGES_UPDATED: 34,
  PURCHASE: 35,
  BITS_CHARITY: 36,
  CRATE_GIFT: 37,
  REWARD_GIFT: 38,
  SUB_MYSTERY_GIFT: 39,
  ANON_SUB_MYSTERY_GIFT: 40,
  FIRST_CHEER_MESSAGE: 41,
  BITS_BADGE_TIER_MESSAGE: 42,
  INLINE_PRIVATE_CALLOUT: 43,
  CHANNEL_POINTS_AWARD: 44,
};

function getReactInstance(element) {
  for (const key in element) {
    if (key.startsWith('__reactInternalInstance$')) {
      return element[key];
    }
  }

  return null;
}

function searchReactParents(node, predicate, maxDepth = 15, depth = 0) {
  try {
    if (predicate(node)) {
      return node;
    }
  } catch (_) {}

  if (!node || depth > maxDepth) {
    return null;
  }

  const {return: parent} = node;
  if (parent) {
    return searchReactParents(parent, predicate, maxDepth, depth + 1);
  }

  return null;
}

function searchReactChildren(node, predicate, maxDepth = 15, depth = 0) {
  try {
    if (predicate(node)) {
      return node;
    }
  } catch (_) {}

  if (!node || depth > maxDepth) {
    return null;
  }

  const {child, sibling} = node;
  if (child || sibling) {
    return (
      searchReactChildren(child, predicate, maxDepth, depth + 1) ||
      searchReactChildren(sibling, predicate, maxDepth, depth + 1)
    );
  }

  return null;
}

let chatClient;
let currentUser;
let currentChannel;

export default {
  setCurrentUser(accessToken, id, name, displayName) {
    twitchAPI.setAccessToken(accessToken);

    currentUser = {
      id: id.toString(),
      name,
      displayName,
    };
  },

  updateCurrentChannel() {
    let rv;

    const clipsBroadcasterInfo = this.getClipsBroadcasterInfo();
    if (clipsBroadcasterInfo) {
      rv = {
        id: clipsBroadcasterInfo.id,
        name: clipsBroadcasterInfo.login,
        displayName: clipsBroadcasterInfo.displayName,
        avatar: clipsBroadcasterInfo.profileImageURL,
      };
    }

    const currentChat = this.getCurrentChat();
    if (currentChat && currentChat.props && currentChat.props.channelID) {
      const {channelID, channelLogin, channelDisplayName} = currentChat.props;
      rv = {
        id: channelID.toString(),
        name: channelLogin,
        displayName: channelDisplayName,
      };
    }

    const currentVodChat = this.getCurrentVodChat();
    if (currentVodChat && currentVodChat.props && currentVodChat.props.data && currentVodChat.props.data.video) {
      const {
        owner: {id, login},
      } = currentVodChat.props.data.video;
      rv = {
        id: id.toString(),
        name: login,
        displayName: login,
      };
    }

    currentChannel = rv;

    return rv;
  },

  TMIActionTypes,

  getReactInstance,

  getCurrentChannel() {
    return currentChannel;
  },

  getCurrentUser() {
    return currentUser;
  },

  getConnectStore() {
    let store;
    try {
      const node = searchReactChildren(
        getReactInstance($(REACT_ROOT)[0]),
        (n) => n.pendingProps && n.pendingProps.value && n.pendingProps.value.store
      );
      store = node.pendingProps.value.store;
    } catch (_) {}

    return store;
  },

  getRecommendedSidebar() {
    let recommendedSidebar;
    try {
      const node = searchReactChildren(
        getReactInstance($(SIDEBAR_CONTENTS)[0]),
        (n) =>
          n.stateNode &&
          n.stateNode.DOMNode &&
          n.stateNode.props &&
          n.stateNode.props.section &&
          n.stateNode.props.section.type === 'RECOMMENDED_SECTION',
        30
      );
      recommendedSidebar = node.stateNode.DOMNode;
    } catch (_) {}
    return recommendedSidebar;
  },

  getClipsBroadcasterInfo() {
    let broadcaster;
    try {
      const node = searchReactParents(
        getReactInstance($(CLIPS_BROADCASTER_INFO)[0]),
        (n) => n.stateNode && n.stateNode.props && n.stateNode.props.data && n.stateNode.props.data.clip
      );
      broadcaster = node.stateNode.props.data.clip.broadcaster;
    } catch (_) {}

    return broadcaster;
  },

  getCurrentPlayer() {
    let player;
    try {
      const node = searchReactParents(
        getReactInstance($(PLAYER)[0]),
        (n) => n.stateNode && (n.stateNode.player || n.stateNode.props.mediaPlayerInstance),
        30
      );
      player = node.stateNode.player ? node.stateNode.player.player : node.stateNode.props.mediaPlayerInstance;
    } catch (e) {}

    return player && player.core ? player.core : player;
  },

  getChatController() {
    let chatContentComponent;
    try {
      const node = searchReactParents(
        getReactInstance($(CHAT_CONTAINER)[0]),
        (n) =>
          n.stateNode && n.stateNode.props && n.stateNode.props.messageHandlerAPI && n.stateNode.props.chatConnectionAPI
      );
      chatContentComponent = node.stateNode;
    } catch (_) {}

    return chatContentComponent;
  },

  getChatServiceClient() {
    if (chatClient) return chatClient;

    try {
      const node = searchReactChildren(
        getReactInstance($(REACT_ROOT)[0]),
        (n) => n.stateNode && n.stateNode.join && n.stateNode.client,
        1000
      );
      chatClient = node.stateNode.client;
    } catch (_) {}

    return chatClient;
  },

  getChatServiceSocket() {
    let socket;
    try {
      socket = this.getChatServiceClient().connection.ws;
    } catch (_) {}
    return socket;
  },

  getChatBuffer() {
    let chatList;
    try {
      const node = searchReactParents(
        getReactInstance($(CHAT_LIST)[0]),
        (n) => n.stateNode && n.stateNode.props && n.stateNode.props.messageBufferAPI
      );
      chatList = node.stateNode;
    } catch (_) {}

    return chatList;
  },

  getChatScroller() {
    let chatScroller;
    try {
      const node = searchReactChildren(
        getReactInstance($(CHAT_LIST)[0]),
        (n) => n.stateNode && n.stateNode.props && n.stateNode.scrollRef
      );
      chatScroller = node.stateNode;
    } catch (_) {}

    return chatScroller;
  },

  getCurrentEmotes() {
    let currentEmotes;
    try {
      const node = searchReactParents(
        getReactInstance($(CHAT_CONTAINER)[0]),
        (n) =>
          n.stateNode &&
          n.stateNode.props &&
          n.stateNode.props.emoteSetsData &&
          n.stateNode.props.emoteSetsData.emoteMap
      );
      currentEmotes = node.stateNode.props.emoteSetsData.emoteMap;
    } catch (_) {}

    return currentEmotes;
  },

  getCurrentChat() {
    let currentChat;
    try {
      const node = searchReactParents(
        getReactInstance($(CHAT_CONTAINER)[0]),
        (n) => n.stateNode && n.stateNode.props && n.stateNode.props.onSendMessage
      );
      currentChat = node.stateNode;
    } catch (_) {}

    return currentChat;
  },

  getCurrentVodChat() {
    let currentVodChat;
    try {
      const node = searchReactParents(
        getReactInstance($(VOD_CHAT_CONTAINER)[0]),
        (n) => n.stateNode && n.stateNode.props && n.stateNode.props.data && n.stateNode.props.data.video
      );
      currentVodChat = node.stateNode;
    } catch (_) {}

    return currentVodChat;
  },

  sendChatAdminMessage(body) {
    const chatController = this.getChatController();
    if (!chatController) return;

    const id = Date.now();

    chatController.pushMessage({
      type: TMIActionTypes.NOTICE,
      id,
      msgid: id,
      message: body,
      channel: `#${chatController.props.channelLogin}`,
    });
  },

  sendChatMessage(message) {
    const currentChat = this.getCurrentChat();
    if (!currentChat) return;
    currentChat.props.onSendMessage(message);
  },

  getCurrentUserIsModerator() {
    const currentChat = this.getCurrentChat();
    if (!currentChat) {
      return false;
    }
    return currentChat.props.isCurrentUserModerator;
  },

  getChatMessageObject(element) {
    let msgObject;
    try {
      msgObject = getReactInstance(element).return.stateNode.props.message;
    } catch (_) {}

    return msgObject;
  },

  getConversationMessageObject(element) {
    let msgObject;
    try {
      const node = searchReactParents(
        getReactInstance(element),
        (n) => n.stateNode && n.stateNode.props && n.stateNode.props.message
      );
      msgObject = node.stateNode.props.message;
    } catch (_) {}

    return msgObject;
  },

  getChatModeratorCardUser(element) {
    let user;
    try {
      const node = searchReactChildren(
        getReactInstance(element),
        (n) => n.stateNode && n.stateNode.props && n.stateNode.props.targetUserID && n.stateNode.props.targetLogin,
        20
      );
      const {props} = node.stateNode;
      user = {
        id: props.targetUserID,
        login: props.targetLogin,
        displayName: props.targetDisplayName || props.targetLogin,
      };
    } catch (_) {}

    if (!user) {
      try {
        const node = searchReactParents(
          getReactInstance(element),
          (n) =>
            n.stateNode &&
            n.stateNode.props &&
            n.stateNode.props.channelID &&
            n.stateNode.props.channelLogin &&
            n.stateNode.props.targetLogin &&
            n.stateNode.props.channelLogin === n.stateNode.props.targetLogin,
          20
        );
        const {props} = node.stateNode;
        user = {
          id: props.channelID,
          login: props.channelLogin,
          displayName: props.channelDisplayName || props.channelLogin,
        };
      } catch (_) {}
    }

    return user;
  },

  getUserIsModeratorFromTagsBadges(badges) {
    if (!badges) return false;
    badges = Array.isArray(badges) ? badges.map((b) => b.id) : Object.keys(badges);
    return (
      badges.includes('moderator') ||
      badges.includes('broadcaster') ||
      badges.includes('global_mod') ||
      badges.includes('admin') ||
      badges.includes('staff')
    );
  },

  getUserIsOwnerFromTagsBadges(badges) {
    if (!badges) return false;
    badges = Array.isArray(badges) ? badges.map((b) => b.id) : Object.keys(badges);
    return (
      badges.includes('broadcaster') ||
      badges.includes('global_mod') ||
      badges.includes('admin') ||
      badges.includes('staff')
    );
  },

  getCurrentUserIsOwner() {
    if (!currentUser || !currentChannel) return false;
    return currentUser.id === currentChannel.id;
  },

  setInputValue($inputField, msg, focus = false) {
    $inputField.val(msg);
    const inputField = $inputField[0];
    inputField.dispatchEvent(new Event('input', {bubbles: true}));
    const instance = getReactInstance(inputField);
    if (!instance) return;
    const props = instance.memoizedProps;
    if (props && props.onChange) {
      props.onChange({target: inputField});
    }
    if (focus) {
      $inputField.focus();
    }
  },

  getChatMessages(name = null) {
    let messages = Array.from($(CHAT_MESSAGE_SELECTOR))
      .reverse()
      .map((element) => ({
        element,
        message: this.getChatMessageObject(element),
        outerHTML: element.outerHTML,
      }));

    if (name) {
      messages = messages.filter(({message}) => message && message.user && message.user.userLogin === name);
    }

    return messages;
  },
};
