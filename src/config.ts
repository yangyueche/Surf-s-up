import dotenv from 'dotenv'
dotenv.config()
export default {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  DISCORD_CLIENTID: process.env.DISCORD_CLIENTID,
  DISCORD_GUILDID: process.env.DISCORD_GUILDID,
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
  S3_ACCESS_SECRET: process.env.S3_ACCESS_SECRET,
}
