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

import { GuildModel, IAccess } from 'kodeblox';
import { Guild, Permissions, User } from 'discord.js';
import { SrcModel } from '../schemas/src';

export const SQUADRON_LEADER = 'squadron';

export class SquadronLeader implements IAccess {
  public priority = 3;

  public async has(author: User, guild: Guild, perms: string[], allowAdmin = false): Promise<boolean> {
    const member = await guild.members.fetch(author);
    if (allowAdmin && member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
      return true;
    } else {
      const guildId = guild.id;
      const roles = member.roles.cache;
      const dbGuild = await GuildModel.findOne({ guild_id: guildId });
      if (dbGuild) {
        const dbSrc = await SrcModel.findById(dbGuild._id);
        if (dbSrc) {
          for (const perm of perms) {
            if (perm === SQUADRON_LEADER) {
              const squadronLeaderRolesId = dbSrc.squadron_leader_roles_id;
              for (const role of squadronLeaderRolesId) {
                if (roles.has(role)) {
                  return true;
                }
              }
            }
          }
        }
      }
    }
    return false;
  }
}
