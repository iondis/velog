// @flow
import React, { Component } from 'react';
import { connect } from 'react-redux';
import type { State } from 'store';
import { WriteActions } from 'store/actionCreators';
import WriteHeader from 'components/write/WriteHeader/WriteHeader';
import type { PostData, Category } from 'store/modules/write';
import { withRouter, type ContextRouter } from 'react-router-dom';
import { compose } from 'redux';

type Props = {
  title: string,
  body: string,
  tags: string[],
  categories: ?(Category[]),
  postData: ?PostData,
  writeExtraOpen: boolean,
  thumbnail: ?string,
} & ContextRouter;

class WriteHeaderContainer extends Component<Props> {
  onChangeTitle = (e) => {
    const { value } = e.target;
    WriteActions.editField({
      field: 'title',
      value,
    });
  };

  onOpenSubmitBox = () => {
    WriteActions.openSubmitBox();
  };

  onCloseSubmitBox = () => {
    WriteActions.closeSubmitBox();
  };

  onTempSave = () => {
    const { postData, title, body, tags, categories, thumbnail } = this.props;

    const activeCategories = (() => {
      if (!categories || categories.length === 0) return [];
      return categories.filter(c => c.active).map(c => c.id);
    })();

    if (!postData) {
      WriteActions.writePost({
        title,
        body,
        tags,
        isMarkdown: true,
        isTemp: true,
        thumbnail,
        categories: activeCategories,
      });
      return;
    }
    if (postData.is_temp) {
      WriteActions.updatePost({
        id: postData.id,
        title,
        body,
        tags,
        is_temp: false,
        thumbnail,
        categories: activeCategories,
      });
      return;
    }
    WriteActions.tempSave({ title, body, postId: postData.id });
  };

  onGoBack = () => {
    this.props.history.goBack();
  };

  onShowWriteExtra = () => {
    WriteActions.showWriteExtra();
  };

  onHideWriteExtra = () => {
    WriteActions.hideWriteExtra();
  };

  render() {
    const { onChangeTitle, onOpenSubmitBox, onTempSave, onShowWriteExtra, onHideWriteExtra } = this;
    const { title, postData, writeExtraOpen } = this.props;
    return (
      <WriteHeader
        onOpenSubmitBox={onOpenSubmitBox}
        onChangeTitle={onChangeTitle}
        onTempSave={onTempSave}
        onShowWriteExtra={onShowWriteExtra}
        onHideWriteExtra={onHideWriteExtra}
        title={title}
        isEdit={!!postData && !postData.is_temp}
        writeExtraOpen={writeExtraOpen}
        onGoBack={this.onGoBack}
      />
    );
  }
}

export default compose(
  withRouter,
  connect(
    ({ write }: State) => ({
      title: write.title,
      body: write.body,
      postData: write.postData,
      categories: write.submitBox.categories,
      tags: write.submitBox.tags,
      writeExtraOpen: write.writeExtra.visible,
      thumbnail: write.thumbnail,
    }),
    () => ({}),
  ),
)(WriteHeaderContainer);
