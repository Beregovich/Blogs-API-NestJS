import { PostType } from '../../../types/types';
import { Injectable, NotFoundException } from '@nestjs/common';
import { IPostsRepository } from '../posts.service';

import { InjectModel } from '@nestjs/mongoose';
import { BlogsService } from '../../blogs/application/blogs.service';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class PostsSqlRepository implements IPostsRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getPosts(
    page: number,
    pageSize: number,
    searchNameTerm: string,
    blogId: string | null,
  ) {
    const filterByblog = blogId ? blogId : '';
    const totalCount = await this.dataSource.query(
      `SELECT COUNT(id) FROM public."Posts"
              WHERE "title" like $1 
              AND "blogId" like $2`,
      [`%${searchNameTerm}%`, `%${filterByblog}%`],
    );
    const pagesCount = Math.ceil(totalCount[0].count / pageSize);
    const allPosts = await this.dataSource.query(
      `
    SELECT to_jsonb("Posts") FROM "Posts"
    WHERE "title" like $1
    AND "blogId" like $2
    ORDER BY "title" DESC
    OFFSET $3 ROWS FETCH NEXT $4 ROWS ONLY
    `,
      [
        `%${searchNameTerm}%`,
        `%${filterByblog}%`,
        (page - 1) * pageSize,
        pageSize,
      ],
    );
    const items: PostType[] = [];
    return {
      pagesCount,
      page,
      pageSize,
      totalCount,
      items: allPosts,
    };
  }

  async getPostById(id: string) {
    const post = await this.dataSource.query(
      `
      SELECT to_jsonb("Posts"),
         (SELECT name FROM "blogs"
         WHERE "blogId" = Posts.blogId) AS blogName
      FROM "blogs"
      WHERE "id" = $1
      `,
      [id],
    );
    if (!post) return null;
    const postDocument = post[0].to_jsonb;
    return {
      id: postDocument.id,
      title: postDocument.title,
      shortDescription: postDocument.shortDescription,
      content: postDocument.content,
      blogId: postDocument.blogId,
      blogName: postDocument.blogName,
      addedAt: postDocument.addetAt,
      extendedLikesInfo: {
        dislikesCount: 0,
        likesCount: 0,
        myStatus: 'None',
        newestLikes: [],
      },
    };
  }

  async getPostWithLikesById(id: string) {
    const post = await this.dataSource.query(
      `
      SELECT P."id", P."title", B."name" AS blogName,
         /*(SELECT name FROM "blogs"
         WHERE "id" = P."blogId") AS blogName,*/
         COALESCE((SELECT COUNT(*) FROM "PostsLikes"
            GROUP BY "id"
            HAVING "likeStatus" = 'Like' 
            AND "postId" = P."id"), 0) AS likesCount,
         COALESCE((SELECT COUNT(*) FROM "PostsLikes"
            GROUP BY id
            HAVING "likeStatus" = 'Dislike'
            AND "postId" = P."id"), 0) AS dislikesCount,
         COALESCE((SELECT "likeStatus" FROM "PostsLikes"
            WHERE "postId" = P."id"
            AND "userId" = $2), 'None') AS myStatus
      FROM "Posts" AS P INNER JOIN "blogs" AS B ON P."blogId" = B."id"
      WHERE P."id" = $1
      `,
      [id, null],
    );
    if (post) {
      return post[0].to_jsonb;
    } else return null;
    if (!post) return false;
    return {
      id: post.id,
      title: post.title,
      shortDescription: post.shortDescription,
      content: post.content,
      blogId: post.blogId,
      blogName: post.blogName,
    };
  }

  async createPost(newPost: PostType): Promise<PostType | null> {
    await this.dataSource.query(
      `
    INSERT INTO "Posts" ("id", "title", "shortDescription", "content", "blogId")
    VALUES ($1, $2, $3, $4, $5)
    RETURNING ("id", "title", "shortDescription", "content", "blogId");
    `,
      [
        newPost.id,
        newPost.title,
        newPost.shortDescription,
        newPost.content,
        newPost.blogId,
      ],
    );
    const blog = await this.dataSource.query(
      `
      SELECT to_jsonb("Posts") FROM "Posts"
      WHERE id = $1
      `,
      [newPost.id],
    );
    return blog[0].to_jsonb;
  }

  async updatePostById(id: string, newPost: PostType) {
    const result = await this.dataSource.query(
      `
    UPDATE "Posts"
    SET "title"=$1, 
    "shortDescription"=$2, 
    "content"=$3, 
    "blogId"=$4
    WHERE id = $5
    `,
      [
        newPost.title,
        newPost.shortDescription,
        newPost.content,
        newPost.blogId,
        id,
      ],
    );
    if (result[1] === 0)
      throw new NotFoundException({ field: 'id', message: 'not found' });
    return null;
  }

  async deletePostById(id: string) {
    const result = await this.dataSource.query(
      `
    DELETE FROM "Posts"
    WHERE id = $1
    `,
      [id],
    );
    if (result[1] === 0)
      throw new NotFoundException({ field: 'id', message: 'not found' });
    return null;
  }

  async updatePostLike(
    action: string,
    userId: string,
    postId: string,
    addedAt: Date,
  ) {
    return null;
  }
}
