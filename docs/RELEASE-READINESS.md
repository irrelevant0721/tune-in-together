# Tune In Together 发布准备记录

日期：2026-10-22（北京时间）。用户选择公开；已在账号 `irrelevant0721` 下创建 [tune-in-together](https://github.com/irrelevant0721/tune-in-together)。上传使用经过筛选及域名替换的独立源码快照；原工作区的 origin、暂存区和提交历史未变更。

## 本次准备

- 增加源码审阅打包命令，覆盖未提交的新功能，排除运行数据、密钥文件、备份、本机脚本、联调记录及构建产物。
- 导出副本的部署域名和隧道 ID 使用示例值；本机配置保持原样。每个文件记录源文件与导出文件 SHA-256。
- 保留 OpenMusic 来源与版权；新增第三方来源清单，获取固定上游提交的许可核对副本。
- ZIP 部署包和 Docker 镜像附带许可材料；部署包补充服务端 scripts 子目录，前端构建经过类型和依赖边界检查。
- Docker 发布工作流使用仓库变量 `DOCKER_IMAGE_NAME` 指定自己的镜像，未配置时停止，避免推送到写死的上游目标。

## 已执行验证

| 检查 | 结果 |
| --- | --- |
| 工作区 `npm test --prefix client` | 13 项测试通过，歌词检查、视觉检查和类型检查通过 |
| 工作区 `npm run build:check` | 类型、Ant Design 边界、Vite 生产构建通过；存在 two empty vendor chunks 的构建提示 |
| 工作区 `npm test --prefix server` | ESLint 通过，45 项测试通过、2 项跳过（部署脚本测试） |
| 独立源码快照 client/server 各执行 `npm ci --no-audit --no-fund` | 按锁文件成功安装，不使用工作区 node_modules |
| 独立快照 `npm run build:check` | 通过，验证源码打包未遗漏构建入口或共享源码 |
| 三个 Compose 配置 | 使用示例环境变量执行 `config --quiet` 通过：默认、full、friends |
| GitHub Actions YAML | Python yaml.safe_load 语法解析通过；未实际执行云端工作流 |
| 首轮源码包清单核验 | 909 个文件，ZIP 内容、快照、SHA-256 清单一致，禁止路径不存在；后续导出包含本记录及域名替换，需以随包清单为准 |
| 已扫描源码密钥模式 | 私钥头、GitHub/API/cloud access key 模式未命中；配置示例的非占位凭据赋值检查未命中 |
| `git diff --check` / Node 脚本语法检查 | 通过 |

## 尚未验证或尚未解决

- Mineradio、sonic-topography、React Bits、Sonic Workshop 等实际引用版本和额外授权未确认。`THIRD_PARTY_NOTICES.md` 不是发布授权证明；用户选择公开不替代第三方许可。
- 静态扫描不是完整的密钥审计。浅克隆无法证明完整历史安全；图片、字体、角色图及远程媒体授权未确认。
- 自动审批拒绝了创建并清理模拟密钥测试文件的验证命令，返回 `blocked by policy`，未提供更具体原因；此动态阻断场景没有执行。
- 未执行 Docker 镜像构建、全新生产部署、真实 Redis/音源端到端场景和浏览器完整交互回归。Flutter CLI 未检测到，未进行移动端验证。
- 现有 release-notes.json 仍保留此前更新说明及强制更新设置；正式安装包发版前应按实际版本整理。本次未运行会写入更新说明的 `package:build`。
- 目前准备的是源码审阅包，没有签名 EXE/APK 或正式部署发行包。

## 影响与回退

仅发布工具、文档、忽略规则和镜像内许可文件变化；应用界面和协议没有因本次发布准备而改变，无需更新用户操作指引。未重启服务、未迁移或修改持久化数据。新增规则和脚本按文件撤回即可；不要还原工作区原有功能修改。
