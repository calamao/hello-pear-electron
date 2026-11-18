"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PearRuntime = require("pear-runtime");
const Hyperswarm = require("hyperswarm");
const Corestore = require("corestore");
const goodbye = require("graceful-goodbye");
const FramedStream = require("framed-stream");
const path = require("bare-path");
const dir = require("bare-storage");
const which_runtime_1 = require("which-runtime");
const argv = (index) => Bare.argv[index + (which_runtime_1.isBareKit ? 0 : 2)];
const updaterConfig = {
    updates: argv(0) !== 'false',
    version: argv(1),
    upgrade: argv(2),
    name: argv(3),
    dir: argv(4) || dir.persistent(),
    app: argv(5)
};
const pipe = new FramedStream(Bare.IPC);
const store = new Corestore(path.join(updaterConfig.dir, 'pear-runtime', 'corestore'));
const swarm = new Hyperswarm();
const pear = new PearRuntime({ ...updaterConfig, swarm, store });
pear.updater.on('error', (err) => pipe.write('updater-error ' + err.message));
if (updaterConfig.updates !== false) {
    swarm.on('connection', (connection) => store.replicate(connection));
    swarm.join(pear.updater.drive.core.discoveryKey, {
        client: true,
        server: false
    });
}
pear.updater.on('update-scheduled', (delay) => pipe.write('update-scheduled ' + delay));
pear.updater.on('updating', () => pipe.write('updating'));
pear.updater.on('updated', () => pipe.write('updated'));
pear.on('minver-required', () => pipe.write('minver-required'));
goodbye(async () => {
    await swarm.destroy();
    await pear.close();
    await store.close();
});
function isPing(message) {
    return (typeof message === 'object' && message !== null && 'type' in message && message.type === 'ping');
}
pipe.on('data', async (data) => {
    const message = data.toString();
    if (message === 'pear:applyUpdate') {
        try {
            await pear.ready();
            await pear.updater.applyUpdate();
            pipe.write('pear:updateApplied');
        }
        catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            pipe.write('pear:updateFailed ' + error);
        }
        return;
    }
    let parsed;
    try {
        parsed = JSON.parse(message);
    }
    catch {
        pipe.write('unknown-message ' + message);
        return;
    }
    if (isPing(parsed)) {
        pipe.write(JSON.stringify({ type: 'pong', time: new Date().toISOString(), text: 'Hello from worker' }));
        return;
    }
    pipe.write('unknown-message ' + message);
});
pipe.write('Hello from worker');
