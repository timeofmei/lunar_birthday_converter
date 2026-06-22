# 农历生日 → 日历提醒

将农历生日转换为公历日期，生成 `.ics` 日历文件或 `.txt` 文本清单，方便导入手机日历设置每年提醒。

在线使用：[birthday.timeofmei.com](https://birthday.timeofmei.com)

## 功能

- 支持**农历**和**公历**两种生日录入方式
- 农历模式支持**闰月**生日，可配置无闰月年份的降级策略
- 支持**三十日**生日的降级策略（部分年份农历月份只有 29 天）
- 公历模式自动换算对应农历，显示干支年名
- 最多同时管理 **8 人**，数据仅保存在本地浏览器
- 导出 `.ics` 文件可导入 Google Calendar、Apple 日历等
- 导出 `.txt` 文本可查看逐年日期清单
- 兼容微信内置浏览器（复制文本方式）

## 本地开发

```bash
npm install
npm run dev
```

## 技术栈

- React + TypeScript + Vite
- [animal-island-ui](https://github.com/guokaigdg/animal-island-ui) 组件库（动物森友会风格）+ Tailwind CSS（布局）
- [tyme4ts](https://github.com/6tail/tyme4ts) 农历转换库
