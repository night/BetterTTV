const $ = require('jquery');
const watcher = require('../../watcher');
const keyCodes = require('../../utils/keycodes');
const twitch = require('../../utils/twitch');
const settings = require('../../settings');

const CHAT_ROOM_SELECTOR = 'section[data-test-selector="chat-room-component-layout"]';
const CHAT_LINE_SELECTOR = '.chat-line__message';
const CHAT_LINE_USERNAME_SELECTOR = `${CHAT_LINE_SELECTOR} .chat-line__username`;
const CUSTOM_TIMEOUT_ID = 'bttv-custom-timeout-contain';
const CUSTOM_TIMEOUT_TEMPLATE = `
    <div id="${CUSTOM_TIMEOUT_ID}">
        <div class="text"></div>
        <svg xmlns="http://www.w3.org/2000/svg" width="81" height="223">
          <g fill="none" fill-rule="evenodd">
            <path fill="#000" fill-opacity=".304" fill-rule="nonzero" d="M.5 0h80v20H.5zM.5 180h80v20H.5zM0 203h80v20H0z"/>
            <path stroke="#ACACAC" stroke-opacity=".3" d="M80.5 19.805C64.51 51.825 70.65 154.184.5 180"/>
            <path fill="#FFF" fill-rule="nonzero" d="M18.773 218v-10.84h3.603c1.074 0 1.942.12 2.604.359.662.24 1.234.645 1.718 1.216.766.908 1.15 2.104 1.15 3.589 0 1.801-.477 3.198-1.429 4.19-.952.99-2.292 1.486-4.02 1.486h-3.626zm1.538-1.15h1.97c1.406 0 2.402-.378 2.988-1.135.63-.806.945-1.887.945-3.245 0-1.274-.31-2.275-.93-3.003a2.863 2.863 0 0 0-1.348-.912c-.522-.163-1.308-.245-2.358-.245H20.31v8.54zm15.571.894c-.967.293-1.794.44-2.483.44-1.172 0-2.128-.39-2.867-1.17-.74-.778-1.11-1.787-1.11-3.028 0-1.206.326-2.194.978-2.966.652-.771 1.485-1.157 2.501-1.157.962 0 1.705.342 2.23 1.025.525.684.788 1.655.788 2.915l-.008.447h-5.017c.21 1.89 1.136 2.834 2.776 2.834.6 0 1.338-.16 2.212-.483v1.143zm-4.922-4.578h3.509c0-1.48-.552-2.22-1.656-2.22-1.108 0-1.726.74-1.853 2.22zM38.41 218v-11.565h1.443V218h-1.443zm10.166-.256c-.967.293-1.794.44-2.483.44-1.172 0-2.128-.39-2.867-1.17-.74-.778-1.11-1.787-1.11-3.028 0-1.206.326-2.194.978-2.966.652-.771 1.485-1.157 2.501-1.157.962 0 1.705.342 2.23 1.025.525.684.788 1.655.788 2.915l-.008.447h-5.017c.21 1.89 1.135 2.834 2.776 2.834.6 0 1.338-.16 2.212-.483v1.143zm-4.922-4.578h3.508c0-1.48-.551-2.22-1.655-2.22-1.108 0-1.726.74-1.853 2.22zm9.837 5.017c-.733 0-1.304-.21-1.714-.63-.41-.42-.616-1.003-.616-1.75v-4.673h-.996v-1.084h.996v-1.443l1.443-.14v1.583h2.08v1.084h-2.08v4.41c0 1.04.45 1.56 1.348 1.56.19 0 .422-.033.696-.096V218c-.445.122-.83.183-1.157.183zm9.052-.44c-.967.294-1.794.44-2.483.44-1.172 0-2.127-.39-2.867-1.168-.74-.779-1.11-1.788-1.11-3.029 0-1.206.326-2.194.978-2.966.652-.771 1.486-1.157 2.501-1.157.962 0 1.706.342 2.23 1.025.525.684.788 1.655.788 2.915l-.007.447h-5.018c.21 1.89 1.136 2.834 2.776 2.834.6 0 1.338-.16 2.212-.483v1.143zm-4.922-4.577h3.509c0-1.48-.552-2.22-1.656-2.22-1.108 0-1.726.74-1.853 2.22zM26.756 186.292c0 .483-.084.931-.253 1.344a3.22 3.22 0 0 1-.706 1.073c-.376.376-.82.658-1.333.846-.513.188-1.16.282-1.941.282h-1.45v4.065h-1.45v-10.906h2.958c.655 0 1.209.055 1.663.165.454.11.857.282 1.208.516.415.279.736.625.964 1.04.227.415.34.94.34 1.575zm-1.509.037c0-.376-.066-.704-.197-.982a1.645 1.645 0 0 0-.601-.681 2.42 2.42 0 0 0-.802-.326c-.3-.066-.68-.099-1.139-.099h-1.435v4.358h1.223c.586 0 1.062-.052 1.428-.157.366-.105.664-.273.893-.502.23-.234.392-.481.487-.74a2.51 2.51 0 0 0 .143-.871zm10.093 7.573h-1.377v-.908a6.705 6.705 0 0 1-1.333.842 3.326 3.326 0 0 1-1.406.293c-.86 0-1.528-.263-2.007-.787-.478-.525-.718-1.296-.718-2.311v-5.31h1.377v4.658c0 .415.02.77.059 1.066.039.295.122.548.249.758.132.214.303.37.513.468.21.098.515.147.915.147.357 0 .746-.093 1.168-.278a5.455 5.455 0 0 0 1.183-.71v-6.11h1.377v8.182zm7.815-6.68h-.073a5.045 5.045 0 0 0-1.282-.139c-.425 0-.835.094-1.23.282-.396.188-.777.43-1.143.729v5.808H38.05v-8.181h1.377v1.208c.547-.44 1.03-.75 1.447-.934a3.153 3.153 0 0 1 1.278-.274c.239 0 .412.006.52.018.107.012.268.035.483.07v1.413zm7.932 5.75c0 1.386-.315 2.404-.945 3.054-.63.65-1.599.974-2.907.974-.435 0-.859-.03-1.271-.092a9.846 9.846 0 0 1-1.22-.26v-1.406h.074c.224.088.58.197 1.069.326.488.13.977.194 1.465.194.469 0 .857-.056 1.164-.168.308-.113.547-.269.718-.469.171-.19.293-.42.366-.688.074-.269.11-.57.11-.901v-.747c-.415.332-.812.58-1.19.743-.378.164-.86.245-1.447.245-.976 0-1.751-.352-2.325-1.058-.574-.706-.86-1.7-.86-2.985 0-.703.098-1.31.296-1.82.198-.51.468-.95.81-1.322a3.29 3.29 0 0 1 1.157-.809c.454-.193.905-.29 1.355-.29.473 0 .87.048 1.19.143.32.096.658.241 1.014.436l.088-.351h1.29v7.25zm-1.377-1.319v-4.46a5.333 5.333 0 0 0-1.022-.355 4.28 4.28 0 0 0-.94-.107c-.758 0-1.353.254-1.788.762-.434.508-.652 1.245-.652 2.212 0 .918.161 1.614.484 2.087.322.474.857.71 1.604.71.4 0 .802-.076 1.205-.23a4.37 4.37 0 0 0 1.11-.619zm10.935-1.699h-6.028c0 .503.076.941.227 1.315.152.373.36.68.623.919.254.234.555.41.905.527.349.118.733.176 1.153.176a4.56 4.56 0 0 0 1.681-.333c.564-.222.966-.44 1.205-.656h.073v1.502a11.36 11.36 0 0 1-1.42.49 5.765 5.765 0 0 1-1.524.198c-1.358 0-2.417-.367-3.179-1.102-.762-.735-1.142-1.779-1.142-3.131 0-1.338.364-2.4 1.094-3.186.73-.786 1.691-1.18 2.883-1.18 1.103 0 1.954.323 2.552.967.598.645.897 1.56.897 2.747v.747zm-1.34-1.055c-.005-.722-.187-1.281-.546-1.677-.359-.395-.904-.593-1.637-.593-.737 0-1.324.217-1.761.652-.437.434-.685.974-.744 1.618h4.688zM35.065 11.985c0 .542-.102 1.02-.307 1.435a2.9 2.9 0 0 1-.828 1.026c-.41.322-.86.552-1.351.688-.49.137-1.115.205-1.871.205H26.84V4.434h3.23c.796 0 1.392.029 1.787.087.396.06.774.181 1.136.367.4.21.69.48.871.809.18.33.271.724.271 1.183 0 .517-.132.958-.395 1.322a2.847 2.847 0 0 1-1.055.875v.059c.737.151 1.318.475 1.743.97.425.496.637 1.122.637 1.879zM32.626 7.07c0-.263-.043-.486-.131-.666a1.02 1.02 0 0 0-.425-.44 2.06 2.06 0 0 0-.835-.245 12.934 12.934 0 0 0-1.216-.048h-1.728v3.15h1.875c.454 0 .815-.023 1.084-.07.268-.046.517-.143.747-.29.23-.146.391-.335.487-.567.095-.232.142-.506.142-.824zm.93 4.973c0-.439-.065-.788-.197-1.047-.132-.259-.371-.478-.718-.66a2.407 2.407 0 0 0-.853-.237 11.454 11.454 0 0 0-1.22-.055h-2.277v4.058h1.918c.635 0 1.155-.033 1.56-.1.406-.065.738-.186.997-.362a1.84 1.84 0 0 0 .6-.652c.127-.244.19-.559.19-.945zm9.815 3.296h-1.37v-.871a25.28 25.28 0 0 0-.494.348 4.094 4.094 0 0 1-1.395.637 4.284 4.284 0 0 1-1.048.113c-.737 0-1.362-.244-1.875-.732-.512-.488-.769-1.11-.769-1.868 0-.62.133-1.122.4-1.505.266-.383.645-.685 1.138-.904.499-.22 1.097-.369 1.795-.447A36.096 36.096 0 0 1 42 9.934v-.212c0-.313-.054-.572-.164-.777a1.2 1.2 0 0 0-.473-.483 1.954 1.954 0 0 0-.703-.227 6.057 6.057 0 0 0-.857-.059c-.361 0-.764.048-1.208.143a9.395 9.395 0 0 0-1.377.414h-.073V7.334c.268-.073.656-.154 1.164-.242a8.793 8.793 0 0 1 1.502-.132c.576 0 1.077.048 1.505.143.427.095.797.258 1.11.487.307.225.541.515.702.872.162.356.242.798.242 1.326v5.551zm-1.37-2.014v-2.278c-.42.025-.914.061-1.483.11-.569.05-1.019.12-1.351.213-.396.112-.715.286-.96.523-.244.237-.366.563-.366.978 0 .469.142.822.425 1.058.283.237.715.356 1.297.356a3.08 3.08 0 0 0 1.325-.282 5.97 5.97 0 0 0 1.113-.678zm10.862 2.014h-1.377v-4.658a8.02 8.02 0 0 0-.066-1.058c-.044-.33-.124-.587-.241-.773a1.114 1.114 0 0 0-.528-.458c-.23-.1-.527-.15-.893-.15a2.86 2.86 0 0 0-1.18.279c-.41.185-.803.422-1.179.71v6.108h-1.377V7.16H47.4v.907c.43-.356.874-.634 1.333-.835.46-.2.93-.3 1.414-.3.884 0 1.558.266 2.021.798.464.533.696 1.3.696 2.3v5.31z"/>
          </g>
        </svg>
        <div class="cursor"></div>
    </div>
`;
const ActionTypes = {
    CANCEL: 'cancel',
    TIMEOUT: 'timeout',
    BAN: 'ban',
    DELETE: 'delete'
};

