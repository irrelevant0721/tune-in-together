import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  onError?: () => void;
}

interface State {
  hasError: boolean;
}

/**
 * 顶层错误边界：没有它的话，任何一个没处理好的渲染异常都会让整个页面直接空白，
 * 用户只能自己想到硬刷新才能恢复——今天排查过好几次这种"黑屏"就是因为异常
 * 一路抛到 React 顶层没人接住。这里接住之后给一个明确的"出错了，刷新重试"提示。
 */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('渲染异常，已被顶层错误边界拦截：', error, info.componentStack);
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 bg-netease-dark px-6 text-center text-netease-muted">
          <p className="text-sm text-white">页面出了点问题</p>
          <p className="max-w-sm text-xs">刷新一下通常就能恢复；如果反复出现，麻烦告诉我们具体是在做什么操作时发生的。</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 rounded-full bg-netease-red px-4 py-2 text-sm text-white transition-colors hover:bg-netease-red/85"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            刷新页面
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
