/*
 * KodeBlox Copyright 2018 Sayak Mukhopadhyay
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http: //www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { CategoryChannel, Message, MessageEmbed, Permissions, TextChannel } from 'discord.js';
import { sampleSize } from 'lodash';
import App from '../../../server';
import { Responses } from '../responseDict';
import { DB } from '../../../db';
import { Access } from '../access';
import { Command } from "../../../interfaces/Command";

export class ChooseSquadron implements Command {
    db: DB;
    dm: boolean;
    dmAble = false;

    constructor(dm = false) {
        this.db = App.db;
        this.dm = dm;
    }

    exec(message: Message, commandArguments: string): void {
        let argsArray: string[] = [];
        if (commandArguments.length !== 0) {
            argsArray = commandArguments.split(" ");
        }
        if (argsArray.length > 0) {
            let command = argsArray[0].toLowerCase();
            if (this[command]) {
                this[command](message, argsArray);
            } else {
                message.channel.send(Responses.getResponse(Responses.NOTACOMMAND));
            }
        } else {
            message.channel.send(Responses.getResponse(Responses.NOPARAMS));
        }
    }

    checkAndMapAlias(command: string) {
        switch (command) {
            case 'g':
                return 'get';
            default:
                return command;
        }
    }

    async get(message: Message, argsArray: string[]) {
        try {
            await Access.has(message.author, message.guild, [Access.ADMIN, Access.MOD, Access.FORBIDDEN]);
            if (argsArray.length === 3) {
                let guildId = message.guild.id;
                let numberToSelect = +argsArray[1];
                let categoryToSelect = argsArray[2];
                try {
                    let flags = Permissions.FLAGS;
                    if (message.guild.me.permissionsIn(message.channel).has([flags.EMBED_LINKS])) {
                        let embed = await this.getRandomSquadronEmbed(guildId, message.channel as TextChannel, numberToSelect, categoryToSelect);
                        if (this.dm) {
                            message.channel.send("I have DM'd the result to you");
                            message.member.send(embed);
                        } else {
                            message.channel.send(embed);
                        }
                    } else {
                        try {
                            message.channel.send(Responses.getResponse(Responses.EMBEDPERMISSION));
                        } catch (err) {
                            App.bugsnagClient.call(err);
                        }
                    }
                } catch (err) {
                    message.channel.send(Responses.getResponse(Responses.FAIL));
                    App.bugsnagClient.call(err);
                }
            } else if (argsArray.length > 3) {
                message.channel.send(Responses.getResponse(Responses.TOOMANYPARAMS));
            } else {
                message.channel.send(Responses.getResponse(Responses.NOPARAMS));
            }
        } catch (err) {
            message.channel.send(Responses.getResponse(Responses.INSUFFICIENTPERMS));
        }
    }

    public async getRandomSquadronEmbed(guildId: string, channel: TextChannel, numberToSelect: number, categoryToSelect: string): Promise<MessageEmbed> {
        let guild = await this.db.model.guild.findOne({guild_id: guildId});
        if (guild) {
            let categories: CategoryChannel[] = []
            if (categoryToSelect === 'all') {
                guild.squadron_channel_category_id.forEach(categoryId => {
                    categories.push(channel.guild.channels.cache.get(categoryId) as CategoryChannel)
                })
            } else {
                let index = guild.squadron_channel_category_id.indexOf(categoryToSelect)
                if (index >= 0) {
                    categories.push(channel.guild.channels.cache.get(categoryToSelect) as CategoryChannel)
                } else {
                    await channel.send(Responses.getResponse(Responses.FAIL));
                    channel.send(Responses.getResponse(Responses.IDNOTFOUND));
                    return
                }
            }
            if (categories.length === 0) {
                await channel.send(Responses.getResponse(Responses.FAIL));
                channel.send(Responses.getResponse(Responses.IDNOTFOUND));
                return
            }
            let channelsToSelect = channel.guild.channels.cache.filter(channel => categories.map(category => category.id).includes(channel.parentID)).array()
            channelsToSelect = sampleSize(channelsToSelect, numberToSelect)
            let embed = new MessageEmbed()
            embed.setTitle("Selected Squadrons")
            embed.setColor([255, 0, 255]);
            embed.setTimestamp(new Date());
            let idList = "";
            channelsToSelect.forEach(channel => {
                idList += `${channel.id} - #${channel.name}\n`;
            })
            embed.addField("Ids and Names", idList);
            return embed
        } else {
            await channel.send(Responses.getResponse(Responses.FAIL));
            channel.send(Responses.getResponse(Responses.GUILDNOTSETUP));
        }
    }

    help(): [string, string, string, string[]] {
        return [
            'choosesquad(aliases: chsq), choosesquaddm(aliases: chsqdm)',
            'Selects a certain number of squadrons',
            'choosesquad <get> <number> <all|channel category id>\nchoosesquad <g> <number> <all|channel category id>',
            [
                '`@SRCBot choosesquad get 3 all`',
                '`@SRCBot chsq g 4 1234564789012345678`',
                '`@SRCBot choosesquaddm get 3 123456789012345678`'
            ]
        ];
    }
}
