// LOGIN

// Require
const { log, errors } = require('cozy-konnector-libs')

// Require Browser
const { By, Key, until } = require('selenium-webdriver')

// Require in local
const keypad = require('./keypad')
const helpers = require('./helpers')

// Vars
const timeoutSeconds = 60 // timeout (in seconds)
const titleWhenConnected = 'espace-client'
let error = null

/**
 * This function initiates a connection on the HelloBank website.
 *
 * @param browser
 * @param {string} urlLogin
 * @param {string} username
 * @param {string} password
 * @see {@link https://github.com/konnectors/libs/blob/master/packages/cozy-konnector-libs/docs/api.md#module_signin}
 * @returns {boolean} Returns true if authentication is successful, else false
 */
async function authenticate(browser, urlLogin, username, password) {
  try {
    // timeout (in micro seconds)
    let timeoutMicroSeconds = timeoutSeconds * 1000

    log('info', `Open in browser : ${urlLogin}`)

    // open browser
    await browser.get(urlLogin)

    // wait some seconds for let javascript load everythinbg
    await browser.sleep(helpers.secondsToMs(4))

    // wait for find 'username' field
    await browser.wait(
      until.elementLocated(By.id('username')),
      timeoutMicroSeconds
    )

    // put username in field
    await browser.findElement(By.id('username')).sendKeys(username, Key.RETURN)

    // wait for keyboard is active
    await browser.wait(
      until.elementLocated(By.css('#secret-nbr-keyboard a')),
      timeoutMicroSeconds
    )

    // get link with keypad image
    const linkBackground = (await browser
      .findElement(By.id('secret-nbr-keyboard'))
      .getCssValue('background-image'))
      .substr(5)
      .replace('")', '')

    const numbersImagesToClickForPass = await keypad.getNumbersImagesToClickForPass(
      linkBackground,
      password
    )

    // for every key on pass (6 key)
    for (
      let i = 0, lengthPassword = numbersImagesToClickForPass.length;
      i < lengthPassword;
      i++
    ) {
      // for every number of pass click on good image
      await browser
        .findElement(
          By.css(
            `#secret-nbr-keyboard a:nth-child(${numbersImagesToClickForPass[i]})`
          )
        )
        .click()
    }

    // waiting for let js inside page see for we finish to write pass and active button "connect"
    await browser.sleep(helpers.secondsToMs(1))

    // wait to find button
    await browser.wait(
      until.elementLocated(By.id('submitIdent')),
      timeoutMicroSeconds
    )

    // click on connect button
    await browser.findElement(By.id('submitIdent')).click()

    // we wait for find title before timeout is finished
    await browser.wait(until.titleIs(titleWhenConnected), timeoutMicroSeconds)

    await browser.sleep(helpers.secondsToMs(3))

    const sourceHtml = await browser.getPageSource()

    if (
      sourceHtml.indexOf(
        'Vous avez atteint le seuil de <span>80&nbsp;connexions</span> avec le même code secret.'
      ) > -1
    ) {
      error = errors.USER_ACTION_NEEDED_CHANGE_PASSWORD
      throw new Error()
    } else if (
      sourceHtml.indexOf(
        'Vous avez atteint le seuil de <span>100&nbsp;connexions</span> avec le même code secret.'
      ) > -1
    ) {
      error = errors.USER_ACTION_NEEDED_CHANGE_PASSWORD
      throw new Error()
    } else if (
      sourceHtml.indexOf(
        `Tous les  <span class="bold">90 jours </span>calendaires, réalisez une authentification forte pour accéder en ligne à vos comptes.`
      ) > -1
    ) {
      error = errors.CHALLENGE_ASKED
      throw new Error()
    }
  } catch (e) {
    if (error !== null) throw new Error(error)

    throw new Error(errors.LOGIN_FAILED)
  }
}

module.exports = {
  authenticate
}
