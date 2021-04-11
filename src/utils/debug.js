import storage from '../storage';

const VERSION = process.env.EXT_VER;

function log(type, ...args) {
    if (!console || !storage.get('consoleLog')) return;
    console[type].apply(console, ['BTTV:'].concat(args));
}

export default {
    log: log.bind(this, 'log'),
    error: log.bind(this, 'error'),
    warn: log.bind(this, 'warn'),
    info: log.bind(this, 'info'),
    version: VERSION
};
