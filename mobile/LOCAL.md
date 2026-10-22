# OpenMusic Mobile 本地调试

移动端只负责承载 WebView；房间、登录、播放和 Socket.IO 都由 Web 端处理。

1. 在仓库根目录启动 Web 与服务端：`npm run dev`
2. 启动 Android 模拟器或连接真机。
3. 在 `mobile/` 目录执行：

```powershell
flutter pub get
flutter run --dart-define=OM_FLAVOR=local --dart-define=OM_SERVER_URL=http://10.0.2.2:4000
```

真机需要将地址替换为电脑的局域网 IP，例如 `http://192.168.1.8:4000`。正式服使用 `OM_FLAVOR=prod` 与正式 HTTPS 地址。
