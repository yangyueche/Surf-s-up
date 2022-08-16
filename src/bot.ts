import { Client, GatewayIntentBits, Interaction, TextChannel } from 'discord.js'
import config from './config'
import fs from 'node:fs'
import path from 'node:path'
import { CronJob, timeout } from 'cron'
import moment from 'moment'
import puppeteer from 'puppeteer'
import { EmbedBuilder } from '@discordjs/builders'
import { data } from './surfSpotData.json'
import { uploadFile } from './utils/s3'
import { ManagedUpload } from 'aws-sdk/clients/s3'

const client: Client = new Client({ intents: [GatewayIntentBits.Guilds] })

type surfSpotData = {
  s3: ManagedUpload.SendData
  discordChannel: string
  name: string
  url: string
  tide: (string[] | undefined)[]
}[]

client.once('ready', async () => {
  console.log('Bot Running...')
  const fetchSwelleyeThenSendEmbed = new CronJob(
    '00 45 00 * * *',
    async function () {
      try {
        let surfSpotData: surfSpotData = data.map((surfSpot) => {
          return {
            discordChannel: surfSpot.discordChannel,
            name: surfSpot.name,
            url: surfSpot.url,
            tide: [],
            s3: { ETag: '', Location: '', key: '', Key: '', Bucket: '' },
          }
        })

        await webCrawler(surfSpotData)
        await sendSwellEyeEmbed(surfSpotData, client)
        console.log('Forecast Sent!')
      } catch (e) {
        console.error(e)
      }
      return
    },
    null,
    true,
    'Asia/Taipei'
  )
})

client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isCommand()) return

  const { commandName } = interaction

  if (commandName === 'pingg') {
    await interaction.reply('Pong!')
  } else if (commandName === 'server') {
    await interaction.reply('Server info.')
  } else if (commandName === 'user') {
    await interaction.reply('User info.')
  }
})

client.login(config.DISCORD_TOKEN)

async function webCrawler(surfSpotData: surfSpotData) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  for await (const surfSpot of surfSpotData) {
    const page = await browser.newPage()
    await page.goto(surfSpot.url, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForTimeout(4000)
    await page.waitForSelector(
      '#surf-forecast > div.forecast-section > div.forecast-embed.w-embed.w-iframe > iframe'
    )
    const frameHandle = await page.$(
      '#surf-forecast > div.forecast-section > div.forecast-embed.w-embed.w-iframe > iframe'
    )
    const frame = await frameHandle?.contentFrame()
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
    await page.waitForTimeout(5000)

    const forecastChart = await frame?.$('#forecast')

    if (!forecastChart) {
      throw {
        name: 'invalidForeCastChart',
        message: 'No forecast cart found.',
      }
    }
    await forecastChart.screenshot({
      path: `./src/static/${moment().format('MMMDoYYh')}${surfSpot.name}.png`,
    })

    // grab tide value
    await frame.waitForSelector(
      '#forecast-content > div:nth-child(2)>div > div.tides>div.reading-text-white>span:nth-child(2)>span:nth-child(1)'
    )
    const tideElements = await frame.$$(
      '#forecast-content > div:nth-child(2)>div > div.tides>div.reading-text-white>span:nth-child(2)>span:nth-child(1)'
    )

    let tideValues = []
    for await (const tideElement of tideElements) {
      const tideValue = await frame
        .evaluate((el) => el.textContent, tideElement)
        .catch((e) => {
          throw {
            name: 'invalidTideValue',
            message: 'invalid text content on tide value  ',
          }
        })
      tideValues.push(tideValue?.split(' '))
    }
    surfSpot.tide = tideValues

    const file = {
      path: `./src/static/${moment().format('MMMDoYYh')}${surfSpot.name}.png`,
      filename: `forecast-screenshot/${moment().format('MMMDoYYh')}${
        surfSpot.name
      }.png`,
    }

    const uploadedFile = await uploadFile(file).catch((e) => {
      throw {
        name: 'sthWentWrongWhenUploadingToS3',
        message: 'something went wrong when uploading to s3',
      }
    })
    console.log(`stored ${surfSpot.name}`)
    fs.unlinkSync(
      `./src/static/${moment().format('MMMDoYYh')}${surfSpot.name}.png`
    )
    await page.waitForTimeout(1000)
    surfSpot.s3 = uploadedFile

    await page.close()
  }

  await browser.close()
  return
}

async function sendSwellEyeEmbed(
  surfSpotData: surfSpotData,
  client: Client<boolean>
) {
  for await (const surfSpot of surfSpotData) {
    const tideFields = surfSpot.tide.map((tide) => {
      if (!tide) {
        throw {
          name: 'invalidTideValue',
          message: 'Tide value is undefined.',
        }
      }
      return { name: tide[0], value: tide[1], inline: true }
    })

    const channel = client.channels.cache.get(
      surfSpot.discordChannel
    ) as TextChannel

    const swellEyeEmbed = new EmbedBuilder()
      .setColor(0x095c47)
      .setTitle(
        `${moment().add(1, 'days').format('MMM Do')} ${channel.name} 預報：`
      )
      .setURL(surfSpot.url)
      .setAuthor({
        name: 'Mac',
        iconURL: 'https://imgur.com/Rb5RNN9.jpg',
      })
      .setThumbnail(
        'https://swelleye.com/av/img/opengraph-3dee2d0f576b24c52d55.png'
      )
      .addFields(tideFields)
      .setImage(surfSpot.s3.Location)
      .setTimestamp()
      .setFooter({
        text: 'Provided by swelleye.com',
        iconURL:
          'https://swelleye.com/av/img/opengraph-3dee2d0f576b24c52d55.png',
      })

    await channel
      .send({
        embeds: [swellEyeEmbed],
      })
      .then((message) => {
        message.pin()
      })
      .catch((e) => {
        throw {
          name: 'errorOnSendEmbed',
          message: 'something went wrong whne sending embed.',
        }
      })
  }
}
