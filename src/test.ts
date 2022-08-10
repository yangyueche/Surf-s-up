// import surfSpotData from './surfSpotData.json'
import puppteer from 'puppeteer'
// console.log('surfSpotData', surfSpotData)
const surfSpotData = {
  name: '沙崙',
  url: 'https://swelleye.com/surf-spots/shalun/',
  discordChannel: '948488990728785920',
}

;(async () => {
  try {
    const browser = await puppteer.launch({ headless: false })
    const page = await browser.newPage()
    await page.goto(surfSpotData.url, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForTimeout(5000)
    await page.waitForSelector(
      '#surf-forecast > div.forecast-section > div.forecast-embed.w-embed.w-iframe > iframe'
    )
    let frameHandle = await page.$(
      '#surf-forecast > div.forecast-section > div.forecast-embed.w-embed.w-iframe > iframe'
    )
    let frame = await frameHandle?.contentFrame()
    if (!frame) {
      throw {
        name: 'iframeUndefined',
        message: 'No iframe found! Please check your internet connection.',
      }
    }
    await frame.waitForSelector(
      '#forecast > div.tabs-menu.w-tabs-menu > a:nth-child(2)'
    )

    await frame.click('#forecast > div.tabs-menu.w-tabs-menu > a:nth-child(2)')
    await page.waitForTimeout(1000)

    const forecastChart = await frame?.$('#forecast')
    await forecastChart!.screenshot({
      path: `./src/static/test8.png`,
    })
    await browser.close()
  } catch (e) {
    console.error(e)
  }
})()
