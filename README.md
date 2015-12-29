# bellman-graylog

Подключаемый модуль для логгера [bellman](https://github.com/nskazki/bellman)
<br>В качестве транспорта использует [gelf-pro](https://github.com/kkamkou/node-gelf-pro), благодаря чему поддерживает `tcp` и `udp` отправку логов.

```
npm i -S bellman-graylog bellman
```

### Example

```js
import Bellman from 'bellman'
import BellmanGl from 'bellman-graylog'

let config = { 
    levelMin: 'warn',
    adapterName: 'tcp',
    adapterOptions: {
        host: 'some-graylog-host',
        port: 12201
    }
}
var bellmanGl = new BellmanGl(config)
    .on('error', (err) => console.error(err.stack))
    .on('skip', (res) => { /*console.log(res)*/ })
    .on('send', (msg, res) => { /*console.log(msg, res)*/ })

var bellman = new Bellman()
    .on('log', bellmanGl.handler)

bellman.warn('hi graylog! %s - %s - %s - %s', 
    [ 1, 2, 3 ], { 3: 4 }, /567/, new Error('89'))

```

### Config

* `silent` - флаг, будучи установленным в true отключает отправку сообщений.
* `baseMsg` - объект который послужит основой для всех прочих сообщений.
* `levelMap` - объект позволяющий расширить базовый [levelMap](https://github.com/nskazki/bellman-graylog/blob/master/src%2Findex.es#L50)
* `levelMin` - имя порогового уровня отправки сообщений. 
* `adapterName` - опция для [gelf-pro](https://github.com/kkamkou/node-gelf-pro)
* `adapterOptions` - опция для [gelf-pro](https://github.com/kkamkou/node-gelf-pro)

### DefaultConfig

```js
{
    silent: false,
    baseMsg: {
        version: '1.1',   // GELF spec version
        appVersion: '...' // package.version || unknown version
        facility: '...'   // package.name || app-dir        
        host: '...'       // hostname -f || os.hostname()
    },
    levelMap: {
      emergency: 0,
      emerg: 0,
      alert: 1,
      critical: 2,
      crit: 2,
      error: 3,
      err: 3,
      warning: 4,
      warn: 4,
      notice: 5,
      note: 5,
      information: 6,
      info: 6,
      log: 6,
      debug: 7
    },
    levelMin: 'info',
    adapterName: 'udp',
    adapterOptions: {
        protocol: 'udp4',
        host: '127.0.0.1',
        port: 12201
    }
}
```
