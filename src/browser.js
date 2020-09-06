// BROWSER

// Require
const { log } = require('cozy-konnector-libs')

// Require Browser
const spawn = require('child_process').spawn
const { Builder } = require('selenium-webdriver')
const firefox = require('selenium-webdriver/firefox')

// Require in local
const helpers = require('./helpers')

// Config vars
const portMin = 4444
const portMax = 4777
const debugGecko = false

// Vars
let browser = null
let geckodriver = null
let geckodriverFinishOpened = false

/**
 * Open geckodriver and browser and return instance of browser
 * @returns {Promise<browser>}
 */
function start() {
  return new Promise(async resolve => {
    const port = helpers.getRandomNumber(portMin, portMax)

    log(
      'info',
      `Opening browser driver (on port ${port})`,
      'geckodriver',
      'browser-lib'
    )

    // Open geckodriver
    geckodriver = spawn('/usr/local/bin/cozy-browser/geckodriver', [
      '-b',
      '/usr/local/bin/cozy-browser/firefox/firefox-bin',
      '-p',
      port
    ])

    // Events
    geckodriver.stdout.on('data', data => {
      if (debugGecko)
        log('debug', `stdout: ${data}`, 'geckodriver', 'browser-lib')
      if (data.indexOf(`Listening on 127.0.0.1:${port}`) > -1) {
        geckodriverFinishOpened = true
      }
    })

    geckodriver.stderr.on('data', data => {
      if (debugGecko)
        log('debug', `stderr: ${data}`, 'geckodriver', 'browser-lib')
      if (data.indexOf('error: Address in use') > -1) {
        log(
          'critical',
          helpers.errors.GECKODRIVER_ALREADY_OPENED,
          'geckodriver => unhandled exception',
          'browser-lib'
        )
        geckodriver.kill()
        process.exit(1)
      }
    })

    geckodriver.on('error', error => {
      if (debugGecko)
        log('debug', `error: ${error.message}`, 'geckodriver', 'browser-lib')
      log(
        'critical',
        helpers.errors.GECKODRIVER_FAILED + ' : ' + error,
        'geckodriver => unhandled exception',
        'browser-lib'
      )
      geckodriver.kill()
      process.exit(1)
    })

    if (debugGecko) {
      geckodriver.on('close', code => {
        log(
          'debug',
          `child process exited with code ${code}`,
          'geckodriver',
          'browser-lib'
        )
      })
    }

    //log('debug', geckodriver, 'geckodriver', 'browser-lib')

    // Wait for geckodriver starting
    log('info', 'Waiting driver opened ...', 'geckodriver', 'browser-lib')
    await helpers
      .waitUntil(() => geckodriverFinishOpened)
      .catch(() => {
        log(
          'critical',
          helpers.errors.GECKODRIVER_NOT_OPENED_TIMEOUT,
          'geckodriver',
          'browser-lib'
        )
        process.exit(1)
      })

    // Browser initialize
    log('info', 'Opening browser', 'firefox', 'browser-lib')

    new Builder()
      .usingServer(`http://localhost:${port}`)
      .forBrowser('firefox')
      .setFirefoxOptions(new firefox.Options().headless())
      .build()
      .then(browserResult => {
        browser = browserResult

        //log('debug', browser, 'browser', 'browser-lib')

        resolve(browser)
      })
      .catch(error => {
        // if browser can not be opened
        log(
          'critical',
          helpers.errors.BROWSER_FAILED + ' ' + error,
          'browser => unhandled exception',
          'browser-lib'
        )
        // if geckodriver opened, we kill him
        if (geckodriver !== null && geckodriver.pid !== null) geckodriver.kill()
        process.exit(1)
      })
  })
}

/**
 * Stop browser and geckodriver
 * @returns {Promise<void>}
 */
async function stop() {
  log('info', 'Close browser', 'firefox', 'browser-lib')
  if (browser !== null && browser.quit) await browser.quit()

  log('info', 'Closing browser driver', 'geckodriver', 'browser-lib')
  if (geckodriver !== null && geckodriver.kill) await geckodriver.kill()
}

module.exports = {
  start,
  stop
}
