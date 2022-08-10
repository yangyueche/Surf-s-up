import { SlashCommandBuilder } from '@discordjs/builders'
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'
import config from './config'

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
].map((command) => command.toJSON())

const rest = new REST({ version: '9' }).setToken(config.DISCORD_TOKEN!)

rest
  .put(Routes.applicationGuildCommands(config.clientId!, config.guildId!), {
    body: commands,
  })
  .then(() => console.log('Commamnds Successfully registered!'))
  .catch(console.error)
