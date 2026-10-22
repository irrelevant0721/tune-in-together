# OpenMusic Mobile

这是一个 Android WebView 容器，不再实现 Flutter 原生房间、Socket.IO 或音频播放逻辑。网页负责业务与媒体播放，Flutter 提供 WebView、Android 通知栏媒体控件和受限 Android 工具调用。

Android 13 及以上首次播放时需要允许通知权限，才能显示通知栏/锁屏媒体控件。

## 本地启动

```powershell
cd mobile
flutter pub get
flutter run --dart-define=OM_FLAVOR=local --dart-define=OM_SERVER_URL=http://10.0.2.2:4000
```

详细的模拟器与真机地址配置见 [LOCAL.md](./LOCAL.md)，桥接事件和原生工具见 [WEB_SHELL.md](./WEB_SHELL.md)。

## 构建

```powershell
node scripts/build-flutter-apk.mjs --release --server-url=https://your-host
```

脚本会在 release 打包前仅递增本机 `.android-version.local`（已被 Git 忽略）中的可见版本号和 Android 构建号，并将 APK 复制到 `../server/downloads/openmusic.apk`。仓库内的 `pubspec.yaml` 始终保持基线 `1.0.0+1`，新拉取项目会从该版本开始。仅临时重打同一版本时可加 `--no-version-bump`。
