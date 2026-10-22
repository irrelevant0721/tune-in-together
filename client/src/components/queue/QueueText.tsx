import { createElement, memo, type ElementType } from 'react';

interface Props {
  text: string;
  className?: string;
  as?: ElementType;
}

function QueueText({ text, className, as: Tag = 'span' }: Props) {
  return createElement(Tag, { className, title: text }, text);
}

export default memo(QueueText);
