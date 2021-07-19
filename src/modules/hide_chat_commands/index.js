import settings from '../../settings.js';
import watcher from '../../watcher.js';

class HideChatCommandsModule {
  constructor() {
    settings.add({
      id: 'hideCommands',
      name: 'Hide Commands',
      defaultValue: false,
      description: 'Hides chat messages starting with an !',
    });

    watcher.on('chat.message.handler', (message) => {
      this.handleMessage(message);
    });
  }

  handleMessage({message, preventDefault}) {
    if (!settings.get('hideCommands')) {
      return;
    }
    if (message?.messageBody.startsWith('!')) {
      preventDefault();
    }
  }
}

export default new HideChatCommandsModule();
