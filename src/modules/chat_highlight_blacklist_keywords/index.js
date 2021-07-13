import $ from 'jquery';
import dayjs from 'dayjs';
import watcher from '../../watcher.js';
import settings from '../../settings.js';
import storage from '../../storage.js';
import html from '../../utils/html.js';
import twitch from '../../utils/twitch.js';
import cdn from '../../utils/cdn.js';
import {escapeRegExp} from '../../utils/regex.js';
import globalBots from '../../utils/bots.js';

const PHRASE_REGEX = /\{.+?\}/g;
const USER_REGEX = /\(.+?\)/g;
const ROLE_REGEX = /\[.+?\]/g;
const REPEATING_SPACE_REGEX = /\s\s+/g;

const BLACKLIST_KEYWORD_PROMPT = `Type some blacklist keywords. Messages containing keywords will be filtered from your chat.

Use spaces in the field to specify multiple keywords. Place {} around a set of words to form a phrase, <> inside the {} to use exact search, [] around a single word to specifiy a role, and () around a single word to specify a username. Wildcards (*) are supported.`;
const HIGHLIGHT_KEYWORD_PROMPT = `Type some highlight keywords. Messages containing keywords will turn red to get your attention.

Use spaces in the field to specify multiple keywords. Place {} around a set of words to form a phrase, <> inside the {} to use exact search, [] around a single word to specifiy a role, and () around a single word to specify a username. Wildcards (*) are supported.`;

const CHAT_LIST_SELECTOR =
  '.chat-list .chat-scrollable-area__message-container,.chat-list--default .chat-scrollable-area__message-container,.chat-list--other .chat-scrollable-area__message-container';
const VOD_CHAT_FROM_SELECTOR = '.video-chat__message-author';
const VOD_CHAT_MESSAGE_SELECTOR = 'div[data-test-selector="comment-message-selector"]';
const VOD_CHAT_MESSAGE_EMOTE_SELECTOR = '.chat-line__message--emote';
const PINNED_HIGHLIGHT_ID = 'bttv-pinned-highlight';
const PINNED_CONTAINER_ID = 'bttv-pin-container';
const MAXIMUM_PIN_COUNT = 10;
const PINNED_HIGHLIGHT_TIMEOUT = 60 * 1000;

const pinnedHighlightTemplate = ({timestamp, from, message}) => `
  <div id="${PINNED_HIGHLIGHT_ID}">
    <span class="close">
      <svg class="svg-close" height="8px" version="1.1" viewBox="0 0 16 16" width="8px" x="0px" y="0px">
        <path clip-rule="evenodd" d="M13.657,3.757L9.414,8l4.243,4.242l-1.415,1.415L8,9.414l-4.243,4.243l-1.414-1.415L6.586,8L2.343,3.757l1.414-1.414L8,6.586l4.242-4.243L13.657,3.757z" fill-rule="evenodd"></path>
      </svg>
    </span>
    <span class="time">${timestamp}</span>
    <span class="display-name">${html.escape(from)}</span>
    <span class="message">${html.escape(message)}</span>
  </div>
`;

function defaultHighlightKeywords(value) {
  if (typeof value === 'string') return value;
  const currentUser = twitch.getCurrentUser();
  return currentUser ? currentUser.name : '';
}

function changeKeywords(promptBody, storageID) {
  let storageKeywords = storage.get(storageID);
  if (storageID === 'highlightKeywords') {
    storageKeywords = defaultHighlightKeywords(storageKeywords);
  }
  /* eslint-disable no-alert */
  let keywords = prompt(promptBody, storageKeywords || '');
  if (keywords !== null) {
    keywords = keywords.trim().replace(REPEATING_SPACE_REGEX, ' ');
    storage.set(storageID, keywords);
  }
}

function computeKeywords(keywords) {
  const computedKeywords = [];
  const computedUsers = [];
  const computedRoles = [];

  const phrases = keywords.match(PHRASE_REGEX);
  if (phrases) {
    phrases.forEach((phrase) => {
      keywords = keywords.replace(phrase, '');
      computedKeywords.push(phrase.slice(1, -1).trim());
    });
  }

  const users = keywords.match(USER_REGEX);
  if (users) {
    users.forEach((user) => {
      keywords = keywords.replace(user, '');
      computedUsers.push(user.slice(1, -1).trim());
    });
  }

  const roles = keywords.match(ROLE_REGEX);
  if (roles) {
    roles.forEach((role) => {
      keywords = keywords.replace(role, '');
      computedRoles.push(role.slice(1, -1).trim());
    });
  }

  keywords.split(' ').forEach((keyword) => {
    if (!keyword) return;
    computedKeywords.push(keyword);
  });

  return {
    computedKeywords,
    computedUsers,
    computedRoles,
  };
}

