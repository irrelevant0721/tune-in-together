enum WebNavigationDecision {
  allowTrusted,
  allowOauth,
  openExternal,
  block,
}

int _effectivePort(Uri uri) {
  if (uri.hasPort) return uri.port;
  if (uri.scheme.toLowerCase() == 'https') return 443;
  if (uri.scheme.toLowerCase() == 'http') return 80;
  return 0;
}

bool isHttpUri(Uri? uri) {
  if (uri == null || !uri.hasAuthority || uri.host.isEmpty) return false;
  final scheme = uri.scheme.toLowerCase();
  return scheme == 'http' || scheme == 'https';
}

bool isTrustedWebOrigin(Uri? candidate, Uri trustedOrigin) {
  if (!isHttpUri(candidate)) return false;
  return candidate!.scheme.toLowerCase() ==
          trustedOrigin.scheme.toLowerCase() &&
      candidate.host.toLowerCase() == trustedOrigin.host.toLowerCase() &&
      _effectivePort(candidate) == _effectivePort(trustedOrigin);
}

bool hasTrustedBridgeToken({
  required Object? payload,
  required String expectedToken,
}) {
  if (expectedToken.isEmpty || payload is! Map) return false;
  return payload['bridgeToken'] == expectedToken;
}

bool isOauthStartUrl(Uri? candidate, Uri trustedOrigin) {
  if (!isTrustedWebOrigin(candidate, trustedOrigin)) return false;
  final path = candidate!.path;
  return RegExp(r'^/api/auth/(?:linuxdo|github)/start$').hasMatch(path) ||
      RegExp(r'^/api/admin/(?:linuxdo|github)/(?:login|bind)/start$')
          .hasMatch(path);
}

WebNavigationDecision decideWebNavigation({
  required Uri? candidate,
  required Uri trustedOrigin,
  required bool oauthActive,
  required bool hasUserGesture,
}) {
  if (isTrustedWebOrigin(candidate, trustedOrigin)) {
    return WebNavigationDecision.allowTrusted;
  }
  if (isHttpUri(candidate) && oauthActive && candidate!.scheme == 'https') {
    return WebNavigationDecision.allowOauth;
  }
  if (isHttpUri(candidate) && hasUserGesture) {
    return WebNavigationDecision.openExternal;
  }
  return WebNavigationDecision.block;
}
