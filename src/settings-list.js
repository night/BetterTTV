/** BTTV :
 * cssBlueButtons
 * handleTwitchChatEmotesScript
 */

var chat = bttv.chat, vars = bttv.vars;
var betaChat = require('./features/beta-chat'),
    channelReformat = require('./features/channel-reformat'),
    splitChat = require('./features/split-chat'),
    darkenPage = require('./features/darken-page'),
    handleBackground = require('./features/handle-background'),
    flipDashboard = require('./features/flip-dashboard'),
    cssLoader = require('./features/css-loader'),
    theatreMode = require('./features/auto-theatre-mode'),
    hostButton = require('./features/host-btn-below-video'),
    anonChat = require('./features/anon-chat');
var displayElement = require('./helpers/element').display,
    removeElement = require('./helpers/element').remove,
    imagePreview = require('./features/image-preview');

module.exports = [
    /*{
        name: 'Admin/Staff Alert',
        description: 'Get alerted in chat when admins or staff join',
        default: false,
        hidden: true,
        storageKey: 'adminStaffAlert'
    },*/
    {
        name: 'Anon Chat',
        description: 'Join channels without appearing in chat',
        default: false,
        storageKey: 'anonChat',
        toggle: function() {
            anonChat();
        },
        load: function() {
            anonChat();
        }
    },
    {
        name: 'Alpha Chat Badges',
        description: 'Removes the background from chat badges',
        default: false,
        storageKey: 'alphaTags'
    },
    {
        name: 'Automatic Theatre Mode',
        description: 'Automatically enables theatre mode',
        default: false,
        storageKey: 'autoTheatreMode'
    },
    {
        name: 'BetterTTV Chat',
        description: 'A tiny chat bar for personal messaging friends',
        default: false,
        storageKey: 'bttvChat',
        toggle: function(value) {
            if(value === true) {
                betaChat();
            } else {
                window.location.reload();
            }
        }
    },
    {
        name: 'BetterTTV Emotes',
        description: 'BetterTTV adds extra cool emotes for you to use',
        default: true,
        storageKey: 'bttvEmotes',
        toggle: function() {
            window.location.reload();
        }
    },
    {
        name: 'Blue Buttons',
        description: 'Blue is better than purple, so we make it an option.',
        default: false,
        storageKey: 'showBlueButtons',
        toggle: function(value) {
            if(value === true) {
                cssLoader.load("blue-buttons", "showBlueButtons");
            } else {
                cssLoader.unload("showBlueButtons");
            }
        },
        load: function() {
            cssLoader.load("blue-buttons", "showBlueButtons");
        }
    },
    {
        name: 'Chat Image Preview',
        description: 'Preview chat images on mouse over',
        default: true,
        storageKey: 'chatImagePreview',
        toggle: function (value) {
            if (value === true) {
                imagePreview.enablePreview();
            } else {
                imagePreview.disablePreview();
            }
        }
    },
    {
        name: 'DarkenTTV',
        description: 'A sleek, grey theme which will make you love the site even more',
        default: false,
        storageKey: 'darkenedMode',
        toggle: function(value) {
            if(value === true) {
                darkenPage();
                if (bttv.settings.get("splitChat") !== false) {
                    $("#splitChat").remove();
                    splitChat();
                }
            } else {
                $("#darkTwitch").remove();
                handleBackground();
                if (bttv.settings.get("splitChat") !== false) {
                    $("#splitChat").remove();
                    splitChat();
                }
            }
        },
        load: function() {
            var currentDarkStatus = false;

            if(!window.App || !App.__container__.lookup('controller:Layout')) return;
            App.__container__.lookup('controller:Layout').addObserver('isTheatreMode', function() {
                if(this.get('isTheatreMode') === true) {
                    currentDarkStatus = bttv.settings.get("darkenedMode");
                    if(currentDarkStatus === false) {
                        bttv.settings.save("darkenedMode", true);

                        // Toggles setting back without removing the darkened css
                        bttv.storage.put('bttv_darkenedMode', false);
                    }
                } else {
                    if(currentDarkStatus === false) bttv.settings.save("darkenedMode", false);
                }
            });
        }
    },
    {
        name: 'Default to Live Channels',
        description: 'BetterTTV can click on "Channels" for you in the Following Overview automatically',
        default: false,
        storageKey: 'showDirectoryLiveTab'
    },
    {
        name: 'Desktop Notifications',
        description: 'BetterTTV can send you desktop notifications when you are tabbed out of Twitch',
        default: false,
        storageKey: 'desktopNotifications',
        toggle: function(value) {
            if(value === true) {
                if(window.Notification) {
                    if (Notification.permission === 'default' || (window.webkitNotifications && webkitNotifications.checkPermission() === 1)) {
                        Notification.requestPermission(function () {
                            if (Notification.permission === 'granted' || (window.webkitNotifications && webkitNotifications.checkPermission() === 0)) {
                                bttv.settings.save("desktopNotifications", true);
                                bttv.notify("Desktop notifications are now enabled.");
                            } else {
                                bttv.notify("You denied BetterTTV permission to send you notifications.");
                            }
                        });
                    } else if (Notification.permission === 'granted' || (window.webkitNotifications && webkitNotifications.checkPermission() === 0)) {
                        bttv.settings.save("desktopNotifications", true);
                        bttv.notify("Desktop notifications are now enabled.");
                    } else if (Notification.permission === 'denied' || (window.webkitNotifications && webkitNotifications.checkPermission() === 2)) {
                        Notification.requestPermission(function () {
                            if (Notification.permission === 'granted' || (window.webkitNotifications && webkitNotifications.checkPermission() === 0)) {
                                bttv.settings.save("desktopNotifications", true);
                                bttv.notify("Desktop notifications are now enabled.");
                            } else {
                                bttv.notify("You denied BetterTTV permission to send you notifications.");
                            }
                        });
                    } else {
                        bttv.notify("Your browser is not capable of desktop notifications.");
                    }
                } else {
                    bttv.notify("Your browser is not capable of desktop notifications.");
                }
            } else {
                bttv.notify("Desktop notifications are now disabled.");
            }
        }
    },
    {
        name: 'Double-Click Translation',
        description: 'Double-clicking on chat lines translates them with Google Translate',
        default: true,
        storageKey: 'dblclickTranslation',
        toggle: function(value) {
            if(value === true) {
                $('body').on('dblclick', '.chat-line', function() {
                    chat.helpers.translate($(this).find('.message'), $(this).data("sender"), $(this).find('.message').data("raw"));
                    $(this).find('.message').text("Translating..");
                    $('div.tipsy').remove();
                });
            } else {
                $('body').unbind("dblclick");
            }
        }
    },
    {
        name: 'Disable Whispers',
        description: 'Disables the twitch whisper functionalitiy, hiding any whispers you recieve',
        default: false,
        storageKey: 'disableWhispers'
    },
	{
        name: 'Double-Click Auto-Complete',
        description: 'Double-clicking a username in chat copies it into the chat text box',
        default: false,
        storageKey: 'dblClickAutoComplete'
    },
    {
        name: 'Embedded Polling',
        description: 'See polls posted by the broadcaster embedded right into chat',
        default: true,
        storageKey: 'embeddedPolling'
    },
    {
        name: 'Emote Menu',
        description: 'Get a more advanced emote menu for Twitch. (Made by Ryan Chatham)',
        default: false,
        storageKey: 'clickTwitchEmotes',
        toggle: function(value) {
            if(value === true) {
                bttv.handleTwitchChatEmotesScript();
            } else {
                window.location.reload();
            }
        }
    },
    {
        name: 'Featured Channels',
        description: 'The left sidebar is too cluttered, so BetterTTV removes featured channels by default',
        default: false,
        storageKey: 'showFeaturedChannels',
        toggle: function(value) {
            if(value === true) {
                displayElement('#nav_games');
                displayElement('#nav_streams');
                displayElement('#nav_related_streams');
            } else {
                removeElement('#nav_games');
                removeElement('#nav_streams');
                removeElement('#nav_related_streams');
            }
        }
    },
    {
        name: 'Hide Group Chat',
        description: 'Hides the group chat bar above chat',
        default: false,
        storageKey: 'groupChatRemoval',
        toggle: function(value) {
            if(value === true) {
                cssLoader.load("hide-group-chat", "groupChatRemoval");
            } else {
                cssLoader.unload("groupChatRemoval");
            }
        },
        load: function() {
            cssLoader.load("hide-group-chat", "groupChatRemoval");
        }
    },
    {
        name: 'Host Button',
        description: 'Places a Host/Unhost button below the video player',
        default: false,
        storageKey: 'hostButton',
        toggle: function(value) {
            if(value === true) {
                hostButton();
            } else {
                $('#bttv-host-button').remove();
            }
        }
    },
    {
        name: 'JTV Chat Badges',
        description: 'BetterTTV can replace the chat badges with the ones from JTV',
        default: false,
        storageKey: 'showJTVTags'
    },
    {
        name: 'JTV Monkey Emotes',
        description: 'BetterTTV replaces the robot emoticons with the old JTV monkey faces',
        default: true,
        storageKey: 'showMonkeyEmotes',
        toggle: function() {
            window.location.reload();
        }
    },
    {
        name: 'Mod Card Keybinds',
        description: 'Enable keybinds when you click on a username: P(urge), T(imeout), B(an), W(whisper)',
        default: false,
        storageKey: 'modcardsKeybinds'
    },
    {
        name: 'Other Messages Alert',
        description: 'BetterTTV can alert you when you receive a message to your "Other" messages folder',
        default: false,
        storageKey: 'alertOtherMessages',
        toggle: function() {
            window.location.reload();
        }
    },
    {
        name: 'Play Sound on Highlight/Whisper',
        description: 'Get audio feedback for messages directed at you (BETA)',
        default: false,
        storageKey: 'highlightFeedback'
    },
    {
        name: 'Remove Deleted Messages',
        description: 'Completely removes timed out messages from view',
        default: false,
        storageKey: 'hideDeletedMessages'
    },
    {
        name: 'Show Deleted Messages',
        description: 'Turn this on to change <message deleted> back to users\' messages.',
        default: false,
        storageKey: 'showDeletedMessages'
    },
    {
        name: 'Split Chat',
        description: 'Easily distinguish between messages from different users in chat',
        default: true,
        storageKey: 'splitChat',
        toggle: function(value) {
            if(value === true) {
                splitChat();
            } else {
                $("#splitChat").remove();
            }
        }
    },
    {
        name: 'Tab Completion Tooltip',
        description: 'Shows a tooltip with suggested names when using tab completion',
        default: true,
        storageKey: 'tabCompletionTooltip'
    },
    {
        name: 'TwitchCast',
        description: 'Watch a Twitch stream via Chromecast (Google Chrome only)',
        default: false,
        storageKey: 'twitchCast',
        toggle: function(value) {
            channelReformat();
        }
    },
    {
        default: '',
        storageKey: 'blacklistKeywords',
        toggle: function(keywords) {
            var phraseRegex = /\{.+?\}/g;
            var testCases =  keywords.match(phraseRegex);
            var phraseKeywords = [];
            if(testCases) {
                for (i=0;i<testCases.length;i++) {
                    var testCase = testCases[i];
                    keywords = keywords.replace(testCase, "").replace(/\s\s+/g, ' ').trim();
                    phraseKeywords.push('"'+testCase.replace(/(^\{|\}$)/g, '').trim()+'"');
                }
            }

            keywords === "" ? keywords = phraseKeywords : keywords = keywords.split(" ").concat(phraseKeywords);

            for(var i=0; i<keywords.length; i++) {
                if(/^\([a-z0-9_\-\*]+\)$/i.test(keywords[i])) {
                    keywords[i] = keywords[i].replace(/(\(|\))/g, '');
                }
            }

            var keywordList = keywords.join(", ");
            if(keywordList === "") {
                chat.helpers.serverMessage("Blacklist Keywords list is empty", true);
            } else {
                chat.helpers.serverMessage("Blacklist Keywords are now set to: " + keywordList, true);
            }
        }
    },
    {
        default: true,
        storageKey: 'chatLineHistory',
        toggle: function(value) {
            if(value === true) {
                chat.helpers.serverMessage("Chat line history enabled.", true);
            } else {
                chat.helpers.serverMessage("Chat line history disabled.", true);
            }
        }
    },
    {
        default: 340,
        storageKey: 'chatWidth'
    },
    {
        default: false,
        storageKey: 'consoleLog'
    },
    {
        default: false,
        storageKey: 'flipDashboard',
        toggle: function(value) {
            if(value === true) {
                $("#flipDashboard").text("Unflip Dashboard");
                flipDashboard();
            } else {
                $("#flipDashboard").text("Flip Dashboard");
                flipDashboard();
            }
        }
    },
    {
        default: (vars.userData.isLoggedIn ? vars.userData.login : ''),
        storageKey: 'highlightKeywords',
        toggle: function(keywords) {
            var phraseRegex = /\{.+?\}/g;
            var testCases =  keywords.match(phraseRegex);
            var phraseKeywords = [];

            if(testCases) {
                for (i=0;i<testCases.length;i++) {
                    var testCase = testCases[i];
                    keywords = keywords.replace(testCase, "").replace(/\s\s+/g, ' ').trim();
                    phraseKeywords.push('"'+testCase.replace(/(^\{|\}$)/g, '').trim()+'"');
                }
            }

            keywords === "" ? keywords = phraseKeywords : keywords = keywords.split(" ").concat(phraseKeywords);

            for(var i=0; i<keywords.length; i++) {
                if(/^\([a-z0-9_\-\*]+\)$/i.test(keywords[i])) {
                    keywords[i] = keywords[i].replace(/(\(|\))/g, '');
                }
            }

            var keywordList = keywords.join(", ");
            if(keywordList === "") {
                chat.helpers.serverMessage("Highlight Keywords list is empty", true);
            } else {
                chat.helpers.serverMessage("Highlight Keywords are now set to: " + keywordList, true);
            }
        }
    },
    {
        default: 150,
        storageKey: 'scrollbackAmount',
        toggle: function(lines) {
            if(lines === 150) {
                chat.helpers.serverMessage("Chat scrollback is now set to: default (150)", true);
            } else {
                chat.helpers.serverMessage("Chat scrollback is now set to: " + lines, true);
            }
        }
    }
];
