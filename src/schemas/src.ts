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

import { Document, model, Schema, ObjectId } from 'mongoose';

export interface Src {
  guild_id: ObjectId;
  mod_roles_id: string[];
  squadron_leader_roles_id: string[];
  squadron_channel_category_id: string[];
  squadron_platforms: string[];
  created_at: Date;
  updated_at: Date;
}

export interface ISrcSchema extends Document, Src {}

export const SrcSchema = new Schema<ISrcSchema>(
  {
    guild_id: {
      type: Schema.Types.ObjectId,
      required: true
    },
    mod_roles_id: [String],
    squadron_leader_roles_id: [String],
    squadron_channel_category_id: [String],
    squadron_platforms: [String]
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
);

export const SrcModel = model('SRC', SrcSchema, 'src');
