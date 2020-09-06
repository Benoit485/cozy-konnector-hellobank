// OPERATIONS

// Require
const { log } = require('cozy-konnector-libs')
const moment = require('moment')
const groupBy = require('lodash/groupBy')

// Require in local
const helpers = require('./helpers')

// vars
let $ = null // only for put out error in IDE/eslint with executeScript

String.prototype.replaceAll = function(search, replacement) {
  var target = this
  return target.replace(new RegExp(search, 'g'), replacement)
}

function get(browser, urlOperations, bankAccounts) {
  return new Promise(resolve => {
    const startDate = moment()
      .subtract(1, 'years')
      .format('DDMMYYYY')
    const endDate = moment().format('DDMMYYYY')

    const operationsRaw = bankAccounts.map(async account => {
      log('debug', `Receive operations for account id: ${account.idAccount}`)

      log('info', `Open in browser by xhr : ${urlOperations}`)

      const json = await browser.executeScript(
        function(data) {
          return new Promise((resolve, reject) => {
            const path = data.urlOperations
            const dataJson = {
              ibanCrypte: data.idAccount,
              pastOrPending: 1,
              triAV: 0,
              startDate: data.startDate,
              endDate: data.endDate
            }

            $.ajax({
              type: 'POST',
              url: path,
              contentType: 'application/json',
              data: JSON.stringify(dataJson),
              dataType: 'json'
            })
              .then(result => {
                resolve(result)
              })
              .catch(err => reject(err))
          })
        },
        {
          urlOperations: urlOperations,
          idAccount: account.idAccount,
          startDate: startDate,
          endDate: endDate
        }
      ) // end of executeScript

      if (json.data.listerOperations === null) {
        return null
      }

      const accountKey = json.data.listerOperations.compte.key

      if (accountKey !== account.idAccount) {
        return null
      }

      return {
        account: account,
        operations: json.data.listerOperations.compte.operationPassee
      }
    }) // end operation raw function

    Promise.all(operationsRaw).then(result => {
      resolve(result)
    })
  }) // end of new promise
}

function parse(operationsRaw) {
  let allOperations = []

  for (let raw of operationsRaw) {
    const account = raw.account
    const operations = raw.operations

    log('info', `Parse operations for ${account.idAccount}`, 'bank.operations')

    if (operations.length === 0) {
      log('info', 'No operations', 'bank.operations')
    } else {
      log('info', 'Parse operations', 'bank.operations')
      allOperations = allOperations.concat(
        parseOperationsForOneAccount(account, operations)
      )
    }
  }

  return allOperations
}

function parseOperationsForOneAccount(account, operationLines) {
  const operations = operationLines.map(operationLine => {
    const words = operationLine.libelleOperation.split(' ')
    const amount = operationLine.montant.montant

    let metadata = null
    if (amount < 0) {
      metadata = helpers.findMetadataForDebitOperation(words)
    } else if (amount >= 0) {
      metadata = helpers.findMetadataForCreditOperation(words)
    } else {
      log('error', operationLine, 'Could not find an amount in this operation')
    }

    const date = helpers.parseDate(operationLine.dateOperation)

    return {
      label: operationLine.libelleOperation,
      type: metadata._type || 'none',
      date: date.format(),
      dateOperation: date.format(),
      dateImport: moment().toISOString(),
      currency: account.currency,
      vendorAccountId: account.number,
      amount: amount
    }
  })

  // Forge a vendorId by concatenating account number, day YYYY-MM-DD and index
  // of the operation during the day
  const groups = groupBy(operations, x => x.date.slice(0, 10))
  Object.entries(groups).forEach(([date, group]) => {
    group.forEach((operation, i) => {
      operation.vendorId = `${account.vendorId.replaceAll(
        /\s/,
        '_'
      )}_${date}_${i}`
    })
  })

  return operations
}

module.exports = {
  get,
  parse
}
