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
