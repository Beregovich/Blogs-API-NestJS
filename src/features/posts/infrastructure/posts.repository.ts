import { BlogType, LikeAction, PostType } from '../../../types/types';
import mongoose from 'mongoose';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IPostsRepository } from '../posts.service';
import { InjectModel } from '@nestjs/mongoose';
import { BlogsService } from '../../blogs/application/blogs.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class PostsMongoRepository implements IPostsRepository {
  constructor(
    @InjectModel('Posts') private postsModel,
    @InjectModel('blogs') private blogsModel,
    private readonly usersService: UsersService,
    private readonly blogsService: BlogsService,
  ) {}
  private defaultLikesInfo: {
    dislikesCount: 0;
    likesCount: 0;
    myStatus: 'None';
    newestLikes: [];
  };

  async getPosts(
    page: number,
    pageSize: number,
    searchNameTerm: string,
    blogId: string | null,
    userId: string | null,
  ) {
    const filter = blogId
      ? { title: { $regex: searchNameTerm ? searchNameTerm : '' }, blogId }
      : { title: { $regex: searchNameTerm ? searchNameTerm : '' } };
    const totalCount = await this.postsModel.countDocuments(filter);
    const pagesCount = Math.ceil(totalCount / pageSize);
    const allPosts = await this.postsModel
      .find(filter, {
        _id: 0,
        __v: 0,
        PostsLikes: 0,
        'extendedLikesInfo._id': 0,
      })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();
    const formattedPosts = allPosts.map((post) => {
      const likes = post.extendedLikesInfo;
      const currentUserLikeStatus = likes.find((l) => l.userId === userId);
      const likesCount = likes.filter((l) => l.action === 'Like').length;
      const dislikesCount = likes.filter((l) => l.action === 'Dislike').length;
      return {
        id: post.id,
        title: post.title,
        shortDescription: post.shortDescription,
        content: post.content,
        blogId: post.blogId,
        addedAt: post.addedAt,
        blogName: post.blogName,
        extendedLikesInfo: {
          likesCount: likesCount,
          dislikesCount: dislikesCount,
          myStatus: currentUserLikeStatus
            ? currentUserLikeStatus.action
            : 'None',
          newestLikes: likes
            .filter((l) => l.action === 'Like')
            .reverse()
            .slice(0, 3)
            .map((like) => ({
              addedAt: like.addedAt,
              userId: like.userId,
              login: like.login,
            })),
        },
      };
    });
    return {
      pagesCount,
      page,
      pageSize,
      totalCount,
      items: formattedPosts,
    };
  }

  async getPostById(id: string) {
    const post = await this.postsModel.findOne({ id }, { _id: 0, __v: 0 });
    if (!post) return null;
    const blog = await this.blogsService.getBlogById(post.blogId);
    if (!blog) return null;
    const blogName = blog.name;
    return {
      addedAt: post.addedAt,
      id: post.id,
      title: post.title,
      shortDescription: post.shortDescription,
      content: post.content,
      blogId: post.blogId,
      blogName,
      extendedLikesInfo: this.defaultLikesInfo,
    };
  }

  async getPostWithLikesById(id: string, userId) {
    const post = await this.postsModel
      .findOne(
        { id },
        {
          _id: 0,
          __v: 0,
          'extendedLikesInfo._id': 0,
        },
      )
      .lean();
    if (!post) throw new NotFoundException();
    const likes = post.extendedLikesInfo;
    const currentUserLikeStatus = likes.find((l) => l.userId === userId);
    const blog = await this.blogsService.getBlogById(post.blogId);
    if (!blog) throw new NotFoundException();
    const blogName = blog?.name;
    const likesCount = likes.filter((l) => l.action === 'Like').length;
    const dislikesCount = likes.filter((l) => l.action === 'Dislike').length;
    return {
      addedAt: post.addedAt,
      id: post.id,
      title: post.title,
      shortDescription: post.shortDescription,
      content: post.content,
      blogId: post.blogId,
      blogName,
      extendedLikesInfo: {
        likesCount: likesCount,
        dislikesCount: dislikesCount,
        myStatus: currentUserLikeStatus ? currentUserLikeStatus.action : 'None',
        newestLikes: likes
          .filter((l) => l.action === 'Like')
          .reverse()
          .slice(0, 3)
          .map((l) => {
            delete l.action;
            return l;
          }),
        //extendedLikesInfo: this.defaultLikesInfo,
      },
    };
  }

  async createPost(newPost: PostType): Promise<PostType | null> {
    const currentDate = new Date();
    const blog = await this.blogsModel.findOne({ id: newPost.blogId });
    if (!blog) return null;
    await this.postsModel.create({
      ...newPost,
      blogName: blog.name,
      addedAt: currentDate,
    });
    const postToReturn = await this.getPostWithLikesById(newPost.id, null);
    return postToReturn;
  }

  async updatePostById(id: string, newPost: PostType) {
    const result = await this.postsModel.updateOne(
      { id },
      {
        $set: {
          title: newPost.title,
          shortDescription: newPost.shortDescription,
          content: newPost.content,
          blogId: newPost.blogId,
        },
      },
    );
    return result.modifiedCount === 1;
  }

  async deletePostById(id: string) {
    const result = await this.postsModel.deleteOne({ id });
    return result.deletedCount === 1;
  }

  async updatePostLike(
    action: string,
    userId: string,
    postId: string,
    addedAt: Date,
  ) {
    if (
      action == LikeAction.Like ||
      action == LikeAction.Dislike ||
      action == LikeAction.None
    ) {
      await this.postsModel.updateOne(
        {
          id: postId,
        },
        { $pull: { extendedLikesInfo: { userId } } },
      );
    } else {
      throw new HttpException(
        { message: [{ field: 'likeStatus', message: 'wrong value' }] },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (action == LikeAction.Like || action == LikeAction.Dislike) {
      const user = await this.usersService.getUserById(userId);
      if (!user) throw new NotFoundException('User from jwt not found');
      const result = await this.postsModel.updateOne(
        { id: postId },
        {
          $push: {
            extendedLikesInfo: {
              action: action,
              userId: userId,
              login: user.accountData.login,
              addedAt,
            },
          },
        },
      );
      if (result.matchedCount == 0) throw new BadRequestException();
      return result;
    }
  }
}
