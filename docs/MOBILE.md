# OpenMusic 移动端（Flutter WebView）

## 架构与边界

移动端以 WebView 加载 OpenMusic 网页。房间、登录、Socket.IO、搜索、队列和网页音频仍由 Web 与服务端统一实现；Flutter 只提供应用壳、Android 通知栏媒体控件和受限的原生能力调用。

| 范围 | 责任 |
|---|---|
| `mobile/lib/features/web/` | WebView 启动、网页与原生桥接、通知栏状态同步 |
| `mobile/android/` | 通知栏、锁屏媒体会话、悬浮歌词权限与 Android 工具调用 |
| `client/src/components/NativeWebViewBridge.tsx` | 网页播放器状态上报，以及原生命令回传处理 |
| `mobile/WEB_SHELL.md` | 跨 Web、Flutter、Android 的桥接字段和命令契约 |

原生端只能请求操作，不能绕过网页或服务端权限。播放、下一首、拖进度和切换模式仍由网页与服务端最终裁决。

## Android 媒体能力

- Android 13+ 首次播放时需要授予通知权限，才能显示通知栏和锁屏控件。
- 通知栏支持播放 / 暂停、下一首、进度拖动、实时歌词和收藏；拥有房间控播权限时可切换播放模式（含收藏随机）。
- 点通知栏的「词」会申请悬浮窗权限。获准后显示可拖动的歌词浮窗，轻点浮窗关闭。
- 原生桥接或权限请求失败不应影响网页中的基础房间与播放功能。

## 本地运行

1. 安装 [Flutter](https://docs.flutter.dev/get-started/install) stable。
2. 执行 `cd mobile`、`flutter pub get`。
3. 模拟器运行：`flutter run --dart-define=OM_FLAVOR=local --dart-define=OM_SERVER_URL=http://10.0.2.2:4000`。
4. 真机或生产地址见 [`mobile/LOCAL.md`](../mobile/LOCAL.md)。

## 构建

```powershell
cd mobile
node scripts/build-flutter-apk.mjs --release --server-url=https://your-host
```

该脚本会在 release 打包前仅递增本机 `mobile/.android-version.local`（已被 Git 忽略）中的可见版本号和 Android 构建号。仓库内的 `mobile/pubspec.yaml` 始终保持基线 `1.0.0+1`，新拉取项目会从该版本开始；仅临时重打同一版本时可追加 `--no-version-bump`。

桥接字段或命令变更时，必须同时核对 Web、Flutter 与 Android 三端，并更新 [`mobile/WEB_SHELL.md`](../mobile/WEB_SHELL.md)。
