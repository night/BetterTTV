const $ = require('jquery');
const cdn = require('../../utils/cdn');
const debug = require('../../utils/debug');
const saveAs = require('../../utils/filesaver').saveAs;
const watcher = require('../../watcher');
const settings = require('../../settings');
const storage = require('../../storage');
const html = require('../../utils/html');
const api = require('../../utils/api');

const getSettingElement = ({id}) => $(`.bttvOption-${html.escape(id)}`);

const settingTemplate = ({id, name, description}) => `
    <div id="option" class="option bttvOption-${html.escape(id)}">
        <span style="font-weight:bold;font-size:14px;color:#D3D3D3;">${html.escape(name)}</span>
        <span class="description"> — ${html.escape(description)}</span>
        <div class="bttv-switch">
            <input class="bttv-switch-input bttv-switch-off" type="radio" name=${html.escape(id)} value="false" id="${html.escape(id)}False" />
            <label class="bttv-switch-label bttv-switch-label-off" for="${html.escape(id)}False">Off</label>
            <input class="bttv-switch-input" type="radio" name=${html.escape(id)} value="true" id="${html.escape(id)}True" />
            <label class="bttv-switch-label bttv-switch-label-on" for="${html.escape(id)}True">On</label>
            <span class="bttv-switch-selection"></span>
        </div>
    </option>
`;

const settingsPanelTemplate = () => `
    <div id="header">
        <span id="logo"><img height="45px" src="${cdn.url('assets/logos/settings_logo.png')}" /></span>
        <ul class="nav">
            <li><a href="#bttvAbout">About</a></li>
            <li class="active"><a href="#bttvSettings">Settings</a></li>
            <li><a href="#bttvChannel">Channel</a></li>
            <li><a href="#bttvChangelog">Changelog</a></li>
            <li><a href="#bttvPrivacy">Privacy Policy</a></li>
            <li><a href="#bttvBackup">Backup/Import</a></li>
        </ul>
        <span id="close">&times;</span>
    </div>
    <div id="bttvSettings" class="scroll scroll-dark" style="height:425px;">
        <div class="tse-content options-list">
            <h2 class="option">Here you can manage the various BetterTTV options. Click On or Off to toggle settings.</h2>
        </div>
    </div>
    <div id="bttvAbout" style="display:none;">
        <div class="aboutHalf">
            <img class="bttvAboutIcon" src="${cdn.url('assets/logos/mascot.png')}" />
            <h1>BetterTTV v${debug.version}</h1>
            <h2>from your friends at <a href="https://www.nightdev.com" target="_blank">NightDev</a></h2>
            <br>
        </div>
        <div class="aboutHalf">
            <h1 style="margin-top: 100px;">Think this addon is awesome?</h1>
            <br>
            <br>
            <h2>
                <a target="_blank" href="https://chrome.google.com/webstore/detail/ajopnjidmegmdimjlfnijceegpefgped">Drop a Review on the Chrome Webstore</a>
            </h2>
            <br>
            <h2>or maybe</h2>
            <br>
            <h2><a target="_blank" href="https://manage.betterttv.net/channel">Subscribe to BetterTTV Pro</a></h2>
            <br>
        </div>
    </div>
    <div id="bttvChannel" style="display:none;">
        <iframe frameborder="0" width="100%" height="425"></iframe>
    </div>
    <div id="bttvPrivacy" class="scroll scroll-dark" style="display:none;height:425px;">
        <div class="tse-content"></div>
    </div>
    <div id="bttvChangelog" class="scroll scroll-dark" style="display:none;height:425px;">
        <div class="tse-content"><h1>Changelog</h1></div>
    </div>
    <div id="bttvBackup" style="display:none;height:425px;padding:25px;">
        <h4 style="padding-bottom:10px;">Backup Settings</h4>
        <button id="bttvBackupButton" class="button primary"><span>Download</span></button>
        <h4 style="padding-top:15px;padding-bottom:10px;">Import Settings</h4>
        <input id="bttvImportInput" type="file" style="height: 25px;width: 250px;" />
    </div>
    <div id="footer">
        <span>BetterTTV &copy; <a href="https://www.nightdev.com" target="_blank">NightDev, LLC</a> ${new Date().getFullYear()}</span>
        <span style="float:right;">
            <a href="https://twitter.com/betterttv" target="_blank">Twitter</a> | 
            <a href="https://community.nightdev.com/c/betterttv" target="_blank">Forums</a> | 
            <a href="https://github.com/night/BetterTTV/issues/new?labels=bug" target="_blank">Bug Report</a> | 
            <a href="https://discord.gg/nightdev" target="_blank">Discord</a>
        </span>
    </div>
`;

const changelogEntryTemplate = (version, pubdate, body) => `
    <h2>Version ${html.escape(version)} (${pubdate})</h2>
    ${body}
`;

