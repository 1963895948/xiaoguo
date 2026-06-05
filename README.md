# 原型生成（发布仓库：xiaoguo）

存放各业务原型（HTML 高保真等）。**一个总仓库 `xiaoguo`，按需求分类，再放具体原型**，统一通过 GitHub Pages 分享到钉钉 PRD。

> 本地这个 `原型生成/` 文件夹 = GitHub 仓库 `xiaoguo` 的内容（1:1 对应）。

## 目录结构

```
原型生成/  (= 仓库 xiaoguo)
├── qinquan-jinshou/      # 分类：侵权禁售
│   └── qinquan-chuli-list/   # 具体原型：删词处理列表
│       └── index.html
├── hegui/               # 分类：合规
├── gongju/              # 分类：工具类
└── _template/           # 原型封面 / 导航页模板，复用用
```

## 分类目录对照（拼音 ↔ 中文）

| 文件夹 | 含义 |
|---|---|
| `qinquan-jinshou` | 侵权禁售 |
| `hegui` | 合规 |
| `gongju` | 工具类 |
| `_template` | 模板（封面/导航页） |

## 命名约定

- **分类、原型文件夹一律用英文/拼音**，避免分享链接出现 `%xx` 中文乱码。
- 每个原型入口文件统一命名为 **`index.html`**。
- 一个原型一个文件夹，改版只覆盖对应 `index.html`，互不影响。

## 分享链接规则（GitHub Pages）

```
https://1963895948.github.io/xiaoguo/<分类>/<原型>/
```

示例（删词处理列表）：

```
https://1963895948.github.io/xiaoguo/qinquan-jinshou/qinquan-chuli-list/
```

把该网址在钉钉文档中 `插入 → 链接` 即可，业务点击直接打开，无需下载。更新原型只需覆盖对应 `index.html` 并推送，链接不变。
