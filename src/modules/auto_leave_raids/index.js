import $ from 'jquery';
import watcher from '../../watcher.js';
import settings from '../../settings.js';
import domObserver from '../../observers/dom.js';
import {SettingIds} from '../../constants.js';

const RAID_BANNER_SELECTOR = '[data-test-selector="raid-banner"]';

let raidListener;

class AutoLeaveRaidsModule {
  constructor() {
    watcher.on('load.chat', () => this.load());
    settings.on(`changed.${SettingIds.AUTO_LEAVE_RAIDS}`, () => this.load());
  }

  load() {
    if (settings.get(SettingIds.AUTO_LEAVE_RAIDS)) {
      if (raidListener) return;

      raidListener = domObserver.on(RAID_BANNER_SELECTOR, (node, isConnected) => this.handleLeave(node, isConnected));

      return;
    }

    if (!raidListener) return;

    raidListener();
    raidListener = undefined;
  }

  handleLeave(node, isConnected) {
    if (!isConnected) return;

    if (settings.get(SettingIds.AUTO_LEAVE_RAIDS)) {
      const leaveButton = $(node).find('button > div:contains("Leave")');

      if (leaveButton.length) {
        leaveButton.trigger('click');
      }
    }
  }
}

export default new AutoLeaveRaidsModule();
