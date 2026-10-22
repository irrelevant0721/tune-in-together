/// App runtime configuration.
///
/// Server URL is fixed at build time via `--dart-define=OM_SERVER_URL=...`
/// or inferred from `OM_FLAVOR` for local development.
library;

import 'package:flutter/foundation.dart';

String normalizeServerOrigin(
  String raw, {
  required bool requireHttps,
  bool normalizeWebLoopback = false,
}) {
  var value = raw.trim();
  if (normalizeWebLoopback) {
    value = value
        .replaceFirst('http://127.0.0.1:', 'http://localhost:')
        .replaceFirst('https://127.0.0.1:', 'https://localhost:');
  }

  final uri = Uri.tryParse(value);
  final scheme = uri?.scheme.toLowerCase();
  final validScheme = scheme == 'http' || scheme == 'https';
  final hasOnlyOriginPath = uri != null && (uri.path.isEmpty || uri.path == '/');
  if (uri == null ||
      !validScheme ||
      !uri.hasAuthority ||
      uri.host.isEmpty ||
      uri.userInfo.isNotEmpty ||
      !hasOnlyOriginPath ||
      uri.hasQuery ||
      uri.hasFragment) {
    throw StateError('OM_SERVER_URL 必须是有效的 http/https 站点 Origin');
  }
  if (requireHttps && scheme != 'https') {
    throw StateError('Release/prod builds require an HTTPS OM_SERVER_URL');
  }
  return uri.origin;
}

class AppConfig {
  AppConfig._();

  /// Local `npm run dev` — Web must use localhost for cookies.
  static const localDesktopDefault = 'http://localhost:4000';

  /// Android emulator loopback to host machine.
  static const localAndroidEmulatorDefault = 'http://10.0.2.2:4000';

  static late String serverUrl;

  static const _fromDefine = String.fromEnvironment(
    'OM_SERVER_URL',
    defaultValue: '',
  );

  /// `--dart-define=OM_FLAVOR=local|prod`
  static const flavor = String.fromEnvironment(
    'OM_FLAVOR',
    defaultValue: '',
  );

  static Future<void> init() async {
    var url = _fromDefine.trim();
    if (url.isEmpty) {
      url = _defaultForRuntime();
    }
    if (url.isEmpty) {
      throw StateError('Release/prod builds require --dart-define=OM_SERVER_URL=https://your-host');
    }
    serverUrl = normalizeServerOrigin(
      url,
      requireHttps: flavor == 'prod' || kReleaseMode,
      normalizeWebLoopback: kIsWeb,
    );
  }

  static String _defaultForRuntime() {
    if (flavor == 'local') return _localDefaultForPlatform();

    // Production builds must receive their deployment URL during packaging.
    if (flavor == 'prod' || kReleaseMode) return '';

    // Debug/profile without flavor → local dev server.
    return _localDefaultForPlatform();
  }

  static String _localDefaultForPlatform() {
    if (kIsWeb) return localDesktopDefault;
    if (defaultTargetPlatform == TargetPlatform.android) {
      return localAndroidEmulatorDefault;
    }
    return localDesktopDefault;
  }

  static Uri api(String path, [Map<String, String>? query]) {
    final normalized = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$serverUrl$normalized').replace(queryParameters: query);
  }
}
