// HELPERS

// Require
const moment = require('moment')

// Local require
const classification = require('../classification.json')

// types of account
const AccountType = {
  CHECKINGS: 'Checkings',
  SAVINGS: 'Savings',
  CARD: 'CreditCard',
  MARKET: 'Market',
  LIFE_INSURANCE: 'LifeInsurance',
  PEA: 'PEA',
  CREDIT: 'ConsumerCredit'
}

//---------------------------------------------------------------------------------------------//
// UPDATE FROM HERE ...

// bank name
const bankName = 'Hello Bank'

// familly account to type
const FamilyToAccountType = {
  Liquidités: AccountType.CHECKINGS,
  'Epargne dispo': AccountType.SAVINGS
}

// ... TO HERE
//---------------------------------------------------------------------------------------------//

const defaultMedataOperation = {
  _id: '0',
  _proba: 0,
  _type: 'none'
}

const errors = {
  GECKODRIVER_FAILED: 'An error has occurred with geckodriver',
  GECKODRIVER_ALREADY_OPENED:
    'Geckodriver was not close before, can not continue',
  GECKODRIVER_NOT_OPENED_TIMEOUT: 'Driver not opened before timeout',
  BROWSER_FAILED: 'Can not open browser'
}

/**
 * Return ms from s sended
 * @param {number} seconds
 * @returns {number}
 */
function secondsToMs(seconds) {
  return seconds * 1000
}

/**
 * Call with await before, let program wait some seconds
 * @param {number} seconds
 * @returns {Promise<unknown>}
 */
function wait(seconds = 1) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), secondsToMs(seconds))
  })
}

/**
 * Call with await for continue program when function gived return true
 * can set timeout for wait more or less time (default 10 seconds)
 * (for return not emit error use .catch() for timeout reject)
 * @param {function} conditionFunction
 * @param {number} timeoutSeconds
 * @returns {Promise<unknown>}
 */
function waitUntil(conditionFunction, timeoutSeconds = 10) {
  const startDate = moment()

  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (conditionFunction() !== true) {
        if (moment().diff(startDate) > timeoutSeconds * 1000) {
          clearInterval(interval)
          reject()
        }
      } else {
        clearInterval(interval)
        resolve()
      }
    }, 100)
  })
}

/**
 * Return a random numer between min and max
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function getRandomNumber(min = 1, max = 1000) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Return account type (for cozy) from familly in bank
 * @param {string} family
 * @returns {string} type
 */
function getAccountTypeFromFamily(family) {
  return FamilyToAccountType[family]
}

/**
 * Return bank name
 * @returns {string}
 */
function getBankName() {
  return bankName
}

/**
 * Convert string to {@link moment.Moment}
 * @param {string} date
 * @param {string} format
 * @returns {moment.Moment}
 */
function parseDate(date, format = 'DD/MM/YYYY') {
  moment.locale('fr')
  return moment(date, format)
}

/**
 * Parse a date from 20/09/2018 to 2018-09-20
 * (Used for record document)
 * @param text
 * @returns {string}
 */
function parseDateDocument(text) {
  return text
    .trim()
    .split('/')
    .reverse()
    .join('-')
}

/**
 * Searches in the classification.json file, the metadata corresponding to words passed in parameters.
 * This function ignores the metadata dedicated to debit operations.
 *
 * @param {array} words
 * @returns {object}
 */
function findMetadataForCreditOperation(words) {
  return _classification(words, defaultMedataOperation, (tree, metadata) =>
    _readSpecificMetaData(tree, '_credit', metadata)
  )
}

/**
 * Searches in the classification.json file, the metadata corresponding to words passed in parameters.
 * This function ignores the metadata dedicated to credit operations.
 *
 * @param {array} words
 * @returns {object}
 */
function findMetadataForDebitOperation(words) {
  return _classification(words, defaultMedataOperation, (tree, metadata) =>
    _readSpecificMetaData(tree, '_debit', metadata)
  )
}

function _classification(words, metadata, fnReadMetadata) {
  let treeActive = classification[words[0].toUpperCase()]
  if (!treeActive) {
    return metadata
  }

  let index = words[0] === 'CARTE' ? 2 : 1

  fnReadMetadata(treeActive, metadata)

  for (let word of words.slice(index)) {
    let tree = treeActive[word.toUpperCase()]

    if (!tree) {
      return metadata
    }

    fnReadMetadata(tree, metadata)
    treeActive = tree
  }
}

function _readDefaultMetaData(treeMetadata, metadata) {
  Object.keys(metadata).forEach(key => {
    if (treeMetadata[key]) metadata[key] = treeMetadata[key]
  })
}

function _readSpecificMetaData(treeMetadata, typeOperation, metadata) {
  _readDefaultMetaData(treeMetadata, metadata)

  if (treeMetadata[typeOperation]) {
    _readDefaultMetaData(treeMetadata[typeOperation], metadata)
  }
  return metadata
}

function parseDocumentType(type) {
  return type.trim().replace(/\s+/g, '_')
}

module.exports = {
  secondsToMs,
  getAccountTypeFromFamily,
  getBankName,
  getRandomNumber,
  parseDate,
  parseDateDocument,
  findMetadataForCreditOperation,
  findMetadataForDebitOperation,
  parseDocumentType,
  wait,
  waitUntil,
  errors
}
