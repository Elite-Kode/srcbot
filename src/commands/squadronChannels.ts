/*
 * Copyright 2021 Sayak Mukhopadhyay
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Access, ADMIN, Command, FORBIDDEN, GuildModel, IGuildSchema, LoggingClient, Responses } from 'kodeblox';
import { GuildChannel, Message, Permissions, TextChannel } from 'discord.js';
import { MOD } from '../accesses/mod';
import { SQUADRON_LEADER } from '../accesses/squadronLeader';
import { ISrcSchema, SrcModel } from '../schemas/src';
import {
  getArchiveCategory,
  getChannelCategoryFromName,
  getRandomSquadronEmbed,
  removeTick,
  sortChannelCategory
} from '../squadronChannels';

export class SquadronChannels implements Command {
  respondDm = false;
  sendDm = false;
  respondAsDm: boolean;
  calls = ['squadchannels', 'sqch'];
  dmCalls = [];
  arguments = {
    random: this.random.bind(this),
    rnd: this.random.bind(this),
    create: this.create.bind(this),
    sort: this.sort.bind(this),
    removeticks: this.removeTicks.bind(this),
    rt: this.removeTicks.bind(this),
    archive: this.archive.bind(this),
    ar: this.archive.bind(this)
  };

  constructor() {
    this.respondAsDm = false;
  }

  exec(message: Message, _commandArguments: string, argsArray: string[]): void {
    if (argsArray.length <= 0) {
      message.channel.send(Responses.getResponse(Responses.NO_PARAMS));
      return;
    }
    type ArgumentKeys = keyof typeof this.arguments;
    const allowedArguments = Object.keys(this.arguments) as Array<ArgumentKeys>;
    const command = argsArray[0].toLowerCase() as ArgumentKeys;
    if (!allowedArguments.includes(command)) {
      message.channel.send(Responses.getResponse(Responses.NOT_A_COMMAND));
      return;
    }
    this.arguments[command](message, argsArray);
  }

  async random(message: Message, argsArray: string[]): Promise<void> {
    if (!message.member || !message.guild || !message.guildId) {
      message.channel.send(Responses.getResponse(Responses.NOT_A_GUILD));
      return;
    }
    const permission = await Access.has(message.author, message.guild, [ADMIN, FORBIDDEN], true);
    if (!permission) {
      message.channel.send(Responses.getResponse(Responses.INSUFFICIENT_PERMS));
      return;
    }
    const numberToSelect = +argsArray[1];
    const categoryToSelect = argsArray[2];
    let guild: IGuildSchema | null;
    try {
      guild = await GuildModel.findOne({ guild_id: message.guildId });
    } catch (err) {
      message.channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(err);
      return;
    }
    if (!guild) {
      message.channel.send(Responses.getResponse(Responses.GUILD_NOT_SETUP));
      return;
    }
    const embed = await getRandomSquadronEmbed(guild, message.channel as TextChannel, numberToSelect, categoryToSelect);
    if (embed) {
      message.channel.send({ embeds: [embed] });
    }
  }

  async create(message: Message, argsArray: string[]): Promise<void> {
    if (!message.member || !message.guild || !message.guildId) {
      message.channel.send(Responses.getResponse(Responses.NOT_A_GUILD));
      return;
    }
    const permission = await Access.has(message.author, message.guild, [ADMIN, MOD, SQUADRON_LEADER, FORBIDDEN]);
    if (!permission) {
      message.channel.send(Responses.getResponse(Responses.INSUFFICIENT_PERMS));
      return;
    }
    if (argsArray.length < 4) {
      message.channel.send(Responses.getResponse(Responses.NO_PARAMS));
      return;
    }
    const platforms = argsArray[1].match(/.{1,2}/g);
    const categoryName = argsArray[2];
    const name = argsArray.slice(3);
    let guild: IGuildSchema | null;
    try {
      guild = await GuildModel.findOne({ guild_id: message.guildId });
    } catch (err) {
      message.channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(err);
      return;
    }
    if (!guild) {
      message.channel.send(Responses.getResponse(Responses.GUILD_NOT_SETUP));
      return;
    }
    let src: ISrcSchema | null;
    try {
      src = await SrcModel.findOne({ guild_id: guild._id });
    } catch (err) {
      message.channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(err);
      return;
    }
    if (!src || !src.squadron_platforms || src.squadron_platforms.length === 0) {
      message.channel.send("You don't have any squadron platforms set up");
      return;
    }
    if (!src || !src.squadron_channel_category_id || src.squadron_channel_category_id.length === 0) {
      message.channel.send("You don't have any squadron channel category ids set up");
      return;
    }
    let categoryObject = getChannelCategoryFromName(message.channel as TextChannel, categoryName);
    let count = 2;
    while (categoryObject.children.size === 50) {
      categoryObject = getChannelCategoryFromName(message.channel as TextChannel, categoryName, count);
      count++;
    }
    if (!platforms || !platforms.every((platform) => src?.squadron_platforms.includes(platform))) {
      message.channel.send("Platform doesn't exist. Please contact a moderator for help.");
      return;
    }
    if (!categoryObject || src.squadron_channel_category_id.findIndex((item) => item === categoryObject.id) === -1) {
      message.channel.send("Category doesn't exist. Please contact a moderator for help.");
      return;
    }
    const channelName = `${name.join('-').toLowerCase()}-${platforms.sort().join('').toLowerCase()}`;
    if (message.guild.channels.cache.some((channel) => channel.name === channelName)) {
      message.channel.send('A channel already exists for this squadron name and platform.');
      return;
    }
    await message.guild.channels.create(channelName, {
      parent: categoryObject,
      permissionOverwrites: [
        {
          id: message.author.id,
          allow: [Permissions.FLAGS.MANAGE_CHANNELS, Permissions.FLAGS.MANAGE_MESSAGES]
        },
        ...categoryObject.permissionOverwrites.cache.toJSON()
      ]
    });
    await sortChannelCategory(guild, message.channel as TextChannel, categoryObject.id);
    message.channel.send(Responses.getResponse(Responses.SUCCESS));
  }

  async sort(message: Message, argsArray: string[]): Promise<void> {
    message.channel.send('Sorting...');
    if (!message.member || !message.guild || !message.guildId) {
      message.channel.send(Responses.getResponse(Responses.NOT_A_GUILD));
      return;
    }
    const permission = await Access.has(message.author, message.guild, [ADMIN, MOD, FORBIDDEN]);
    if (!permission) {
      message.channel.send(Responses.getResponse(Responses.INSUFFICIENT_PERMS));
      return;
    }
    if (argsArray.length > 2) {
      message.channel.send(Responses.getResponse(Responses.TOO_MANY_PARAMS));
      return;
    }
    if (argsArray.length < 2) {
      message.channel.send(Responses.getResponse(Responses.NO_PARAMS));
      return;
    }
    const categoryToSelect = argsArray[1];
    let guild: IGuildSchema | null;
    try {
      guild = await GuildModel.findOne({ guild_id: message.guildId });
    } catch (err) {
      message.channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(err);
      return;
    }
    if (!guild) {
      message.channel.send(Responses.getResponse(Responses.GUILD_NOT_SETUP));
      return;
    }
    await sortChannelCategory(guild, message.channel as TextChannel, categoryToSelect);
    message.channel.send(Responses.getResponse(Responses.SUCCESS));
  }

  async removeTicks(message: Message, argsArray: string[]): Promise<void> {
    if (!message.member || !message.guild || !message.guildId) {
      message.channel.send(Responses.getResponse(Responses.NOT_A_GUILD));
      return;
    }
    const permission = await Access.has(message.author, message.guild, [ADMIN, MOD, FORBIDDEN]);
    if (!permission) {
      message.channel.send(Responses.getResponse(Responses.INSUFFICIENT_PERMS));
      return;
    }
    if (argsArray.length > 1) {
      message.channel.send(Responses.getResponse(Responses.TOO_MANY_PARAMS));
      return;
    }
    let guild: IGuildSchema | null;
    try {
      guild = await GuildModel.findOne({ guild_id: message.guildId });
    } catch (err) {
      message.channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(err);
      return;
    }
    if (!guild) {
      message.channel.send(Responses.getResponse(Responses.GUILD_NOT_SETUP));
      return;
    }
    await removeTick(guild, message.channel as TextChannel);
    message.channel.send(Responses.getResponse(Responses.SUCCESS));
  }

  async archive(message: Message, argsArray: string[]): Promise<void> {
    if (!message.member || !message.guild || !message.guildId) {
      message.channel.send(Responses.getResponse(Responses.NOT_A_GUILD));
      return;
    }
    const permission = await Access.has(message.author, message.guild, [ADMIN, MOD, FORBIDDEN]);
    if (!permission) {
      message.channel.send(Responses.getResponse(Responses.INSUFFICIENT_PERMS));
      return;
    }
    if (argsArray.length < 2) {
      message.channel.send(Responses.getResponse(Responses.NO_PARAMS));
      return;
    }
    if (argsArray.length > 2) {
      message.channel.send(Responses.getResponse(Responses.TOO_MANY_PARAMS));
      return;
    }
    const name = argsArray[1];
    let guild: IGuildSchema | null;
    try {
      guild = await GuildModel.findOne({ guild_id: message.guildId });
    } catch (err) {
      message.channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(err);
      return;
    }
    if (!guild) {
      message.channel.send(Responses.getResponse(Responses.GUILD_NOT_SETUP));
      return;
    }
    let src: ISrcSchema | null;
    try {
      src = await SrcModel.findOne({ guild_id: guild._id });
    } catch (err) {
      message.channel.send(Responses.getResponse(Responses.FAIL));
      LoggingClient.error(err);
      return;
    }
    let categoryObject = getArchiveCategory(message.channel as TextChannel);
    let count = 2;
    while (categoryObject.children.size === 50) {
      categoryObject = getArchiveCategory(message.channel as TextChannel, count);
      count++;
    }
    const channelObject = message.guild.channels.cache.find(
      (channel) =>
        (channel.name.startsWith('💎') ? channel.name.slice(2).toLowerCase() : channel.name.toLowerCase()) ===
        name.toLowerCase()
    ) as GuildChannel;
    if (
      !src ||
      !channelObject ||
      src.squadron_channel_category_id.findIndex((item) => item === channelObject.parentId) === -1
    ) {
      message.channel.send('Channel does not exist or is not a squadron channel');
      return;
    }
    await channelObject.setParent(categoryObject, { lockPermissions: false });
    const permissionOverwrites = new Map(channelObject.permissionOverwrites.cache.entries());
    for (const overwrite of permissionOverwrites) {
      if (overwrite[1].type === 'member' && overwrite[1].allow.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
        let member = message.guild.members.cache.get(overwrite[1].id);
        if (!member) {
          // If not found, retry after fetching
          await message.guild.members.fetch();
          member = message.guild.members.cache.get(overwrite[1].id);
        }
        if (member && member.roles.cache.hasAny(...src.squadron_leader_roles_id)) {
          const dmChannel = await member.createDM();
          dmChannel.send('Lmao, you suck');
        }
      }
    }
    message.channel.send(Responses.getResponse(Responses.SUCCESS));
  }

  help(): [string, string, string, string[]] {
    return [
      'squadchannels(aliases: sqch)',
      'Performs operations on squadron channels',
      'squadchannels <get|random|create> <number> <all|channel category id|channel category name>',
      [
        '`@SRCBot squadchannels get 3 all`',
        '`@SRCBot squadchannels random 2 general`',
        '`@SRCBot squadchannels create pcps general my squadron`',
        '`@SRCBot sqch g 4 1234564789012345678`',
        '`@SRCBot squadchannels get 3 123456789012345678`'
      ]
    ];
  }
}
