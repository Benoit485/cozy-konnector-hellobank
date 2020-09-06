// OPERATIONS

// Require
const { log, saveFiles } = require('cozy-konnector-libs')
const moment = require('moment')

// Require in local
const helpers = require('./helpers')

// vars
let $ = null // only for put out error in IDE/eslint with executeScript

async function get(browser, urlFiles) {
  log('info', `Open in browser by xhr : ${urlFiles}`)

  const startDate = moment()
    .subtract(10, 'years')
    .format('DD/MM/YYYY')
  const endDate = moment().format('DD/MM/YYYY')

  const json = await browser.executeScript(
    function(urlFiles, startDate, endDate) {
      return new Promise((resolve, reject) => {
        const path = urlFiles
        const dataJson = {
          dateDebut: startDate,
          dateFin: endDate
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
    urlFiles,
    startDate,
    endDate
  )

  return json.data.rechercheCriteresDemat //documentsList
}

function parse(documentsList) {
  let infoFiles = []

  // For every types :
  // mapDocuments
  // mapDocumentsPro
  // mapContratsAccueil
  // mapMif2
  // eslint-disable-next-line no-unused-vars
  for (let [key, documentsByType] of Object.entries(documentsList)) {
    // For every account (or other) type
    // Examples : Comptes chèques, Comptes d'épargne
    for (let [typeKey, typeValue] of Object.entries(documentsByType)) {
      const typeLabel = typeKey
      const docs = typeValue.listeDocument
      const typeFamille = typeValue.typeFamille

      log('info', `Parse documents for ${typeLabel}`)

      // For every doc
      for (let doc of docs) {
        infoFiles.push({
          type: helpers.parseDocumentType(typeLabel),
          account:
            doc.numeroCompteAnonymise !== undefined
              ? doc.numeroCompteAnonymise
              : '',
          date: helpers.parseDateDocument(doc.dateDoc),
          name: doc.idDoc,
          data: { typeFamille, ...doc }
        })
      }
    }
  }

  return infoFiles.map(infoFile => {
    const accountDir = infoFile.account !== '' ? `/${infoFile.account}` : ''

    const link =
      `https://www.hellobank.fr/demat-wspl/rest/consultationDocumentDemat?` +
      `ibanCrypte=${infoFile.data.ibanCrypte}` +
      `&idDocument=${infoFile.data.idDoc}` +
      `&typeCpt=${infoFile.data.typeCompte}&` +
      `typeDoc=${infoFile.data.typeDoc}` +
      `&typeFamille=${infoFile.data.typeFamille}` +
      `&familleDoc=${infoFile.data.famDoc}` +
      `&consulted=${infoFile.data.consulted}` +
      `&idLocalisation=${infoFile.data.idLocalisation}` +
      `&viDocDocument=${infoFile.data.viDocDocument}` +
      `&dateDocument=${infoFile.data.dateDoc}`

    return {
      fileurl: `${link}`,
      subPath: `${infoFile.type}${accountDir}`,
      filename: `${infoFile.date}_${infoFile.name}.pdf`
      // filename have ($accountDir) because it's make error if two file have same name
    }
  })
}

function getStreams(browser, documentsList) {
  //documentsStream
  return Promise.all(
    documentsList.map(doc => {
      return new Promise(async resolve => {
        const docString = await browser
          .executeScript(function(urlPdfFile) {
            // Next code executed inside browser :
            return new Promise((resolve, reject) => {
              const path = urlPdfFile

              $.ajax({
                type: 'GET',
                url: path,
                xhr: () => {
                  var xhr = new XMLHttpRequest()
                  xhr.responseType = 'blob'
                  return xhr
                }
              })
                .then(result => {
                  var reader = new window.FileReader()
                  reader.readAsDataURL(result)

                  reader.onloadend = function() {
                    var base64data = reader.result
                    // Return string of stream encoded to base64
                    resolve(base64data)
                  }
                })
                .catch(err => {
                  reject(err)
                })
            })
          }, doc.fileurl)
          .catch(err =>
            log(
              'debug',
              `Error with executeScript because : ${err}`,
              'documents'
            )
          )

        //log('debug', docString, 'docString')

        const docStream = Buffer.from(
          docString.replace('data:application/pdf;base64,', ''),
          'base64'
        )

        //log('debug', docStream, 'docStream')

        resolve({ filestream: docStream, ...doc })
      })
    })
  )
}

async function save(files, fields) {
  //log('debug', files, 'files')
  log('debug', `Check for save ${files.length} documents`)

  return saveFiles(files, fields, {
    //requestInstance: request,
    timeout: moment().add(1, 'hours'),
    // this._account not exist when use yarn standalone
    sourceAccount:
      this._account !== undefined ? this._account._id : fields.login,
    sourceAccountIdentifier: fields.login
  })
}

module.exports = {
  get,
  parse,
  getStreams,
  save
}