function getDataURLFromUpload(input, callback) {
    const reader = new FileReader();
    reader.onload = ({target}) => callback(target.result);
    const file = input.files[0];
    if (!file) {
        callback(null);
        return;
    }
    reader.readAsText(file);
}

function isJSON(string) {
    try {
        JSON.parse(string);
    } catch (e) {
        return false;
    }
    return true;
}

const renderedSettings = {};

function addSetting(setting) {
    if (renderedSettings[setting.id]) return;
    renderedSettings[setting.id] = setting;

    const sortedSettings = Object.values(renderedSettings);
    sortedSettings.sort((a, b) => a.name.localeCompare(b.name));
    const beforeIndex = sortedSettings.findIndex(s => s.id === setting.id) - 1;

    const template = settingTemplate(setting);
    if (beforeIndex === -1) {
        $('#bttvSettings .options-list h2.option').after(template);
    } else {
        getSettingElement(sortedSettings[beforeIndex]).after(template);
    }

    $(settings.get(setting.id) ? `#${setting.id}True` : `#${setting.id}False`).prop('checked', true);
}

class SettingsModule {
    constructor() {
        watcher.on('load', () => {
            this.renderSettings();
            this.renderSettingsMenuOption();
        });
    }

    renderSettings() {
        if ($('#bttvSettings').length) return;

        const panel = document.createElement('div');
        panel.setAttribute('id', 'bttvSettingsPanel');
        panel.style.display = 'none';
        panel.innerHTML = settingsPanelTemplate();
        $('body').append(panel);

        cdn.get('privacy.html').then(data => $('#bttvPrivacy .tse-content').html(data));

        const changelogPanel = $('#bttvChangelog .tse-content');
        api.get('changelog').then(data => {
            data.changelog.forEach(entry => {
                const pubdate = window.moment(entry.publishedAt).format('MMM D, YYYY');
                changelogPanel.append(changelogEntryTemplate(entry.version, pubdate, entry.body));
            });
        });

        $('#bttvSettings').on('change', '.option input:radio', ({target}) => settings.set(target.name, target.value === 'true'));
        $('#bttvBackupButton').click(() => this.backup());
        $('#bttvImportInput').change(({target}) => this.import(target));

        $('#bttvSettingsPanel #close').click(() => $('#bttvSettingsPanel').hide('slow'));
        $('#bttvSettingsPanel .nav a').click(e => {
            e.preventDefault();
            const $tab = $(e.target);
            const tabId = $tab.attr('href');

            $('#bttvSettingsPanel .nav a').each((index, el) => {
                const $el = $(el);
                const currentTabId = $el.attr('href');
                $(currentTabId).hide();
                $el.parent('li').removeClass('active');
            });

            if (tabId === '#bttvChannel') {
                $(tabId).children('iframe').attr('src', 'https://manage.betterttv.net/channel');
            }

            $(tabId).fadeIn();
            $tab.parent('li').addClass('active');
        });

        settings.getSettings().forEach(setting => addSetting(setting));

        // relies on Twitch jQuery.. may break
        // this should be cleaned up
        try {
            jQuery('#bttvSettingsPanel .scroll').TrackpadScrollEmulator({ // eslint-disable-line new-cap
                scrollbarHideStrategy: 'rightAndBottom'
            });
        } catch (e) {}
    }

    renderSettingsMenuOption() {
        if ($('.bttvSettingsIconDropDown').length) return;

        $('.warp__drawer .warp__list .warp__item:eq(2)').before(`
            <li class="warp__item">
                <a class="warp__tipsy" data-tt_medium="twitch_leftnav" href="#" title="BetterTTV Settings">
                    <figure class="warp__avatar bttvSettingsIconDropDown"></figure>
                    <span class="drawer__item">BetterTTV Settings</span>
                </a>
            </li>
        `);
        $('.top-nav-drawer__item a[data-tt_content="settings_profile"]').parent().after(`
            <li class="top-nav-drawer__item">
                <a title="BetterTTV Settings" href="#" class="flex ember-view">
                    <figure class="icon bttvSettingsIconDropDown"></figure>
                    <span class="top-nav-drawer__label">BetterTTV Settings</span>
                </a>
            </li>
        `);

        $('.bttvSettingsIconDropDown').parent().click(this.openSettings);
    }

    openSettings(e) {
        e.preventDefault();
        $('#bttvSettingsPanel').show('slow');
    }

    backup() {
        let rv = storage.getStorage();

        rv = new Blob([JSON.stringify(rv)], {
            type: 'text/plain;charset=utf-8;'
        });

        saveAs(rv, 'bttv_settings.backup');
    }

    import(target) {
        getDataURLFromUpload(target, data => {
            if (!isJSON(data)) return;

            const settingsToImport = JSON.parse(data);
            Object.keys(settingsToImport).forEach(s => settings.set(s.split('bttv_')[1], settingsToImport[s]));

            setTimeout(() => window.location.reload(), 1000);
        });
    }
}

module.exports = new SettingsModule();
