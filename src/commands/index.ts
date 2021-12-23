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

import { NewCommand } from 'kodeblox';
import { AdminRoles } from './adminRoles';
import { ForbiddenRoles } from './forbiddenRoles';
import { ModRoles } from './modRoles';
import { SqaudronChannels } from './sqaudronChannels';
import { SquadronCategories } from './squadronCategories';
import { SquadronLeaderRoles } from './squadronLeaderRoles';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function allCommands(): [command: NewCommand, ...args: any[]][] {
  return [[AdminRoles], [ForbiddenRoles], [ModRoles], [SqaudronChannels], [SquadronCategories], [SquadronLeaderRoles]];
}
