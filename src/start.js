// LIB

// Require
const { log, cozyClient, categorize } = require('cozy-konnector-libs')
const omit = require('lodash/omit')

// Local require
const browserLib = require('./browser')
const login = require('./login')
const accounts = require('./accounts')
const operations = require('./operations')
const balancesLib = require('./balances')
const documents = require('./documents')

const doctypes = require('cozy-doctypes')
const {
  Document,
  BankAccount,
  BankTransaction,
  BankingReconciliator
} = doctypes

// Cozy register
Document.registerClient(cozyClient)
const reconciliator = new BankingReconciliator({ BankAccount, BankTransaction })

// Urls
const urlBase = 'https://www.hellobank.fr'
const url = {
  login: urlBase + '/fr/client',
  json: {
    accounts: urlBase + '/rop2-wspl/rest/mouvements',
    mouvements: urlBase + '/rop2-wspl/rest/mouvements',
    cards: urlBase + '/udcarte-wspl/rest/listeDetailCartes',
    files: urlBase + '/demat-wspl/rest/rechercheCriteresDemat'
  }
  //Accounts: 'https://www.hellobank.fr/serviceinfosclient-wspl/rpc/InfosClient?modeAppel=0&_=1589748259573'
  //https://www.hellobank.fr/profilclient-wspl/rpc/getConsultationPDF
}

/**
 * The start function is run by the BaseKonnector instance only when it got all the account
 * information (fields). When you run this connector yourself in "standalone" mode or "dev" mode,
 * the account information come from ./konnector-dev-config.json file
 * @param {object} fields
 */
async function start(fields) {
  log('info', 'Waiting browser ...')
  const browser = await browserLib.start()
  log('info', 'Successfully browser opened')

  log('info', 'Authenticating ...')
  await login.authenticate(browser, url.login, fields.login, fields.password)
  log('info', 'Successfully logged in')

  log('info', 'Get bank accounts list')
  await accounts.getList(browser, url.json.accounts)

  log('info', 'Parsing list of bank accounts')
  const bankAccounts = await accounts.parse()
  log('info', `Find ${bankAccounts.length} account(s) :`)
  log('info', bankAccounts)

  log('info', 'Retrieve all informations for each bank accounts found')
  const operationsRaw = await operations.get(
    browser,
    url.json.mouvements,
    bankAccounts
  )
  const allOperations = operations.parse(operationsRaw)

  log('info', 'Categorize the list of transactions')
  const categorizedTransactions = await categorize(allOperations)

  const { accounts: savedAccounts } = await reconciliator.save(
    bankAccounts.map(x =>
      omit(x, [
        'currency',
        'typeAccount',
        'link',
        'children',
        'idAccountParent',
        'idAccount'
      ])
    ),
    categorizedTransactions
  )

  log(
    'info',
    'Retrieve the balance histories and adds the balance of the day for each bank accounts'
  )
  const balances = await balancesLib.fetchBalances(savedAccounts)

  log('info', 'Save the balance histories')
  await balancesLib.saveBalances(balances)

  log('info', 'Save all documents')
  const documentsList = await documents.get(browser, url.json.files)
  const documentsLinks = await documents.parse(documentsList)
  const documentsStream = await documents.getStreams(browser, documentsLinks)
  await documents.save(documentsStream, fields)

  log('info', 'Close browser and driver (firefox / geckodriver)')
  await browserLib.stop()
}

module.exports = {
  start
}
