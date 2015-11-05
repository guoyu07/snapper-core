'use strict'

const os = require('os')
const config = require('config')

const ilog = require('ilog')
const redis = require('./redis')
const tools = require('./tools')

const network = JSON.stringify(os.networkInterfaces())
  .match(/"address":"[^"]+"/g)
  .map(function (ip) { return ip.slice(11, -1) })

const serverId = tools.md5(JSON.stringify(network))
// Hash
const statsKey = `${config.redisPrefix}:STATS`
// HyperLogLog
const roomKey = `${config.redisPrefix}:STATS:ROOM`
// Hash
const serverKey = `${config.redisPrefix}:STATS:SERVERS`

exports.serverId = serverId

exports.os = function () {
  var res = {
    net: network,
    serverId: serverId,
    mem: {
      free: (os.freemem() / 1024 / 1204).toFixed(2) + ' MB',
      total: (os.totalmem() / 1024 / 1204).toFixed(2) + ' MB'
    }
  }
  return res
}

exports.incrProducerMessages = function (count) {
  redis.client.hincrby(statsKey, 'producerMessages', count)(ilog.error)
}

exports.incrConsumerMessages = function (count) {
  redis.client.hincrby(statsKey, 'consumerMessages', count)(ilog.error)
}

exports.incrConsumers = function (count) {
  redis.client.hincrby(statsKey, 'consumers', count)(ilog.error)
}

exports.addRoomsHyperlog = function (roomId) {
  redis.client.pfadd(roomKey, roomId)(ilog.error)
}

exports.setConsumersStats = function (consumers) {
  redis.client.hset(serverKey, `${serverId}:${config.instancePort}`, consumers)(ilog.error)
}

exports.clientsStats = function *() {
  var res = yield [
    redis.client.pfcount(roomKey),
    redis.client.hgetall(statsKey),
    redis.client.hgetall(serverKey)
  ]
  res[1].rooms = '' + res[0]
  return {
    total: res[1],
    current: res[2]
  }
}
