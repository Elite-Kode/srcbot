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

import { CategoryChannel, GuildChannel, MessageEmbed, TextChannel } from 'discord.js';
import { Responses } from 'kodeblox';
import { SrcModel } from './schemas/src';
import { sampleSize } from 'lodash';

export async function sortChannelCategory(
  guildId: string,
  channel: TextChannel,
  categoryToSelect: string
): Promise<void> {
  const src = await SrcModel.findOne({ guild_id: guildId });
  if (!src) {
    channel.send(Responses.getResponse(Responses.GUILD_NOT_SETUP));
    return;
  }
  const categories: CategoryChannel[] = [];
  if (categoryToSelect === 'all') {
    src.squadron_channel_category_id.forEach((categoryId) => {
      categories.push(channel.guild.channels.cache.get(categoryId) as CategoryChannel);
    });
  } else {
    const index = src.squadron_channel_category_id.indexOf(categoryToSelect);
    if (index >= 0) {
      categories.push(channel.guild.channels.cache.get(categoryToSelect) as CategoryChannel);
    } else {
      const categoryToSelectObject = getChannelCategoryFromName(channel, categoryToSelect);
      if (!categoryToSelectObject) {
        channel.send(Responses.getResponse(Responses.ID_NOT_FOUND));
        return;
      }
      categories.push(categoryToSelectObject);
    }
  }
  if (categories.length === 0) {
    channel.send(Responses.getResponse(Responses.ID_NOT_FOUND));
    return;
  }
  for (const category of categories) {
    const channelsToSort = channel.guild.channels.cache
      .filter((channel) => channel.parentId === category.id)
      .map((channel) => channel as GuildChannel);
    channelsToSort.sort((firstChannel, secondChannel) => {
      const firstChannelName = firstChannel.name.startsWith('💎')
        ? firstChannel.name.slice(2).toLowerCase()
        : firstChannel.name.toLowerCase();
      const secondChannelName = secondChannel.name.startsWith('💎')
        ? secondChannel.name.slice(2).toLowerCase()
        : secondChannel.name.toLowerCase();
      if (firstChannelName > secondChannelName) {
        return 1;
      }
      if (firstChannelName < secondChannelName) {
        return -1;
      }
      return 0;
    });
    for (let i = 0; i < channelsToSort.length; i++) {
      if (channelsToSort[i].position !== i) {
        await channelsToSort[i].setPosition(i);
      }
    }
  }
}

export async function getRandomSquadronEmbed(
  guildId: string,
  channel: TextChannel,
  numberToSelect: number,
  categoryToSelect: string
): Promise<MessageEmbed | void> {
  const src = await SrcModel.findOne({ guild_id: guildId });
  if (src) {
    const categories: CategoryChannel[] = [];
    if (categoryToSelect === 'all') {
      src.squadron_channel_category_id.forEach((categoryId) => {
        categories.push(channel.guild.channels.cache.get(categoryId) as CategoryChannel);
      });
    } else {
      const index = src.squadron_channel_category_id.indexOf(categoryToSelect);
      if (index >= 0) {
        categories.push(channel.guild.channels.cache.get(categoryToSelect) as CategoryChannel);
      } else {
        const categoryToSelectObject = getChannelCategoryFromName(channel, categoryToSelect);
        if (categoryToSelectObject) {
          categories.push(categoryToSelectObject);
        } else {
          channel.send(Responses.getResponse(Responses.ID_NOT_FOUND));
          return;
        }
      }
    }
    if (categories.length === 0) {
      channel.send(Responses.getResponse(Responses.ID_NOT_FOUND));
      return;
    }
    let channelsToSelect = channel.guild.channels.cache
      .filter((channel) => !!channel.parentId && categories.map((category) => category.id).includes(channel.parentId))
      .toJSON();
    channelsToSelect = sampleSize(channelsToSelect, numberToSelect);
    const embed = new MessageEmbed();
    embed.setTitle('Selected Squadrons');
    embed.setColor([255, 0, 255]);
    embed.setTimestamp(new Date());
    let idList = '';
    channelsToSelect.forEach((channel) => {
      idList += `${channel.id} - #${channel.name}\n`;
    });
    embed.addField('Ids and Names', idList);
    return embed;
  } else {
    channel.send(Responses.getResponse(Responses.GUILD_NOT_SETUP));
  }
}

export function getChannelCategoryFromName(
  channel: TextChannel,
  categoryName: string,
  iteration?: number
): CategoryChannel {
  return channel.guild.channels.cache.find(
    (channel) =>
      channel.name.toLowerCase() === `${categoryName.toLowerCase()} squadrons${iteration ? ` ${iteration}` : ``}`
  ) as CategoryChannel;
}
