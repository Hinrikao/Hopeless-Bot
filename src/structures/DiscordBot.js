const {
  Client,
  Collection,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ApplicationCommandType,
  REST,
  Routes,
} = require("discord.js");
const colors = require("colors");
const { loadFiles } = require("../utils/loadFiles.js");
const { AntiCrash } = require("../helpers/AntiCrash.js");
const { DateTime } = require("luxon");
const { Logger } = require("../helpers/Logger.js");
const { initializeMongoose } = require("../database/connect.js");

class DiscordBot extends Client {
  /**
   *
   * @param {import("discord.js").ClientOptions} options
   */
  constructor(options) {
    super(options);

    this.logger = new Logger(`${process.cwd()}/logs`);
    this.config = require(`${process.cwd()}/config.js`);
    this.colors = require(`${process.cwd()}/colors.json`);
    this.pkg = require(`${process.cwd()}/package.json`);

    this.cooldowns = new Collection();

    /**@type {Collection<string, import("./SlashCommand")} */
    this.slashCommands = new Collection();
    this.contextCommands = new Collection();

    /**
     * @type {Collection<string, import('@structures/Command')>}
     */
    this.slashCommands = new Collection(); // store slash commands

    /**
     * @type {Collection<string, import('@structures/BaseContext')>}
     */
    this.contextMenus = new Collection(); // store contextMenus

    /**
     * @type {import('@structures/Command')[]}
     */
    this.commands = []; // store actual command
    this.commandIndex = new Collection(); // store (alias, arrayIndex) pair

    //this.deletedMessages = new WeakSet();
    //this.getLavalink = getLavalink;
    //this.getChannel = getChannel;
    //this.ms = prettyMilliseconds;
    //this.commandsRan = 0;
    //this.songsPlayed = 0;

    //this.counterUpdateQueue = []; // store guildId's that needs counter update

    //if (this.config.music.enabled) this.musicManager = lavaclient(this);

    //if (this.config.giveaway.enabled) {
    //  this.giveawaysManager = giveawaysHandler(this);
    //}

    //this.discordTogether = new DiscordTogether(this);

    this.build();
  }

  /**
   * @param {String} string
   */
  log(string) {
    this.logger.log(string);
  }

  /**
   * @param {String} string
   */
  warn(string) {
    this.logger.warn(string);
  }

  /**
   * @param {String} string
   */
  error(string) {
    this.logger.error(string);
  }

  /**
   * @param {String} string
   */
  debug(string) {
    this.logger.debug(string);
  }

  /**
   *
   * @param {String} string
   * @param {Object} options
   * @returns
   */
  async logBox(string, options) {
    const boxen = await import("boxen");
    if (!typeof string === "string" || !typeof options === "object") return;
    console.log(boxen.default(string, options));
  }

  /**
   *@param {String} dir
   */
  async loadEvents(dir) {
    const files = await loadFiles(dir);

    let i = 0;
    for (const file of files) {
      const eventObject = require(file);
      const execute = (...args) => eventObject.execute(this, ...args);
      const target = eventObject.rest ? this.rest : this;

      target[eventObject.once ? "once" : "on"](eventObject.name, execute);
      i++;
    }

    this.log(colors.yellow(` | loaded ${i} events.`));
  }

  async loadCommands() {
    const rest = new REST({ version: 10 }).setToken(this.config.bot.token);
    const files = await loadFiles(`${process.cwd()}/src/commands`);
    const applicationCommands = [];
    this.slashCommands.clear();

    let i = 0;
    for (const file of files) {
      const object = require(file);

      if (object.enabled) continue;
      if (object.cooldown) {
        this.cooldowns.set(object.data?.name, new Collection());
      }

      applicationCommands.push(object.data);
      this.slashCommands.set(object.data.name, object);
      i++;
    }

    rest.put(
      Routes.applicationGuildCommands(this.config.bot.id, this.config.serverId),
      {
        body: applicationCommands,
      },
    );
    this.log(colors.blue(` | loaded ${i} commands.`));
  }

  async build() {
    if (this.config.antiCrash) AntiCrash(this);

    try {
      console.clear();
      await this.logBox(
        [
          `Welcome to ${colors.blue(
            this.pkg.name.toUpperCase(),
          )} github project`,
          `Running on Node.Js ${colors.green(process.version)}`,
          `Bot's version ${colors.yellow(this.pkg.version)}`,
          `Coded with 💖 by ${colors.cyan(this.pkg.author.name)}`,
        ].join("\n"),
        {
          borderColor: "#00BFFF",
          stringAlignment: "center",
          padding: {
            left: 8,
            right: 8,
            top: 1,
            bottom: 1,
          },
        },
      );
      this.login(this.config.bot.token);
      await this.loadEvents(`${process.cwd()}/src/events`);
      await this.loadCommands();
      initializeMongoose(this);
    } catch (error) {
      throw error;
    }
  }

  /**
   *
   * @param {import("discord.js").TextChannel} textChannel
   * @param {import("discord.js").VoiceChannel} voiceChannel
   */
  createPlayer(textChannel, voiceChannel) {
    return this.manager.create({
      guild: textChannel.guild.id,
      voiceChannel: voiceChannel.id,
      textChannel: textChannel.id,
      selfDeafen: this.config.serverDeafen,
      volume: this.config.defaultVolume,
    });
  }

  createController(guild, player) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setStyle("DANGER")
        .setCustomId(`controller:${guild}:Stop`)
        .setEmoji("⏹️"),

      new ButtonBuilder()
        .setStyle("PRIMARY")
        .setCustomId(`controller:${guild}:Replay`)
        .setEmoji("⏮️"),

      new ButtonBuilder()
        .setStyle(player.playing ? "PRIMARY" : "DANGER")
        .setCustomId(`controller:${guild}:PlayAndPause`)
        .setEmoji(player.playing ? "⏸️" : "▶️"),

      new ButtonBuilder()
        .setStyle("PRIMARY")
        .setCustomId(`controller:${guild}:Next`)
        .setEmoji("⏭️"),

      new ButtonBuilder()
        .setStyle(
          player.trackRepeat
            ? "SUCCESS"
            : player.queueRepeat
              ? "SUCCESS"
              : "DANGER",
        )
        .setCustomId(`controller:${guild}:Loop`)
        .setEmoji(player.trackRepeat ? "🔂" : player.queueRepeat ? "🔁" : "🔁"),
    );
  }
}

module.exports = { DiscordBot };
