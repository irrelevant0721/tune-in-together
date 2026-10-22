# 第三方来源与发布核对

本工作副本基于 [OpenMusic](https://github.com/qq01-hub/openmusic)，本地基线提交为 `6c98d0a`，包含 Friends 页面、歌词与陪听等后续修改。原项目版权及许可保留于根目录 `LICENSE`。该许可证不替代第三方代码各自的许可。

## 已识别来源

| 来源 | 涉及文件或用途 | 证据与待办 |
| --- | --- | --- |
| [Mineradio](https://github.com/XxHuberrr/Mineradio-paused) | `client/src/components/galaxy/`、沉浸界面样式等 | README 致谢，多个文件直接注明来源。核对当时引用提交及其许可；当前上游 LICENSE 为 GPL v3，不能据此推定引用时版本或已有额外授权。 |
| [sonic-topography](https://github.com/yin-yizhen/sonic-topography) | `client/src/components/topography/lib/topographyMapShader.ts`、`topographyThemes.ts` | 文件注明改编；着色器与当前上游存在大量一致代码。当前上游为 Non-Commercial Learning License，不能视为通常的宽松开源许可；公开再分发范围及额外授权待确认。 |
| [React Bits](https://github.com/DavidHDev/react-bits) | `client/src/components/react-bits/` | 文件注释、目录及调用明确关联；各组件是否复制或重写、对应版本待逐项确认。当前上游为 MIT + Commons Clause。 |
| [music-tempo](https://github.com/killercrush/music-tempo) | `client/public/vendor/music-tempo.min.js` | 文件名及节拍分析实现为来源线索；尚未验证文件哈希或版本。需核对上游及 MIT 版权声明。 |
| Sonic Workshop 构建文件 | `client/public/vendor/sonic-workshop/` | 含压缩 JS/CSS 和 Mineradio 桥接文件；需追溯原始源码、构建过程及完整第三方声明，不能只凭压缩包中的 React 许可判断整个文件许可。 |
| [Meting-API](https://github.com/qq01-hub/Meting-API) | 音源接口及 Docker 外部服务 | 接口依赖；如发布镜像或打包其代码，应另外核对其来源和许可。 |

## 许可核对材料

`licenses/upstream/` 保存核对时从上游固定提交获取的许可证，获取日期、提交及 SHA-256 见 `licenses/upstream/SOURCES.json`。它们仅是核对材料，不证明本项目实际引用了这些提交，也不构成新增授权。

依赖由根目录、client、server 的 package/lock 文件及 mobile 的 pubspec 文件记录。上表不是完整的软件物料清单。首页角色图、图标、字体、截图及远程媒体也需要确认来源和再分发权限。

公开发布前，应补齐实际引用版本、适用许可、必要版权文本和额外授权，解决许可覆盖问题。新增本文和许可证副本不等于完成授权审查，不修改原始作者声明，不将未知来源代码重新标为 MIT。
