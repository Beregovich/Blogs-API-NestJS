import { Prop, SchemaFactory } from '@nestjs/mongoose';
import { Schema } from 'mongoose';

export class PostsWithLikes {
  id: string;
  title: string;
  shortDescription: string;
  content: string;
  blogId: string;
  blogName: string;
  Likes: [{ type: Schema.Types.ObjectId; ref: 'PostsLikes' }];
}
export const PostsWithLikesSchema =
  SchemaFactory.createForClass(PostsWithLikes);
