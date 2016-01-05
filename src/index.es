'use strict'

import { debugEvents, debugMethods } from 'simple-debugger'
import { extend, pick, trim,
  isNumber, isString, isRegExp,
  isFunction, isObject } from 'lodash'
import { projectVersion, projectName, projectHost } from './projectInfo'
import { inspect } from 'util'
import P from 'bluebird'
import EventEmitter from 'events'
import Debug from 'debug'
import clearRequire from 'clear-require'
import validate from './validate'

let bgDebug = new Debug('libs-bellaman-graylog')
let myUnescape = (text='') => text
  .replace(/\\+r/g, '\r')
  .replace(/\\+n/g, '\n')
  .replace(/\\+t/g, '\t')
  .replace(/\\+v/g, '\v')

export default class BellmanGraylog extends EventEmitter {
  constructor(config = {}) {
    super()

    debugEvents(this)
    debugMethods(this, [ 'on', 'once', 'emit',
      'addListener', 'removeListener' ])

    this._setupConfig(config)
    this._setupLevelMap()
    this._setupLevelMin()
    this._setupBaseMsg()
    this._setupGelf()

    this.handler = this.handler.bind(this)
  }

  _setupConfig(config) {
    let err = validate('config', config)
    if (err) throw new Error(`BellmanGraylog#new problem: config has wrong format!\
      \n\t config: ${inspect(config)}\
      \n\t err: ${inspect(err)}`)
    this._config = config

    bgDebug('config: %j', config)
    return this
  }

  _setupLevelMap() {
    let myMap = {
      'emergency': 0,
      'emerg': 0,
      'alert': 1,
      'critical': 2,
      'crit': 2,
      'error': 3,
      'err': 3,
      'warning': 4,
      'warn': 4,
      'notice': 5,
      'note': 5,
      'information': 6,
      'info': 6,
      'log': 6,
      'debug': 7
    }
    this._levelMap = extend(myMap, this._config.levelMap)

    bgDebug('levelMap: %j', this._levelMap)
    return this
  }

  _setupLevelMin() {
    let levelMin = this._config.levelMin || 'info'
    this._levelMinNum = this._levelMap[levelMin]
    if (!isNumber(this._levelMinNum)) {
      throw new Error(`BellmanGraylog#new problem: levelMinNum not found!\
        \n\t config: ${inspect(this._config)} \
        \n\t levelMin: ${levelMin} \
        \n\t levelMap: ${inspect(this._levelMap)}`)
    }
  }

  _setupBaseMsg() {
    let appVersion = projectVersion()
    let facility   = projectName()
    let host       = projectHost()

    let myBaseMsg = { appVersion, facility, host }
    this._baseMsg = extend(myBaseMsg, this._config.baseMsg)

    bgDebug('baseMsg: %j', this._baseMsg)
    return this
  }

  _setupGelf() {
    clearRequire('gelf-pro')
    this._gelf = require('gelf-pro')
    let params = pick(this._config, 'adapterName', 'adapterOptions')
    this._gelf.setConfig(params)

    bgDebug('gelfPro: %j', params)
    return this
  }

  handler({ level: humanLevel, caller: file, time: humanTime, message: fmtMsg, args: rawMsgArgs }) {
    if (this._config.silent) {
      let res = `BellmanGraylog#handler skip: module was silent!`
      bgDebug(res)
      return this.emit('skip', res)
    }

    // prepare resMsg
    let level = this._levelMap[humanLevel]
    if (!isNumber(level)) {
      return this.emit('error', new Error(`BellmanGraylog#handler problem: level not found! \
        \n\t humanLevel: %{humanLevel}`))
    }

    if (level > this._levelMinNum) {
      let res = `BellmanGraylog#handler skip: level less the levelMin \
        \n\t humanLevel: ${humanLevel} \
        \n\t level: ${level} \
        \n\t levelMin: ${this._levelMinNum}`
      bgDebug(res)
      return this.emit('skip', res)
    }

    let short_message = fmtMsg
      .split(/[\r\t\n]/)
      .filter(v => isString(v) && (trim(v).length > 0))[0]

    if (short_message.length === 0) {
      let res = `BellmanGraylog#handler skip: catch empty message: \
        \n\t file: ${file} \
        \n\t fmtMsg: ${fmtMsg} \
        \n\t rawMsgArgs: ${inspect(rawMsgArgs)}`
      bgDebug(res)
      return this.emit('skip', res)
    }

    let frmMsgArgs = (rawMsgArgs || [])
      .map(arg => (isObject(arg) && arg.message && arg.stack)
        ? { message: arg.message, stack: arg.stack.replace(/ {4}/g, '\t') }
        : arg)
      .map(arg => (isFunction(arg) || isRegExp(arg))
        ? arg.toString()
        : arg)
    let msgArgs = myUnescape(inspect(frmMsgArgs, { depth: null }))

    let full_message = fmtMsg

    let resMsg = extend({}, this._baseMsg,
      { level, humanLevel, humanTime, file, short_message, full_message, msgArgs })

    // prepare and send gelfMsg
    let gelfMsg = this._gelf.getStringFromObject(resMsg)
    return P
      .fromNode(cb => this._gelf.send(gelfMsg, cb))
      .then(res => this.emit('send', gelfMsg, res))
      .catch((rawErr = {}) => {
        let message = `BellmanGraylog#handler problem: gelf-pro return error! \
          \n\t err: ${rawErr.message || inspect(rawErr)}`
        let err = rawErr.message
          ? extend(rawErr, { message })
          : new Error(message)
        this.emit('error', err)
      })
  }
}
