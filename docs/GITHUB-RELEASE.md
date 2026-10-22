# GitHub 发布准备

## 源码审阅包

在仓库根目录运行 `npm run release:source`。脚本将 Git 已跟踪文件与未被忽略的新文件按工作区现状复制到全新的 `release/source-review-<时间>/openmusic/`，生成 SHA-256 文件清单、扫描结果和 ZIP。无需提前提交；不会包含 `.git`，因此 ZIP 本身不保留提交历史。以 Git 方式发布时仍应保留上游来源，审查待推送的完整历史。

这是一份待审阅的源码快照，不是授权已确认或测试已通过的正式发行版。它保留未提交代码；应先查看 `git diff` 和清单确认范围。脚本排除运行数据、凭据文件、备份、构建缓存、本机隧道脚本、临时预览及本机实际联调记录。它不替代人工检查，也不会删除源文件。

导出时只在 `FRIENDS-DEPLOYMENT.md`、`docker-compose.friends.yml`、`start-music.ps1` 的公开副本中，将原部署域名和隧道 ID 替换为示例值；原目录里的真实部署配置不变。清单的 `sourceSha256` 是本地原文件哈希，`sha256` 是导出文件哈希，`sanitized` 表示是否发生此替换。Git 上传应使用审阅后的导出源码目录，不能把原目录重新整体加入。

扫描只输出文件、行号和规则名，不输出匹配值。高可信密钥模式或大于 100 MiB 的文件会阻止生成压缩包。包含个人部署域名、本机路径、外部媒体或未知来源资源的文件仍需人工复核；不要将真实凭据填进 `.env.example`。不要用资源管理器直接压缩工作目录代替上述过程。

## 验证

推荐从审阅包解压到新的目录后，使用 Node.js 22 安装依赖：根目录、`client`、`server` 各运行 `npm ci`。然后执行：

```sh
npm test --prefix client
npm run build:check
npm test --prefix server
```

服务端 Redis 场景需要独立测试 Redis，按测试要求设置 `TEST_REDIS_URL`，不可使用生产数据。移动端执行 `flutter pub get`、`flutter analyze`、`flutter test`；部署配置使用 `docker compose ... config --quiet` 检查，并实际验证启动、进房、点歌和歌词。未运行或失败的验证必须记录。

Friends 导出配置使用示例域名，仍有固定镜像版本及本机运维说明。部署者应根据 `FRIENDS-DEPLOYMENT.md` 核对域名、音源、数据挂载及持久化配置；不能直接用示例域名部署。本机 `connect-domain.ps1` 不随审阅包分发。

## 发布前尚需完成

1. 按 `THIRD_PARTY_NOTICES.md` 核对引用版本及授权，特别是地形、Mineradio 和 Sonic Workshop；确认角色图等资源的权利。
2. 检查源码扫描报告、配置示例、截图及文档，不把测试样例误当生产密码。需要时使用专门的密钥扫描器审查完整历史。本地浅克隆不代表完整历史已检查。
3. 确认仓库归属、名称、公开或私有，以及将要提交的文件。当前 origin 是上游仓库，不能直接向它推送我们的版本。
4. 在干净环境完成上述验证，填写版本及更新说明。Docker 发布需设置仓库变量 `DOCKER_IMAGE_NAME`（自己的 Docker Hub 命名空间/镜像名）以及 `DOCKERHUB_USERNAME`、`DOCKERHUB_TOKEN` Secrets；未配置目标时工作流会停止。`v*` 标签及手动调用会触发此工作流。
5. 源码放仓库；部署 ZIP、EXE、APK 放 Releases。部署包与源码发布使用同一提交并附带许可材料，记录校验和。

## 上线与回滚

本文和打包准备不修改生产配置或数据，不要求重启。首次上线前备份持久化配置和 Redis，记录上一个可用镜像及版本；回退应用时保留数据卷，禁止通过删除卷恢复。具体部署仍按项目已有文档执行。
