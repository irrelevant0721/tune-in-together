# 账户收藏同步与我的房间测试报告

## 自动化验证

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 服务端语法 | `node --check server/index.js server/roomManager.js server/roomStorage.js` | 通过 |
| 服务端测试与代码检查 | `npm test --prefix server` | 通过 |
| 收藏同步单元测试 | `node --test server/favoritesSync.test.js` | 3/3 通过 |
| 账户房间单元测试 | `node --test server/accountRooms.test.js` | 2/2 通过 |
| 账户认证回归测试 | `node --test server/accountAuth.test.js` | 7/7 通过 |
| 客户端类型检查 | `npm run typecheck --prefix client` | 通过 |
| Ant Design 边界检查 | `npm run check:antd-boundary --prefix client` | 通过 |
| 客户端生产构建 | `npm run build:check --prefix client` | 通过 |
| 差异格式检查 | `git diff --check` | 通过（仅换行符提示） |

## 已覆盖的逻辑场景

- 游客收藏按本地缓存保存，登录后保留失败状态并支持自动/手动重试。
- 收藏按 `source:id` 去重，重复同步保持幂等。
- 收藏同步目标只由当前账户会话和服务端身份 Cookie 决定。
- 游客交接凭证为短期 HttpOnly 签名 Cookie，不接受任意 `guestUserId` 作为导入身份。
- 账户房间索引支持幂等添加、删除和脏成员过滤。
- 匿名房间认领要求服务端验证 `creatorId`/设备凭证，冲突时拒绝，重复认领幂等。
- 房主转让会清理原账户房间索引，房间销毁会清理账户索引。
- 老房间缺少 `ownerAccountId` 时仍按原有 `creatorId`/`creatorDeviceId` 工作。

## 发布前手动验收

- 两个浏览器登录同一账户，确认收藏和“我的房间”一致。
- 登录前收藏后断网，恢复网络后确认自动重试；再验证手动重试入口。
- 使用两个账户尝试认领同一匿名房间，确认第二个账户收到冲突拒绝。
- 房主转让和房间销毁后，确认旧账户“我的房间”列表清理。
- Flutter/Android WebView 中确认账户入口、收藏和房间接口不影响原有桥接流程。