let loadTime = 0;
let blacklistKeywords = [];
let blacklistUsers = [];
let blacklistRoles = [];
function computeBlacklistKeywords() {
  let keywords = storage.get('blacklistKeywords');
  if (typeof keywords !== 'string') keywords = '';

  const {computedKeywords, computedUsers, computedRoles} = computeKeywords(keywords);
  blacklistKeywords = computedKeywords;
  blacklistUsers = computedUsers;
  blacklistRoles = computedRoles;
}

let highlightKeywords = [];
let highlightUsers = [];
let highlightRoles = [];
function computeHighlightKeywords() {
  const keywords = defaultHighlightKeywords(storage.get('highlightKeywords'));
  const {computedKeywords, computedUsers, computedRoles} = computeKeywords(keywords);
  highlightKeywords = computedKeywords;
  highlightUsers = computedUsers;
  highlightRoles = computedRoles;
}

function wildcard(keyword) {
  return keyword.replace(/\*/g, '[^ ]*');
}

function exactMatch(keyword) {
  return keyword.replace(/^<(.*)>$/g, '^$1$$');
}

function keywordRegEx(keyword) {
  return new RegExp(`(\\s|^|@)${keyword}([!.,:';?/]|\\s|$)`, 'i');
}

function fromContainsKeyword(keywords, from) {
  for (const user of keywords) {
    if (user.toLowerCase() !== from) continue;
    return true;
  }
  return false;
}

function fromContainsRole(keywords, from) {
  for (const role of keywords) {
    if (!from.includes(role)) continue;
    return true;
  }
  return false;
}

function messageContainsKeyword(keywords, from, message) {
  for (let keyword of keywords) {
    keyword = escapeRegExp(keyword);
    keyword = wildcard(keyword);
    keyword = exactMatch(keyword);

    const currentUser = twitch.getCurrentUser();
    const filterCurrentUser = (currentUser && from !== currentUser.name) || !currentUser;
    if (filterCurrentUser && keywordRegEx(keyword).test(message)) return true;
  }
  return false;
}

function isReply($message) {
  return $message.closest('.chat-input-tray__open').length > 0;
}

function messageTextFromAST(ast) {
  return ast
    .map((node) => {
      switch (node.type) {
        case 0: // Text
          return node.content.trim();
        case 3: // CurrentUserHighlight
          return node.content;
        case 4: // Mention
          return node.content.recipient;
        case 5: // Link
          return node.content.url;
        case 6: // Emote
          return node.content.alt;
        default:
          return '';
      }
    })
    .join(' ');
}

let $pinnedHighlightsContainer;
let channelBots = [];

class ChatHighlightBlacklistKeywordsModule {
  constructor() {
    watcher.on('load.chat', () => this.loadChat());
    watcher.on('load.vod', () => this.loadChat());
    watcher.on('channel.updated', ({bots}) => {
      channelBots = bots;
    });
    watcher.on('chat.message', ($message, messageObj) => this.onMessage($message, messageObj));
    watcher.on('vod.message', ($message) => this.onVODMessage($message));
    storage.on('changed.blacklistKeywords', computeBlacklistKeywords);
    storage.on('changed.highlightKeywords', computeHighlightKeywords);

    settings.add({
      id: 'pinnedHighlights',
      name: 'Pin Highlighted Messages',
      defaultValue: false,
      description: 'Pins your last ten highlighted messages above chat',
    });
    settings.on('changed.pinnedHighlights', (value) =>
      value === true ? this.loadPinnedHighlights() : this.unloadPinnedHighlights()
    );

    settings.add({
      id: 'timeoutHighlights',
      name: 'Timeout Pinned Highlights',
      defaultValue: false,
      description: 'Hides pinned highlights after 1 minute',
    });

    settings.add({
      id: 'highlightFeedback',
      name: 'Highlight/Whisper Notification',
      description: 'Plays a sound for messages directed at you',
      defaultValue: false,
    });

    this.sound = null;
    this.handleHighlightSound = this.handleHighlightSound.bind(this);
  }

