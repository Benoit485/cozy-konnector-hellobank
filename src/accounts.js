// ACCOUNTS

// Require
const { log } = require('cozy-konnector-libs')

// Require in local
const helpers = require('./helpers')

// vars
let json = {}
let jsonFamilyAccounts = {}
let accounts = []
let $ = null // only for put out error in IDE/eslint with executeScript

async function getList(browser, urlAccounts) {
  log('info', `Open in browser by xhr : ${urlAccounts}`)

  json = await browser.executeScript(function(urlAccounts) {
    return new Promise((resolve, reject) => {
      const path = urlAccounts
      const dataJson = {
        ibanCrypte: '',
        pastOrPending: 1,
        triAV: 0,
        startDate: null,
        endDate: null
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
  }, urlAccounts)

  jsonFamilyAccounts = json.data.listerOperations.infoUdc.familleCompte

  return jsonFamilyAccounts
}

function parse() {
  jsonFamilyAccounts.forEach(valueFamily => {
    const type = helpers.getAccountTypeFromFamily(
      valueFamily.libelleFamilleCompte
    )

    valueFamily.compte.forEach(valueAccount => {
      accounts.push({
        type: type,
        idAccount: valueAccount.key,
        label:
          valueAccount.libellePersoProduit !== ''
            ? valueAccount.libellePersoProduit
            : valueAccount.libelleProduit,
        balance: valueAccount.soldeDispo,
        institutionLabel: helpers.getBankName(),
        currency: valueAccount.devise,
        number: valueAccount.value,
        vendorId: valueAccount.value
      })
    })
  })

  return accounts
}

module.exports = {
  getList,
  parse
}
