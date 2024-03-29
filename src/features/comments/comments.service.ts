import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import {
  CommentType,
  EntityWithPaginationType,
  LikeAction,
  LikeType,
  QueryDataType,
} from '../../types/types';
import { CommentsRepository } from './comments.repository';
import { LikesService } from '../likes/application/likes.service';

@Injectable()
export class CommentsService {
  constructor(
    private commentsRepository: CommentsRepository,
    private readonly likesService: LikesService,
  ) {}
  private defaultLikesInfo: {
    dislikesCount: 0;
    likesCount: 0;
    myStatus: 'None';
  };
  async getCommentsByPostId(
    paginationData: QueryDataType,
    PostId: string | null,
    userId: string | null = null,
  ) {
    const comments = this.commentsRepository.getCommentsByPostId(
      paginationData,
      PostId,
      userId,
    );
    return comments;
  }

  async getCommentById(commentId: string, userId: string | null) {
    const result = this.commentsRepository.getCommentById(commentId, userId);
    return result;
  }

  async updateCommentById(commentId: string, content: string) {
    const comment = this.commentsRepository.updateCommentById(
      commentId,
      content,
    );
    return comment;
  }

  async createComment(
    content: string,
    postId: string,
    userLogin: string,
    userId: string,
  ) {
    const newComment = {
      id: uuidv4(),
      content,
      userId,
      postId,
      userLogin,
      addedAt: new Date(),
      likesInfo: this.defaultLikesInfo,
    };
    const result = this.commentsRepository.createComment(newComment);
    return result;
  }

  async deleteComment(id: string): Promise<boolean> {
    return this.commentsRepository.deleteComment(id);
  }

  async updateLikeByCommentId(
    commentId: string,
    likeStatus: string,
    userId: string,
  ) {
    const currentDate = new Date();
    const result = this.commentsRepository.updateLikeByCommentId(
      commentId,
      likeStatus,
      userId,
      currentDate,
    );
    return result;
  }
}

export interface ICommentsRepository {
  getCommentsByPostId(
    paginationData: QueryDataType,
    PostId: string | null,
    userId: string | null,
  ): Promise<EntityWithPaginationType<CommentType[]>>;

  getCommentById(
    commentId: string,
    userId: string | null,
  ): Promise<CommentType | null>;

  updateCommentById(commentId: string, content: string): any;

  createComment(newComment: CommentType): Promise<CommentType | null>;

  deleteComment(id: string): Promise<boolean>;
}