  handleHighlightSound() {
    if (!this.sound) {
      this.sound = new Audio(cdn.url('assets/sounds/ts-tink.ogg'));
    }
    this.sound.pause();
    this.sound.currentTime = 0;
    this.sound.play();
  }

  loadChat() {
    computeBlacklistKeywords();
    computeHighlightKeywords();
    this.loadPinnedHighlights();
    loadTime = Date.now();
  }

  setBlacklistKeywords() {
    changeKeywords(BLACKLIST_KEYWORD_PROMPT, 'blacklistKeywords');
  }

  setHighlightKeywords() {
    changeKeywords(HIGHLIGHT_KEYWORD_PROMPT, 'highlightKeywords');
  }

  onMessage($message, {user, timestamp, messageParts, badges}) {
    const from = user.userLogin;
    const message = messageTextFromAST(messageParts);
    const date = new Date(timestamp);
    const fromBadges = Array.isArray(badges) ? badges.map((b) => b.id) : Object.keys(badges);

    if (
      globalBots.includes(from) ||
      (channelBots.includes(from) && Object.prototype.hasOwnProperty.call(badges, 'moderator'))
    ) {
      fromBadges.push('bot');
    }

    if (
      fromContainsKeyword(blacklistUsers, from) ||
      fromContainsRole(blacklistRoles, fromBadges) ||
      messageContainsKeyword(blacklistKeywords, from, message)
    ) {
      this.markBlacklisted($message);
      return;
    }

    if (
      fromContainsKeyword(highlightUsers, from) ||
      fromContainsRole(highlightRoles, fromBadges) ||
      messageContainsKeyword(highlightKeywords, from, message)
    ) {
      this.markHighlighted($message);

      if (isReply($message)) return;

      if (settings.get('highlightFeedback')) {
        this.handleHighlightSound();
      }
      if (timestamp > loadTime) this.pinHighlight({from, message, date});
    }
  }

  onVODMessage($message) {
    const $from = $message.find(VOD_CHAT_FROM_SELECTOR);
    const from = ($from.attr('href') || '').split('?')[0].split('/').pop();
    const $messageContent = $message.find(VOD_CHAT_MESSAGE_SELECTOR);
    const emotes = Array.from($messageContent.find(VOD_CHAT_MESSAGE_EMOTE_SELECTOR)).map((emote) =>
      emote.getAttribute('alt')
    );
    const messageContent = `${$messageContent.text().replace(/^:/, '')} ${emotes.join(' ')}`;

    if (fromContainsKeyword(blacklistUsers, from) || messageContainsKeyword(blacklistKeywords, from, messageContent)) {
      this.markBlacklisted($message);
      return;
    }

    if (fromContainsKeyword(highlightUsers, from) || messageContainsKeyword(highlightKeywords, from, messageContent)) {
      this.markHighlighted($message);
    }
  }

  markHighlighted($message) {
    $message.addClass('bttv-highlighted');
  }

  markBlacklisted($message) {
    $message.attr('style', 'display: none !important;');
  }

  loadPinnedHighlights() {
    if (settings.get('pinnedHighlights') === false || $(`#${PINNED_CONTAINER_ID}`).length) return;

    $pinnedHighlightsContainer = $(`<div id="${PINNED_CONTAINER_ID}" />`).appendTo($(CHAT_LIST_SELECTOR));
  }

  unloadPinnedHighlights() {
    if (!$pinnedHighlightsContainer) return false;
    $pinnedHighlightsContainer.remove();
    return true;
  }

  pinHighlight({from, message, date}) {
    if (settings.get('pinnedHighlights') === false || !$pinnedHighlightsContainer) return;

    if ($pinnedHighlightsContainer.children().length + 1 > MAXIMUM_PIN_COUNT) {
      $pinnedHighlightsContainer.children().first().remove();
    }

    const timestamp = dayjs(date).format('hh:mm');

    const $newHighlight = $(pinnedHighlightTemplate({timestamp, from, message}));

    $newHighlight.children('.close').on('click', () => $newHighlight.remove());

    $pinnedHighlightsContainer.append($newHighlight);

    if (settings.get('timeoutHighlights') === true) {
      setTimeout(() => $newHighlight.remove(), PINNED_HIGHLIGHT_TIMEOUT);
    }
  }
}

export default new ChatHighlightBlacklistKeywordsModule();
