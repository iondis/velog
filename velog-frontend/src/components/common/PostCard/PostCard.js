// @flow
import React from 'react';
import ImageIcon from 'react-icons/lib/io/image';
import moment from 'moment';
import { Link } from 'react-router-dom';
import cx from 'classnames';
import defaultThumbnail from 'static/images/default_thumbnail.png';
import { shouldUpdate } from 'recompose';

import 'moment/locale/ko';
import './PostCard.scss';

type Props = {
  id: string,
  thumbnail: ?string,
  username: string,
  title: string,
  body: string,
  date: string,
  urlSlug: string,
  userThumbnail: ?string,
  oneColumn?: boolean,
};

moment.locale('ko');

const PostCard = ({
  thumbnail,
  username,
  title,
  body,
  date,
  urlSlug,
  userThumbnail,
  oneColumn,
}: Props) => {
  const now = new Date();
  const d = new Date(date);
  const m = moment(date);
  const diff = now - d;
  const formattedDate = (() => {
    if (diff < 1000 * 60) return '방금 전';
    if (diff > 1000 * 60 * 60 * 24) {
      return m.format('MMM Do');
    }
    return m.fromNow();
  })();

  const link = `/@${username}/${urlSlug}`;
  return (
    <div className={cx('PostCard', { 'one-column': oneColumn })}>
      {(!oneColumn || thumbnail) && (
        <Link to={link} className="thumbnail-wrapper">
          {thumbnail ? (
            <img src={thumbnail} alt={title} />
          ) : (
            <div className="image-placeholder">
              <ImageIcon />
            </div>
          )}
          <div className="white-mask" />
        </Link>
      )}
      <div className="card-content">
        {!oneColumn && (
          <div className="user-thumbnail-wrapper">
            <img src={userThumbnail || defaultThumbnail} alt={username} />
          </div>
        )}
        <div className="content-head">
          <Link to={`/@${username}`} className="username">
            {username}
          </Link>
          <h3>
            <Link to={`/@${username}/${urlSlug}`}>{title}</Link>
          </h3>
          <div className="subinfo">
            <span>{formattedDate}</span>
            <span>8개의 댓글</span>
          </div>
        </div>
        <div className="description">{body}</div>
      </div>
    </div>
  );
};

PostCard.defaultProps = {
  oneColumn: false,
};

export default shouldUpdate((props: Props, nextProps: Props) => {
  return props.id !== nextProps.id;
})(PostCard);
