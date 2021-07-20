import React from 'react';
import Panel from 'rsuite/lib/Panel/index.js';
import Toggle from 'rsuite/lib/Toggle/index.js';
import {registerComponent, useStorageState} from '../Store.jsx';
import {SettingIds, CategoryTypes} from '../../../../constants.js';
import styles from '../../styles/header.module.css';

function AutoLeaveRaids() {
  const [value, setValue] = useStorageState(SettingIds.AUTO_LEAVE_RAIDS);

  return (
    <Panel header="Auto Leave Raids">
      <div className={styles.toggle}>
        <p className={styles.description}>Raids will be opt-in only</p>
        <Toggle checked={value} onChange={(state) => setValue(state)} />
      </div>
    </Panel>
  );
}

export default registerComponent(AutoLeaveRaids, {
  settingId: SettingIds.AUTO_LEAVE_RAIDS,
  name: 'Auto Leave Raids',
  category: CategoryTypes.CHAT,
  keywords: ['auto', 'leave', 'raids'],
});
