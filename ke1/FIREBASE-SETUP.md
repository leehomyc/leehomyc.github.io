# 科目一云端账号配置

这个页面部署在 `https://hyang.org/ke1/`，登录和刷题进度使用现有 Firebase 项目 `papers-afc96`。

## 必须在 Firebase 控制台确认两项

1. Authentication → Sign-in method → 开启 **Email/Password**。
2. Firestore Rules 保留或加入下面这条规则。它只允许用户读写自己的 `users/{uid}` 文档：

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null
                        && request.auth.uid == userId;
    }
  }
}
```

页面使用邮箱注册和登录。注册后 Firebase 会发送邮箱验证链接；登录框还支持发送密码重置邮件。密码交给 Firebase Authentication 处理，页面和 Firestore 都不保存明文密码。刷题进度保存在对应用户文档的 `ke1Progress` 字段中。

## 2026-09-20 进度保存方式

- 游客先保存到本机 `ke1:v2:guest`，已登录用户使用 `ke1:v2:user:<uid>`，不同账号分开保存。
- `ke1Progress` 保持位于原来的 `users/{uid}` 文档中，不需要增加子集合权限。只有成功从服务器读取进度后才允许写入。读取失败时，本机新作答保留为待同步记录。
- 同步使用 Firestore transaction：读取最新服务端记录、合并本次变更题目，再以 `merge:true` 写入增量。不得提交空 `answers` 对象；不再保存独立的正确率计数，统计由有效答案计算。
- 每个答案包含最近选项、首次选项、首次/最近时间、操作标识。不同题目可以合并；同题并发按时间与操作标识确定最近答案，同时保留最早的首次作答。设备时钟差异仍可能影响同题并发的先后判断。
- `schemaVersion:2` 使用 `currentId` 恢复题号；旧 `index` 通过原始题库顺序迁移。原始 JSON 保留不变，显示时合并两道重复题，并保留所有旧 ID 的映射。
- 登录页默认勾选合并游客进度；只有用户主动登录时导入，不会把游客记录自动导入浏览器恢复的另一个账号。目标账号在本机成功保存后，才移除游客副本。
- 离线或服务器失败时不清空待同步记录；退出不等待网络上传。未上传的账号记录仍保存在该浏览器，重新登录同一账号后继续同步。

正式验收仍需使用可控的已验证账号，检查邮件投递、真实写入、跨设备恢复和跨账号拒绝访问。本仓库的浏览器测试替换 Firebase SDK，不触发真实邮件或写入。

参考：[Firestore 数据写入](https://firebase.google.com/docs/firestore/manage-data/add-data)、[事务](https://firebase.google.com/docs/firestore/manage-data/transactions)、[实时监听](https://firebase.google.com/docs/firestore/query-data/listen)。
