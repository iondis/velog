// @flow
import React, { Component, Fragment } from 'react';
import PostHead from 'components/post/PostHead';
import PostContent from 'components/post/PostContent';
import PostTags from 'components/post/PostTags';
import { PostsActions } from 'store/actionCreators';
import { connect } from 'react-redux';
import type { State } from 'store';
import type { PostData, TocItem } from 'store/modules/posts';
import PostToc from 'components/post/PostToc';

type Props = {
  username: ?string,
  urlSlug: ?string,
  post: ?PostData,
  toc: ?(TocItem[]),
  activeHeading: ?string,
  likeInProcess: boolean,
};

class PostViewer extends Component<Props> {
  initialize = async () => {
    const { username, urlSlug } = this.props;
    if (!username || !urlSlug) return;
    try {
      PostsActions.readPost({
        username,
        urlSlug,
      });
    } catch (e) {
      console.log(e);
    }
  };

  onSetToc = (toc: ?(TocItem[])) => {
    PostsActions.setToc(toc);
  };

  onActivateHeading = (headingId: string) => {
    PostsActions.activateHeading(headingId);
  };

  onToggleLike = () => {
    const { post, likeInProcess } = this.props;
    if (likeInProcess) return;
    if (!post) return;
    if (post.liked) {
      PostsActions.unlike(post.id);
    } else {
      PostsActions.like(post.id);
    }
  };

  componentDidMount() {
    this.initialize();
  }

  render() {
    const { post, toc, activeHeading } = this.props;
    const { onSetToc, onActivateHeading } = this;
    if (!post) return null;

    return (
      <Fragment>
        <PostToc toc={toc} activeHeading={activeHeading} />
        <PostHead
          title={post.title}
          tags={post.tags}
          categories={post.categories}
          user={post.user}
          likes={post.likes}
          liked={post.liked}
          onToggleLike={this.onToggleLike}
        />
        <PostContent
          thumbnail={post.thumbnail}
          body={post.body}
          onSetToc={onSetToc}
          onActivateHeading={onActivateHeading}
        />
        <PostTags tags={post.tags} />
      </Fragment>
    );
  }
}

export default connect(
  ({ posts, pender }: State) => ({
    post: posts.post,
    toc: posts.toc,
    activeHeading: posts.activeHeading,
    likeInProcess: pender.pending['posts/LIKE'] || pender.pending['posts/UNLIKE'],
  }),
  () => ({}),
)(PostViewer);