let action;
let user;

function setReason(type) {
    const reason = prompt(`Enter ${type} reason: (leave blank for none)`);
    return reason || '';
}

function handleTimeoutClick(e, messageId) {
    const $customTimeout = $(`#${CUSTOM_TIMEOUT_ID}`);
    if (!$customTimeout.length || e.which === keyCodes.DOMVKCancel) return;

    if ($customTimeout.is(':hover')) {
        let command;
        let duration;
        if (action.type === ActionTypes.BAN) {
            command = '/ban';
        } else if (action.type === ActionTypes.TIMEOUT) {
            command = '/timeout';
            duration = action.length;
        } else if (action.type === ActionTypes.DELETE) {
            twitch.sendChatMessage(`/delete ${messageId}`);
        }
        if (command && user) {
            const reason = e.shiftKey ? setReason(action.type) : '';
            twitch.sendChatMessage(`${command} ${user}${duration ? ` ${duration}` : ''}${reason ? ` ${reason}` : ''}`);
        }
    }

    $customTimeout.remove();
}

function handleMouseMove(e) {
    const $customTimeout = $(`#${CUSTOM_TIMEOUT_ID}`);
    if (!$customTimeout.length) return;

    const offset = e.pageY - $customTimeout.offset().top;
    const offsetx = e.pageX - $customTimeout.offset().left;
    const amount = 224 - offset;
    const time = Math.floor(Math.pow(1.5, (amount - 45) / 6.5) * 60);

    let humanTime;
    if (Math.floor(time / 60 / 60 / 24) > 0) {
        humanTime = `${Math.floor(time / 60 / 60 / 24)} Days`;
    } else if (Math.floor(time / 60 / 60) > 0) {
        humanTime = `${Math.floor(time / 60 / 60)} Hours`;
    } else {
        humanTime = `${Math.floor(time / 60)} Minutes`;
    }

    if (amount > 224 || amount < 0 || offsetx > 83 || offsetx < 0) {
        action = {
            type: ActionTypes.CANCEL,
            length: 0,
            text: 'CANCEL'
        };
    } else if (amount > 45 && amount < 204) {
        action = {
            type: ActionTypes.TIMEOUT,
            length: time,
            text: humanTime
        };
    } else if (amount >= 204 && amount <= 224) {
        action = {
            type: ActionTypes.BAN,
            length: 0,
            text: 'BAN'
        };
    } else if (amount > 22 && amount <= 45) {
        action = {
            type: ActionTypes.TIMEOUT,
            length: 1,
            text: 'PURGE'
        };
    } else if (amount > 0 && amount <= 22) {
        action = {
            type: ActionTypes.DELETE,
            length: 0,
            text: 'DELETE'
        };
    }

    $customTimeout.find('.text').text(action.text);
    $customTimeout.find('.cursor').css('top', offset);
}

