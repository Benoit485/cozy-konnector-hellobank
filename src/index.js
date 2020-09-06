// INDEX

const { BaseKonnector } = require('cozy-konnector-libs')
const { start } = require('./start')

module.exports = new BaseKonnector(start)