function openCustomTimeout($target, messageId) {
    if ($(`#${CUSTOM_TIMEOUT_ID}`).length) return;

    const $chat = $(CHAT_ROOM_SELECTOR);
    $('body').append(CUSTOM_TIMEOUT_TEMPLATE);

    const $customTimeout = $(`#${CUSTOM_TIMEOUT_ID}`);

    $customTimeout.css({
        top: $target.offset().top + ($target.height() / 2) - ($customTimeout.height() / 2),
        left: $chat.offset().left - $customTimeout.width() + $chat.width() - 20
    });

    action = {
        type: ActionTypes.CANCEL,
        length: 0,
        text: 'CANCEL'
    };

    $customTimeout.on('mousemove', handleMouseMove);
    $customTimeout.on('mousedown', e => handleTimeoutClick(e, messageId));
}

function handleClick(e) {
    if (!twitch.getCurrentUserIsModerator()) return;
    e.preventDefault();

    const $chatLine = $(e.currentTarget).closest(CHAT_LINE_SELECTOR);
    const msgObject = twitch.getChatMessageObject($chatLine[0]);
    if (!msgObject) return;
    user = msgObject.user.userLogin;
    openCustomTimeout($(e.currentTarget), msgObject.id);
}

class ChatCustomTimeoutsModule {
    constructor() {
        settings.add({
            id: 'chatCustomTimeouts',
            name: 'Chat Custom Timeouts',
            defaultValue: true,
            description: 'Enables a right click timeout slider for chat moderators'
        });

        settings.on('changed.chatCustomTimeouts', () => this.loadClickHandler());
        watcher.on('load.chat', () => this.loadClickHandler());
    }

    loadClickHandler() {
        if (settings.get('chatCustomTimeouts') === false) {
            $(CHAT_ROOM_SELECTOR)
                .off('contextmenu', CHAT_LINE_USERNAME_SELECTOR, handleClick)
                .off('click', handleTimeoutClick);

            return;
        }

        $(CHAT_ROOM_SELECTOR)
            .off('contextmenu', CHAT_LINE_USERNAME_SELECTOR, handleClick)
            .on('contextmenu', CHAT_LINE_USERNAME_SELECTOR, handleClick)
            .off('click', handleTimeoutClick)
            .on('click', handleTimeoutClick);
    }
}

module.exports = new ChatCustomTimeoutsModule();
